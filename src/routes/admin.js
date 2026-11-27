/**
 * Panel del administrador (RF-1, RF-2):
 * CRUD de alumnos, grupos, materias, docentes y asignaciones docente-materia.
 * Todas las rutas requieren rol "admin".
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const ah = require('../utils/async');
const { texto, idValido, revisar } = require('../utils/validar');
const { mensajeErrorBD } = require('../utils/errores-bd');
const { requiereRol } = require('../middlewares/auth');
const { flash } = require('../middlewares/locals');

const router = express.Router();
router.use(requiereRol('admin'));

/**
 * Si el error es "conocido" (duplicado, llave foránea) muestra el mensaje
 * y regresa a la página indicada; si no, lo pasa al manejador general.
 */
function manejarErrorBD(err, req, res, next, volverA) {
  const mensaje = mensajeErrorBD(err);
  if (!mensaje) return next(err);
  flash(req, 'error', mensaje);
  res.redirect(volverA);
}

/** Convierte el valor de checkboxes (string o arreglo) a arreglo de ids válidos. */
function listaIds(valor) {
  const arr = Array.isArray(valor) ? valor : valor ? [valor] : [];
  return arr.map(idValido).filter(Boolean);
}

// =====================================================================
//  INICIO DEL PANEL
// =====================================================================
router.get('/', ah(async (req, res) => {
  const [[conteos]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM alumnos WHERE activo = 1)              AS alumnos,
      (SELECT COUNT(*) FROM grupos)                                AS grupos,
      (SELECT COUNT(*) FROM materias)                              AS materias,
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'docente' AND activo = 1) AS docentes,
      (SELECT COUNT(*) FROM sesiones WHERE estado = 'abierta')     AS abiertas,
      (SELECT COUNT(*) FROM asistencias WHERE DATE(fecha_hora) = CURDATE()) AS hoy
  `);
  res.render('admin/index', { titulo: 'Panel del administrador', conteos });
}));

// =====================================================================
//  ALUMNOS (RF-1)
// =====================================================================
router.get('/alumnos', ah(async (req, res) => {
  const q = texto(req.query.q);
  const grupoId = idValido(req.query.grupo);

  let sql = `
    SELECT a.id, a.matricula, a.nombre, a.id_tarjeta, a.activo,
           GROUP_CONCAT(g.nombre ORDER BY g.nombre SEPARATOR ', ') AS grupos
    FROM alumnos a
    LEFT JOIN alumno_grupo ag ON ag.alumno_id = a.id
    LEFT JOIN grupos g ON g.id = ag.grupo_id
    WHERE 1 = 1`;
  const params = [];
  if (q) {
    sql += ' AND (a.matricula LIKE ? OR a.nombre LIKE ? OR a.id_tarjeta LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (grupoId) {
    sql += ' AND a.id IN (SELECT alumno_id FROM alumno_grupo WHERE grupo_id = ?)';
    params.push(grupoId);
  }
  sql += ' GROUP BY a.id ORDER BY a.nombre LIMIT 500';

  const [alumnos] = await pool.query(sql, params);
  const [grupos] = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
  res.render('admin/alumnos', { titulo: 'Alumnos', alumnos, grupos, q, grupoId });
}));

router.get('/alumnos/nuevo', ah(async (req, res) => {
  const [grupos] = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
  res.render('admin/alumno-form', {
    titulo: 'Nuevo alumno',
    alumno: { matricula: '', nombre: '', id_tarjeta: '', activo: 1 },
    grupos,
    gruposAlumno: []
  });
}));

router.get('/alumnos/:id/editar', ah(async (req, res) => {
  const id = idValido(req.params.id);
  const [[alumno]] = await pool.query('SELECT * FROM alumnos WHERE id = ?', [id]);
  if (!alumno) {
    flash(req, 'error', 'El alumno no existe.');
    return res.redirect('/admin/alumnos');
  }
  const [grupos] = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
  const [ag] = await pool.query('SELECT grupo_id FROM alumno_grupo WHERE alumno_id = ?', [id]);
  res.render('admin/alumno-form', {
    titulo: 'Editar alumno',
    alumno,
    grupos,
    gruposAlumno: ag.map((r) => r.grupo_id)
  });
}));

/** Crea (sin id) o actualiza (con id) un alumno y sus grupos, en una transacción. */
async function guardarAlumno(req, res, next, id) {
  const datos = {
    matricula: texto(req.body.matricula).toUpperCase(),
    nombre: texto(req.body.nombre),
    id_tarjeta: texto(req.body.id_tarjeta).toUpperCase() || null
  };
  const grupos = listaIds(req.body.grupos);
  const volverA = id ? `/admin/alumnos/${id}/editar` : '/admin/alumnos/nuevo';

  const errores = revisar([
    { nombre: 'Matrícula', valor: datos.matricula, requerido: true, regla: 'matricula' },
    { nombre: 'Nombre', valor: datos.nombre, requerido: true, min: 3, max: 120 },
    { nombre: 'ID de tarjeta', valor: datos.id_tarjeta, regla: 'tarjeta' }
  ]);
  if (errores.length) {
    flash(req, 'error', errores.join(' '));
    return res.redirect(volverA);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let alumnoId = id;
    if (id) {
      await conn.query(
        'UPDATE alumnos SET matricula = ?, nombre = ?, id_tarjeta = ? WHERE id = ?',
        [datos.matricula, datos.nombre, datos.id_tarjeta, id]
      );
    } else {
      const [r] = await conn.query(
        'INSERT INTO alumnos (matricula, nombre, id_tarjeta) VALUES (?, ?, ?)',
        [datos.matricula, datos.nombre, datos.id_tarjeta]
      );
      alumnoId = r.insertId;
    }
    // Reemplazar grupos del alumno
    await conn.query('DELETE FROM alumno_grupo WHERE alumno_id = ?', [alumnoId]);
    for (const g of grupos) {
      await conn.query('INSERT INTO alumno_grupo (alumno_id, grupo_id) VALUES (?, ?)', [alumnoId, g]);
    }
    await conn.commit();
    flash(req, 'exito', id ? 'Alumno actualizado.' : 'Alumno registrado.');
    res.redirect('/admin/alumnos');
  } catch (err) {
    await conn.rollback();
    manejarErrorBD(err, req, res, next, volverA);
  } finally {
    conn.release();
  }
}

router.post('/alumnos', ah((req, res, next) => guardarAlumno(req, res, next, null)));

router.post('/alumnos/:id', ah((req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.redirect('/admin/alumnos');
  return guardarAlumno(req, res, next, id);
}));

// Activar / desactivar (no se borra para conservar el historial de asistencias)
router.post('/alumnos/:id/estado', ah(async (req, res) => {
  const id = idValido(req.params.id);
  await pool.query('UPDATE alumnos SET activo = 1 - activo WHERE id = ?', [id]);
  flash(req, 'exito', 'Estado del alumno actualizado.');
  res.redirect('/admin/alumnos');
}));

// =====================================================================
//  GRUPOS (RF-2)
// =====================================================================
router.get('/grupos', ah(async (req, res) => {
  const [grupos] = await pool.query(`
    SELECT g.*, COUNT(ag.alumno_id) AS total_alumnos
    FROM grupos g
    LEFT JOIN alumno_grupo ag ON ag.grupo_id = g.id
    GROUP BY g.id
    ORDER BY g.nombre`);
  res.render('admin/grupos', { titulo: 'Grupos', grupos });
}));

router.get('/grupos/nuevo', (req, res) => {
  res.render('admin/grupo-form', { titulo: 'Nuevo grupo', grupo: { nombre: '', carrera: '', cuatrimestre: 1 } });
});

router.get('/grupos/:id/editar', ah(async (req, res) => {
  const [[grupo]] = await pool.query('SELECT * FROM grupos WHERE id = ?', [idValido(req.params.id)]);
  if (!grupo) return res.redirect('/admin/grupos');
  res.render('admin/grupo-form', { titulo: 'Editar grupo', grupo });
}));

async function guardarGrupo(req, res, next, id) {
  const nombre = texto(req.body.nombre).toUpperCase();
  const carrera = texto(req.body.carrera);
  const cuatrimestre = idValido(req.body.cuatrimestre);
  const volverA = id ? `/admin/grupos/${id}/editar` : '/admin/grupos/nuevo';

  const errores = revisar([
    { nombre: 'Nombre del grupo', valor: nombre, requerido: true, regla: 'grupo' },
    { nombre: 'Carrera', valor: carrera, requerido: true, min: 3, max: 100 }
  ]);
  if (!cuatrimestre || cuatrimestre > 11) errores.push('El cuatrimestre debe ser un número del 1 al 11.');
  if (errores.length) {
    flash(req, 'error', errores.join(' '));
    return res.redirect(volverA);
  }

  try {
    if (id) {
      await pool.query('UPDATE grupos SET nombre = ?, carrera = ?, cuatrimestre = ? WHERE id = ?',
        [nombre, carrera, cuatrimestre, id]);
    } else {
      await pool.query('INSERT INTO grupos (nombre, carrera, cuatrimestre) VALUES (?, ?, ?)',
        [nombre, carrera, cuatrimestre]);
    }
    flash(req, 'exito', id ? 'Grupo actualizado.' : 'Grupo creado.');
    res.redirect('/admin/grupos');
  } catch (err) {
    manejarErrorBD(err, req, res, next, volverA);
  }
}

router.post('/grupos', ah((req, res, next) => guardarGrupo(req, res, next, null)));
router.post('/grupos/:id', ah((req, res, next) => guardarGrupo(req, res, next, idValido(req.params.id))));

router.post('/grupos/:id/eliminar', ah(async (req, res, next) => {
  try {
    await pool.query('DELETE FROM grupos WHERE id = ?', [idValido(req.params.id)]);
    flash(req, 'exito', 'Grupo eliminado.');
    res.redirect('/admin/grupos');
  } catch (err) {
    manejarErrorBD(err, req, res, next, '/admin/grupos');
  }
}));

// Detalle del grupo: lista de alumnos, agregar por matrícula y quitar
router.get('/grupos/:id', ah(async (req, res) => {
  const id = idValido(req.params.id);
  const [[grupo]] = await pool.query('SELECT * FROM grupos WHERE id = ?', [id]);
  if (!grupo) return res.redirect('/admin/grupos');
  const [alumnos] = await pool.query(`
    SELECT a.id, a.matricula, a.nombre, a.id_tarjeta, a.activo
    FROM alumno_grupo ag JOIN alumnos a ON a.id = ag.alumno_id
    WHERE ag.grupo_id = ? ORDER BY a.nombre`, [id]);
  res.render('admin/grupo-detalle', { titulo: `Grupo ${grupo.nombre}`, grupo, alumnos });
}));

router.post('/grupos/:id/alumnos', ah(async (req, res) => {
  const id = idValido(req.params.id);
  const matricula = texto(req.body.matricula).toUpperCase();
  const [[alumno]] = await pool.query('SELECT id, nombre FROM alumnos WHERE matricula = ?', [matricula]);
  if (!alumno) {
    flash(req, 'error', `No existe un alumno con la matrícula "${matricula}".`);
  } else {
    await pool.query('INSERT IGNORE INTO alumno_grupo (alumno_id, grupo_id) VALUES (?, ?)', [alumno.id, id]);
    flash(req, 'exito', `${alumno.nombre} agregado(a) al grupo.`);
  }
  res.redirect(`/admin/grupos/${id}`);
}));

router.post('/grupos/:id/alumnos/:alumnoId/quitar', ah(async (req, res) => {
  const id = idValido(req.params.id);
  await pool.query('DELETE FROM alumno_grupo WHERE grupo_id = ? AND alumno_id = ?',
    [id, idValido(req.params.alumnoId)]);
  flash(req, 'exito', 'Alumno quitado del grupo.');
  res.redirect(`/admin/grupos/${id}`);
}));

// =====================================================================
//  MATERIAS (RF-2)
// =====================================================================
router.get('/materias', ah(async (req, res) => {
  const [materias] = await pool.query('SELECT * FROM materias ORDER BY nombre');
  res.render('admin/materias', { titulo: 'Materias', materias });
}));

router.get('/materias/nuevo', (req, res) => {
  res.render('admin/materia-form', { titulo: 'Nueva materia', materia: { clave: '', nombre: '' } });
});

router.get('/materias/:id/editar', ah(async (req, res) => {
  const [[materia]] = await pool.query('SELECT * FROM materias WHERE id = ?', [idValido(req.params.id)]);
  if (!materia) return res.redirect('/admin/materias');
  res.render('admin/materia-form', { titulo: 'Editar materia', materia });
}));

async function guardarMateria(req, res, next, id) {
  const clave = texto(req.body.clave).toUpperCase();
  const nombre = texto(req.body.nombre);
  const volverA = id ? `/admin/materias/${id}/editar` : '/admin/materias/nuevo';

  const errores = revisar([
    { nombre: 'Clave', valor: clave, requerido: true, regla: 'clave' },
    { nombre: 'Nombre', valor: nombre, requerido: true, min: 3, max: 100 }
  ]);
  if (errores.length) {
    flash(req, 'error', errores.join(' '));
    return res.redirect(volverA);
  }
  try {
    if (id) {
      await pool.query('UPDATE materias SET clave = ?, nombre = ? WHERE id = ?', [clave, nombre, id]);
    } else {
      await pool.query('INSERT INTO materias (clave, nombre) VALUES (?, ?)', [clave, nombre]);
    }
    flash(req, 'exito', id ? 'Materia actualizada.' : 'Materia creada.');
    res.redirect('/admin/materias');
  } catch (err) {
    manejarErrorBD(err, req, res, next, volverA);
  }
}

router.post('/materias', ah((req, res, next) => guardarMateria(req, res, next, null)));
router.post('/materias/:id', ah((req, res, next) => guardarMateria(req, res, next, idValido(req.params.id))));

router.post('/materias/:id/eliminar', ah(async (req, res, next) => {
  try {
    await pool.query('DELETE FROM materias WHERE id = ?', [idValido(req.params.id)]);
    flash(req, 'exito', 'Materia eliminada.');
    res.redirect('/admin/materias');
  } catch (err) {
    manejarErrorBD(err, req, res, next, '/admin/materias');
  }
}));

// =====================================================================
//  DOCENTES / CUENTAS DE USUARIO
// =====================================================================
router.get('/docentes', ah(async (req, res) => {
  const [usuarios] = await pool.query(`
    SELECT u.id, u.nombre, u.usuario, u.rol, u.activo,
           COUNT(a.id) AS total_asignaciones
    FROM usuarios u
    LEFT JOIN asignaciones a ON a.docente_id = u.id
    GROUP BY u.id
    ORDER BY u.rol, u.nombre`);
  res.render('admin/docentes', { titulo: 'Docentes y cuentas', usuarios });
}));

router.get('/docentes/nuevo', (req, res) => {
  res.render('admin/docente-form', {
    titulo: 'Nueva cuenta',
    cuenta: { nombre: '', usuario: '', rol: 'docente' }
  });
});

router.get('/docentes/:id/editar', ah(async (req, res) => {
  const [[cuenta]] = await pool.query('SELECT id, nombre, usuario, rol FROM usuarios WHERE id = ?',
    [idValido(req.params.id)]);
  if (!cuenta) return res.redirect('/admin/docentes');
  res.render('admin/docente-form', { titulo: 'Editar cuenta', cuenta });
}));

async function guardarCuenta(req, res, next, id) {
  const nombre = texto(req.body.nombre);
  const usuario = texto(req.body.usuario).toLowerCase();
  const rol = req.body.rol === 'admin' ? 'admin' : 'docente';
  const password = texto(req.body.password);
  const volverA = id ? `/admin/docentes/${id}/editar` : '/admin/docentes/nuevo';

  const errores = revisar([
    { nombre: 'Nombre', valor: nombre, requerido: true, min: 3, max: 100 },
    { nombre: 'Usuario', valor: usuario, requerido: true, regla: 'usuario' },
    // Al crear la contraseña es obligatoria; al editar solo si se quiere cambiar
    { nombre: 'Contraseña', valor: password, requerido: !id, min: 8, max: 72 }
  ]);
  // Evitar que el admin se quite a sí mismo el rol de administrador
  if (id && id === req.session.usuario.id && rol !== 'admin') {
    errores.push('No puedes quitarte tu propio rol de administrador.');
  }
  if (errores.length) {
    flash(req, 'error', errores.join(' '));
    return res.redirect(volverA);
  }

  try {
    if (id) {
      await pool.query('UPDATE usuarios SET nombre = ?, usuario = ?, rol = ? WHERE id = ?',
        [nombre, usuario, rol, id]);
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)',
        [nombre, usuario, hash, rol]);
    }
    flash(req, 'exito', id ? 'Cuenta actualizada.' : 'Cuenta creada.');
    res.redirect('/admin/docentes');
  } catch (err) {
    manejarErrorBD(err, req, res, next, volverA);
  }
}

router.post('/docentes', ah((req, res, next) => guardarCuenta(req, res, next, null)));
router.post('/docentes/:id', ah((req, res, next) => guardarCuenta(req, res, next, idValido(req.params.id))));

router.post('/docentes/:id/estado', ah(async (req, res) => {
  const id = idValido(req.params.id);
  if (id === req.session.usuario.id) {
    flash(req, 'error', 'No puedes desactivar tu propia cuenta.');
  } else {
    await pool.query('UPDATE usuarios SET activo = 1 - activo WHERE id = ?', [id]);
    flash(req, 'exito', 'Estado de la cuenta actualizado.');
  }
  res.redirect('/admin/docentes');
}));

// =====================================================================
//  ASIGNACIONES docente - grupo - materia
// =====================================================================
router.get('/asignaciones', ah(async (req, res) => {
  const [asignaciones] = await pool.query(`
    SELECT a.id, u.nombre AS docente, g.nombre AS grupo, m.clave, m.nombre AS materia
    FROM asignaciones a
    JOIN usuarios u ON u.id = a.docente_id
    JOIN grupos g   ON g.id = a.grupo_id
    JOIN materias m ON m.id = a.materia_id
    ORDER BY u.nombre, g.nombre, m.nombre`);
  const [docentes] = await pool.query("SELECT id, nombre FROM usuarios WHERE rol = 'docente' AND activo = 1 ORDER BY nombre");
  const [grupos] = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
  const [materias] = await pool.query('SELECT id, clave, nombre FROM materias ORDER BY nombre');
  res.render('admin/asignaciones', { titulo: 'Asignaciones', asignaciones, docentes, grupos, materias });
}));

router.post('/asignaciones', ah(async (req, res, next) => {
  const docente = idValido(req.body.docente_id);
  const grupo = idValido(req.body.grupo_id);
  const materia = idValido(req.body.materia_id);
  if (!docente || !grupo || !materia) {
    flash(req, 'error', 'Selecciona docente, grupo y materia.');
    return res.redirect('/admin/asignaciones');
  }
  try {
    await pool.query('INSERT INTO asignaciones (docente_id, grupo_id, materia_id) VALUES (?, ?, ?)',
      [docente, grupo, materia]);
    flash(req, 'exito', 'Asignación creada.');
    res.redirect('/admin/asignaciones');
  } catch (err) {
    manejarErrorBD(err, req, res, next, '/admin/asignaciones');
  }
}));

router.post('/asignaciones/:id/eliminar', ah(async (req, res) => {
  await pool.query('DELETE FROM asignaciones WHERE id = ?', [idValido(req.params.id)]);
  flash(req, 'exito', 'Asignación eliminada. Las sesiones ya registradas se conservan.');
  res.redirect('/admin/asignaciones');
}));

module.exports = router;

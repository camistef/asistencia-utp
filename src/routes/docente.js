/**
 * Panel del docente: abrir/cerrar sesiones de clase y pantalla de registro
 * con lector de tarjetas (RF-3 a RF-6).
 */
const express = require('express');
const pool = require('../config/db');
const ah = require('../utils/async');
const { idValido } = require('../utils/validar');
const { requiereRol } = require('../middlewares/auth');
const { flash } = require('../middlewares/locals');
const asistencia = require('../services/asistencia');

const router = express.Router();
router.use(requiereRol('docente'));

/** Obtiene la sesión si pertenece al docente (o undefined). */
async function sesionDelDocente(sesionId, docenteId) {
  const [[sesion]] = await pool.query(
    `SELECT s.*, g.nombre AS grupo, m.nombre AS materia, m.clave
     FROM sesiones s
     JOIN grupos g   ON g.id = s.grupo_id
     JOIN materias m ON m.id = s.materia_id
     WHERE s.id = ? AND s.docente_id = ?`,
    [sesionId, docenteId]
  );
  return sesion;
}

// ---------- Panel: mis materias y sesiones recientes ----------
router.get('/', ah(async (req, res) => {
  const docenteId = req.session.usuario.id;

  const [asignaciones] = await pool.query(
    `SELECT x.id, g.nombre AS grupo, m.clave, m.nombre AS materia,
            (SELECT COUNT(*) FROM alumno_grupo ag WHERE ag.grupo_id = x.grupo_id) AS total_alumnos
     FROM asignaciones x
     JOIN grupos g   ON g.id = x.grupo_id
     JOIN materias m ON m.id = x.materia_id
     WHERE x.docente_id = ?
     ORDER BY g.nombre, m.nombre`,
    [docenteId]
  );

  const [[abierta]] = await pool.query(
    `SELECT s.id, s.fecha_inicio, g.nombre AS grupo, m.nombre AS materia
     FROM sesiones s JOIN grupos g ON g.id = s.grupo_id JOIN materias m ON m.id = s.materia_id
     WHERE s.docente_id = ? AND s.estado = 'abierta' LIMIT 1`,
    [docenteId]
  );

  const [recientes] = await pool.query(
    `SELECT s.id, s.fecha_inicio, s.fecha_fin, s.estado, g.nombre AS grupo, m.nombre AS materia,
            (SELECT COUNT(*) FROM asistencias a WHERE a.sesion_id = s.id) AS presentes,
            (SELECT COUNT(*) FROM alumno_grupo ag WHERE ag.grupo_id = s.grupo_id) AS total
     FROM sesiones s JOIN grupos g ON g.id = s.grupo_id JOIN materias m ON m.id = s.materia_id
     WHERE s.docente_id = ?
     ORDER BY s.fecha_inicio DESC LIMIT 10`,
    [docenteId]
  );

  res.render('docente/index', { titulo: 'Panel del docente', asignaciones, abierta, recientes });
}));

// ---------- Abrir sesión de clase ----------
router.post('/sesiones', ah(async (req, res) => {
  const docenteId = req.session.usuario.id;
  const asignacionId = idValido(req.body.asignacion_id);

  // La asignación debe ser del docente
  const [[asig]] = await pool.query(
    'SELECT grupo_id, materia_id FROM asignaciones WHERE id = ? AND docente_id = ?',
    [asignacionId, docenteId]
  );
  if (!asig) {
    flash(req, 'error', 'Selecciona una de tus materias asignadas.');
    return res.redirect('/docente');
  }

  // Solo una sesión abierta por docente a la vez
  const [[abierta]] = await pool.query(
    "SELECT id FROM sesiones WHERE docente_id = ? AND estado = 'abierta' LIMIT 1",
    [docenteId]
  );
  if (abierta) {
    flash(req, 'aviso', 'Ya tienes una sesión abierta. Ciérrala antes de abrir otra.');
    return res.redirect(`/docente/sesiones/${abierta.id}/registro`);
  }

  const [r] = await pool.query(
    "INSERT INTO sesiones (grupo_id, materia_id, docente_id, fecha_inicio, estado) VALUES (?, ?, ?, NOW(), 'abierta')",
    [asig.grupo_id, asig.materia_id, docenteId]
  );
  flash(req, 'exito', 'Sesión abierta. Los alumnos ya pueden pasar su tarjeta.');
  res.redirect(`/docente/sesiones/${r.insertId}/registro`);
}));

// ---------- Cerrar sesión de clase ----------
router.post('/sesiones/:id/cerrar', ah(async (req, res) => {
  const [r] = await pool.query(
    "UPDATE sesiones SET estado = 'cerrada', fecha_fin = NOW() WHERE id = ? AND docente_id = ? AND estado = 'abierta'",
    [idValido(req.params.id), req.session.usuario.id]
  );
  flash(req, r.affectedRows ? 'exito' : 'aviso', r.affectedRows ? 'Sesión cerrada.' : 'La sesión ya estaba cerrada.');
  res.redirect('/docente');
}));

// ---------- Pantalla de registro con lector ----------
router.get('/sesiones/:id/registro', ah(async (req, res) => {
  const sesion = await sesionDelDocente(idValido(req.params.id), req.session.usuario.id);
  if (!sesion) {
    flash(req, 'error', 'La sesión no existe.');
    return res.redirect('/docente');
  }
  const lista = await asistencia.listaDeSesion(sesion.id);
  res.render('docente/registro', { titulo: `Registro · ${sesion.grupo}`, sesion, lista });
}));

// ---------- API: registrar una lectura (llamada por fetch desde la pantalla) ----------
router.post('/sesiones/:id/asistencias', ah(async (req, res) => {
  const sesionId = idValido(req.params.id);
  const resultado = await asistencia.registrar({
    sesionId,
    docenteId: req.session.usuario.id,
    codigo: req.body.codigo,
    metodo: req.body.metodo
  });
  if (resultado.sesionAjena) {
    // No se devuelve la lista de una sesión que no es del docente
    return res.status(404).json({ ok: false, tipo: resultado.tipo, mensaje: resultado.mensaje });
  }
  // Se devuelve también la lista actualizada para refrescar la pantalla
  const lista = await asistencia.listaDeSesion(sesionId);
  res.json({ ...resultado, lista });
}));

module.exports = router;

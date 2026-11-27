/**
 * Lógica del registro de asistencia con tarjeta (RF-3, RF-4, RF-5, RF-6).
 *
 * Flujo de registrar():
 *  1. Verificar que la sesión exista, sea del docente y esté abierta.
 *  2. Validar el código recibido (tarjeta o matrícula).
 *  3. Buscar al alumno y, en la misma consulta, saber si pertenece al grupo.
 *  4. Insertar la asistencia. Si la restricción UNIQUE (alumno, sesión)
 *     falla, es un duplicado y se avisa con la hora del primer registro.
 *
 * Son solo 3 consultas pequeñas con índices, muy por debajo de 2 s (RNF-1).
 */
const pool = require('../config/db');
const { texto, REGLAS } = require('../utils/validar');

/** Tipos de respuesta posibles (el frontend elige color y sonido con esto). */
const TIPOS = {
  EXITO: 'exito',
  DUPLICADO: 'duplicado',
  NO_REGISTRADA: 'no_registrada',
  NO_GRUPO: 'no_grupo',
  SESION_CERRADA: 'sesion_cerrada',
  ERROR: 'error'
};

/** Hora HH:MM:SS a partir de 'AAAA-MM-DD HH:MM:SS'. */
const soloHora = (fechaHora) => String(fechaHora).slice(11, 19);

async function registrar({ sesionId, docenteId, codigo, metodo }) {
  const inicio = process.hrtime.bigint();
  const ms = () => Number((process.hrtime.bigint() - inicio) / 1000000n);
  const responder = (tipo, mensaje, extra = {}) => ({ ok: tipo === TIPOS.EXITO, tipo, mensaje, ms: ms(), ...extra });

  metodo = metodo === 'manual' ? 'manual' : 'tarjeta';
  codigo = texto(codigo).toUpperCase();

  // 1. La sesión debe ser del docente y estar abierta
  const [[sesion]] = await pool.query(
    'SELECT id, grupo_id, estado FROM sesiones WHERE id = ? AND docente_id = ?',
    [sesionId, docenteId]
  );
  if (!sesion) return responder(TIPOS.ERROR, 'La sesión de clase no existe.', { sesionAjena: true });
  if (sesion.estado !== 'abierta') {
    return responder(TIPOS.SESION_CERRADA, 'La sesión ya está cerrada. No se pueden registrar más asistencias.');
  }

  // 2. Validación del dato capturado
  const regla = metodo === 'manual' ? REGLAS.matricula : REGLAS.tarjeta;
  if (!codigo || !regla.test(codigo)) {
    return responder(TIPOS.ERROR, metodo === 'manual'
      ? 'Matrícula con formato no válido.'
      : 'Lectura no válida. Vuelve a pasar la tarjeta.');
  }

  // 3. Buscar alumno y si pertenece al grupo de la sesión (en una sola consulta).
  //    Con lector se acepta el id de tarjeta o la matrícula (tarjetas con código de barras).
  const condicion = metodo === 'manual' ? 'a.matricula = ?' : '(a.id_tarjeta = ? OR a.matricula = ?)';
  const params = metodo === 'manual' ? [sesion.grupo_id, codigo] : [sesion.grupo_id, codigo, codigo];
  const [[alumno]] = await pool.query(
    `SELECT a.id, a.matricula, a.nombre, a.activo, ag.grupo_id AS en_grupo
     FROM alumnos a
     LEFT JOIN alumno_grupo ag ON ag.alumno_id = a.id AND ag.grupo_id = ?
     WHERE ${condicion}
     LIMIT 1`,
    params
  );

  if (!alumno) {
    return responder(TIPOS.NO_REGISTRADA, metodo === 'manual'
      ? 'No existe un alumno con esa matrícula.'
      : 'Tarjeta no registrada. Acude con el administrador.');
  }
  const datosAlumno = { matricula: alumno.matricula, nombre: alumno.nombre };
  if (!alumno.activo) {
    return responder(TIPOS.NO_REGISTRADA, 'El alumno está dado de baja en el sistema.', { alumno: datosAlumno });
  }
  if (!alumno.en_grupo) {
    return responder(TIPOS.NO_GRUPO, 'El alumno no pertenece a este grupo.', { alumno: datosAlumno });
  }

  // 4. Guardar. La fecha y hora las pone MySQL (NOW()) para que sean exactas y uniformes.
  try {
    const [r] = await pool.query(
      'INSERT INTO asistencias (alumno_id, sesion_id, fecha_hora, metodo) VALUES (?, ?, NOW(), ?)',
      [alumno.id, sesion.id, metodo]
    );
    const [[fila]] = await pool.query('SELECT fecha_hora FROM asistencias WHERE id = ?', [r.insertId]);
    return responder(TIPOS.EXITO, 'Asistencia registrada.', {
      alumno: datosAlumno,
      fecha_hora: fila.fecha_hora,
      hora: soloHora(fila.fecha_hora),
      metodo
    });
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') throw err;
    // Duplicado: avisar con la hora del registro original (RF-5)
    const [[previa]] = await pool.query(
      'SELECT fecha_hora FROM asistencias WHERE alumno_id = ? AND sesion_id = ?',
      [alumno.id, sesion.id]
    );
    return responder(TIPOS.DUPLICADO, `Ya tenía asistencia registrada a las ${soloHora(previa.fecha_hora)}.`, {
      alumno: datosAlumno,
      fecha_hora: previa.fecha_hora,
      hora: soloHora(previa.fecha_hora)
    });
  }
}

/**
 * Lista de alumnos del grupo de la sesión con su estado (presente / pendiente),
 * para la pantalla de registro.
 */
async function listaDeSesion(sesionId) {
  const [filas] = await pool.query(
    `SELECT a.matricula, a.nombre, asi.fecha_hora, asi.metodo
     FROM sesiones s
     JOIN alumno_grupo ag ON ag.grupo_id = s.grupo_id
     JOIN alumnos a       ON a.id = ag.alumno_id AND a.activo = 1
     LEFT JOIN asistencias asi ON asi.sesion_id = s.id AND asi.alumno_id = a.id
     WHERE s.id = ?
     ORDER BY asi.fecha_hora IS NULL, asi.fecha_hora DESC, a.nombre`,
    [sesionId]
  );
  return filas.map((f) => ({ ...f, hora: f.fecha_hora ? soloHora(f.fecha_hora) : null }));
}

module.exports = { registrar, listaDeSesion, TIPOS };

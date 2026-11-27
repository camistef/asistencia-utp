/**
 * Consultas de asistencia con filtros (RF-7) y datos para reportes (RF-8).
 *
 * Porcentaje de asistencia = asistencias del alumno / sesiones de esa
 * materia y grupo dentro del rango de fechas. Si el alumno no se registró
 * en una sesión, cuenta como falta.
 *
 * Un docente solo ve sus propias sesiones; el administrador ve todo.
 */
const pool = require('../config/db');
const { texto, idValido, fechaValida } = require('../utils/validar');

/** Lee y valida los filtros que llegan en la URL (?grupo=1&materia=2...). */
function leerFiltros(query) {
  return {
    grupo: idValido(query.grupo),
    materia: idValido(query.materia),
    alumno: texto(query.alumno).slice(0, 120),
    desde: fechaValida(query.desde),
    hasta: fechaValida(query.hasta)
  };
}

/** Construye el WHERE común a partir de los filtros y del usuario. */
function construirWhere(filtros, usuario) {
  const condiciones = ['1 = 1'];
  const params = [];

  if (usuario.rol !== 'admin') {
    condiciones.push('s.docente_id = ?');
    params.push(usuario.id);
  }
  if (filtros.grupo) { condiciones.push('s.grupo_id = ?'); params.push(filtros.grupo); }
  if (filtros.materia) { condiciones.push('s.materia_id = ?'); params.push(filtros.materia); }
  if (filtros.alumno) {
    condiciones.push('(a.matricula LIKE ? OR a.nombre LIKE ?)');
    params.push(`%${filtros.alumno}%`, `%${filtros.alumno}%`);
  }
  // Se compara con rango de DATETIME para aprovechar el índice de fecha_inicio
  if (filtros.desde) { condiciones.push('s.fecha_inicio >= ?'); params.push(`${filtros.desde} 00:00:00`); }
  if (filtros.hasta) { condiciones.push('s.fecha_inicio <= ?'); params.push(`${filtros.hasta} 23:59:59`); }

  return { where: condiciones.join(' AND '), params };
}

// Une sesiones con los alumnos del grupo y su asistencia (si la hay)
const FROM_BASE = `
  FROM sesiones s
  JOIN grupos g        ON g.id = s.grupo_id
  JOIN materias m      ON m.id = s.materia_id
  JOIN alumno_grupo ag ON ag.grupo_id = s.grupo_id
  JOIN alumnos a       ON a.id = ag.alumno_id
  LEFT JOIN asistencias asi ON asi.sesion_id = s.id AND asi.alumno_id = a.id`;

/** Resumen por alumno + grupo + materia, con porcentaje. */
async function resumen(filtros, usuario) {
  const { where, params } = construirWhere(filtros, usuario);
  const [filas] = await pool.query(
    `SELECT a.matricula, a.nombre AS alumno, g.nombre AS grupo, m.nombre AS materia,
            COUNT(s.id)   AS sesiones,
            COUNT(asi.id) AS asistencias
     ${FROM_BASE}
     WHERE ${where}
     GROUP BY a.id, g.id, m.id, a.matricula, a.nombre, g.nombre, m.nombre
     ORDER BY g.nombre, m.nombre, a.nombre
     LIMIT 2000`,
    params
  );
  return filas.map((f) => ({
    ...f,
    faltas: f.sesiones - f.asistencias,
    porcentaje: f.sesiones ? Math.round((f.asistencias / f.sesiones) * 1000) / 10 : 0
  }));
}

/** Detalle: una fila por alumno por sesión, con estado Presente / Falta. */
async function detalle(filtros, usuario, limite = 1000) {
  const { where, params } = construirWhere(filtros, usuario);
  const [filas] = await pool.query(
    `SELECT DATE(s.fecha_inicio) AS fecha, TIME(s.fecha_inicio) AS hora_clase,
            g.nombre AS grupo, m.nombre AS materia,
            a.matricula, a.nombre AS alumno,
            TIME(asi.fecha_hora) AS hora_registro, asi.metodo,
            IF(asi.id IS NULL, 'Falta', 'Presente') AS estado
     ${FROM_BASE}
     WHERE ${where}
     ORDER BY s.fecha_inicio DESC, g.nombre, a.nombre
     LIMIT ?`,
    [...params, limite]
  );
  return filas;
}

/** Totales generales del resultado (para tarjetas de resumen). */
function totales(filasResumen) {
  const sesiones = filasResumen.reduce((t, f) => t + f.sesiones, 0);
  const asistencias = filasResumen.reduce((t, f) => t + f.asistencias, 0);
  return {
    alumnos: new Set(filasResumen.map((f) => f.matricula)).size,
    registros: sesiones,
    asistencias,
    faltas: sesiones - asistencias,
    porcentaje: sesiones ? Math.round((asistencias / sesiones) * 1000) / 10 : 0
  };
}

/** Grupos y materias que puede elegir el usuario en los filtros. */
async function opcionesFiltros(usuario) {
  if (usuario.rol === 'admin') {
    const [grupos] = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
    const [materias] = await pool.query('SELECT id, nombre FROM materias ORDER BY nombre');
    return { grupos, materias };
  }
  const [grupos] = await pool.query(
    `SELECT DISTINCT g.id, g.nombre FROM asignaciones x JOIN grupos g ON g.id = x.grupo_id
     WHERE x.docente_id = ? ORDER BY g.nombre`, [usuario.id]);
  const [materias] = await pool.query(
    `SELECT DISTINCT m.id, m.nombre FROM asignaciones x JOIN materias m ON m.id = x.materia_id
     WHERE x.docente_id = ? ORDER BY m.nombre`, [usuario.id]);
  return { grupos, materias };
}

/** Texto legible de los filtros aplicados (para el encabezado de los reportes). */
async function describirFiltros(filtros) {
  const partes = [];
  if (filtros.grupo) {
    const [[g]] = await pool.query('SELECT nombre FROM grupos WHERE id = ?', [filtros.grupo]);
    if (g) partes.push(`Grupo: ${g.nombre}`);
  }
  if (filtros.materia) {
    const [[m]] = await pool.query('SELECT nombre FROM materias WHERE id = ?', [filtros.materia]);
    if (m) partes.push(`Materia: ${m.nombre}`);
  }
  if (filtros.alumno) partes.push(`Alumno: "${filtros.alumno}"`);
  if (filtros.desde) partes.push(`Desde: ${filtros.desde}`);
  if (filtros.hasta) partes.push(`Hasta: ${filtros.hasta}`);
  return partes.length ? partes.join('   |   ') : 'Sin filtros (todos los registros)';
}

module.exports = { leerFiltros, resumen, detalle, totales, opcionesFiltros, describirFiltros };

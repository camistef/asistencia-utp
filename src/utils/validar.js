/**
 * Funciones pequeñas de validación para los datos que llegan al backend.
 * Nunca confiamos en la validación del navegador: todo se revisa aquí.
 */

/** Convierte a texto y quita espacios al inicio/fin. */
function texto(valor) {
  return valor === undefined || valor === null ? '' : String(valor).trim();
}

/** Entero positivo o null si no es válido. */
function idValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Fecha AAAA-MM-DD válida o null. */
function fechaValida(valor) {
  const t = texto(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(t + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : t;
}

const REGLAS = {
  // Letras, números y guion. Ej: 2026TI001
  matricula: /^[A-Za-z0-9-]{4,20}$/,
  // Lo que escribe el lector: letras, números, guion o dos puntos. Ej: 04A1B2C301 / 04:A1:B2:C3
  tarjeta: /^[A-Za-z0-9:-]{1,64}$/,
  // Nombre de usuario para login
  usuario: /^[a-z0-9._-]{3,50}$/,
  // Nombre de grupo. Ej: TI-1A
  grupo: /^[A-Za-z0-9 -]{2,30}$/,
  // Clave de materia. Ej: PRG-101
  clave: /^[A-Za-z0-9-]{2,20}$/
};

/**
 * Valida un objeto de datos contra una lista de reglas.
 * Devuelve un arreglo de mensajes de error (vacío = todo bien).
 */
function revisar(campos) {
  const errores = [];
  for (const c of campos) {
    const v = texto(c.valor);
    if (c.requerido && !v) {
      errores.push(`${c.nombre} es obligatorio.`);
      continue;
    }
    if (!v) continue;
    if (c.max && v.length > c.max) errores.push(`${c.nombre} admite máximo ${c.max} caracteres.`);
    if (c.min && v.length < c.min) errores.push(`${c.nombre} requiere mínimo ${c.min} caracteres.`);
    if (c.regla && !REGLAS[c.regla].test(v)) errores.push(`${c.nombre} tiene un formato no válido.`);
  }
  return errores;
}

module.exports = { texto, idValido, fechaValida, revisar, REGLAS };

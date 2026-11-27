/**
 * Traduce errores comunes de MySQL a mensajes entendibles para el usuario.
 * Si el error no es uno conocido, devuelve null (y se trata como error inesperado).
 */
function mensajeErrorBD(err) {
  switch (err && err.code) {
    case 'ER_DUP_ENTRY': {
      // El mensaje de MySQL incluye el nombre de la restricción UNIQUE que falló
      const m = String(err.sqlMessage || '');
      if (m.includes('matricula')) return 'Ya existe un alumno con esa matrícula.';
      if (m.includes('tarjeta')) return 'Esa tarjeta ya está asignada a otro alumno.';
      if (m.includes('usuario')) return 'Ese nombre de usuario ya está en uso.';
      if (m.includes('grupos_nombre')) return 'Ya existe un grupo con ese nombre.';
      if (m.includes('clave')) return 'Ya existe una materia con esa clave.';
      if (m.includes('asig_grupo_materia')) return 'Esa materia ya tiene docente asignado en ese grupo.';
      return 'El registro ya existe.';
    }
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return 'No se puede eliminar porque tiene información relacionada (sesiones, asignaciones o asistencias).';
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return 'Alguno de los datos seleccionados ya no existe.';
    default:
      return null;
  }
}

module.exports = { mensajeErrorBD };

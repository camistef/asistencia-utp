/**
 * Variables disponibles en todas las vistas EJS:
 *  - usuario: el usuario con sesión iniciada (o null)
 *  - flash:   mensaje de una sola vez (éxito/error) guardado en la sesión
 *  - ruta:    ruta actual, para resaltar el menú
 */
function locals(req, res, next) {
  res.locals.usuario = (req.session && req.session.usuario) || null;
  res.locals.ruta = req.path;

  // Mensaje "flash": se muestra una vez y se borra
  res.locals.flash = (req.session && req.session.flash) || null;
  if (req.session) delete req.session.flash;

  next();
}

/** Guarda un mensaje flash para mostrarlo en la siguiente página. */
function flash(req, tipo, mensaje) {
  req.session.flash = { tipo, mensaje };
}

module.exports = { locals, flash };

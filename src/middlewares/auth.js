/**
 * Middlewares de autenticación y control de acceso por rol (RF-9, RNF-3).
 */

/** Exige que haya una sesión iniciada; si no, manda al login. */
function requiereLogin(req, res, next) {
  if (req.session && req.session.usuario) return next();

  // Las peticiones AJAX (fetch) reciben JSON en lugar de una redirección
  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(401).json({ ok: false, tipo: 'error', mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  }
  req.session.flash = { tipo: 'aviso', mensaje: 'Inicia sesión para continuar.' };
  return res.redirect('/login');
}

/**
 * Exige uno de los roles indicados.
 * Uso: router.use(requiereRol('admin'))
 */
function requiereRol(...roles) {
  return (req, res, next) => {
    const usuario = req.session && req.session.usuario;
    if (!usuario) return requiereLogin(req, res, next);
    if (roles.includes(usuario.rol)) return next();

    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(403).json({ ok: false, tipo: 'error', mensaje: 'No tienes permiso para esta acción.' });
    }
    return res.status(403).render('error', {
      titulo: 'Acceso denegado',
      mensaje: 'No tienes permiso para ver esta página.'
    });
  };
}

module.exports = { requiereLogin, requiereRol };

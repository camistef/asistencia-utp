/**
 * Rutas de autenticación: login, logout y página de inicio (RF-9).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const ah = require('../utils/async');
const { texto } = require('../utils/validar');
const { flash } = require('../middlewares/locals');

const router = express.Router();

// --- Límite simple de intentos fallidos por IP (en memoria) ---
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000; // 5 minutos
const intentos = new Map(); // ip -> { cuenta, hasta }

function estaBloqueado(ip) {
  const r = intentos.get(ip);
  if (!r) return false;
  if (r.hasta && r.hasta > Date.now()) return true;
  if (r.hasta && r.hasta <= Date.now()) intentos.delete(ip);
  return false;
}

function registrarFallo(ip) {
  const r = intentos.get(ip) || { cuenta: 0, hasta: 0 };
  r.cuenta += 1;
  if (r.cuenta >= MAX_INTENTOS) r.hasta = Date.now() + BLOQUEO_MS;
  intentos.set(ip, r);
}

/** Página a la que se envía a cada rol después de iniciar sesión. */
function inicioPorRol(rol) {
  return rol === 'admin' ? '/admin' : '/docente';
}

// Inicio: redirige según el rol (o al login)
router.get('/', (req, res) => {
  if (req.session.usuario) return res.redirect(inicioPorRol(req.session.usuario.rol));
  res.redirect('/login');
});

// Formulario de login
router.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect(inicioPorRol(req.session.usuario.rol));
  res.render('login', { titulo: 'Iniciar sesión', usuarioEscrito: '' });
});

// Procesar login
router.post('/login', ah(async (req, res, next) => {
  const usuario = texto(req.body.usuario).toLowerCase();
  const password = texto(req.body.password);
  const ip = req.ip;

  const responderError = (mensaje) => res.status(401).render('login', {
    titulo: 'Iniciar sesión',
    usuarioEscrito: usuario,
    flash: { tipo: 'error', mensaje }
  });

  if (estaBloqueado(ip)) {
    return responderError('Demasiados intentos fallidos. Espera 5 minutos e intenta de nuevo.');
  }
  if (!usuario || !password) {
    return responderError('Escribe tu usuario y contraseña.');
  }

  const [filas] = await pool.query(
    'SELECT id, nombre, usuario, password_hash, rol FROM usuarios WHERE usuario = ? AND activo = 1',
    [usuario]
  );
  const u = filas[0];
  const correcto = u ? await bcrypt.compare(password, u.password_hash) : false;

  if (!correcto) {
    registrarFallo(ip);
    // Mensaje genérico: no decimos si falló el usuario o la contraseña
    return responderError('Usuario o contraseña incorrectos.');
  }

  intentos.delete(ip);
  // Nueva sesión al iniciar (evita fijación de sesión)
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuario = { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol };
    flash(req, 'exito', `Bienvenido(a), ${u.nombre}.`);
    res.redirect(inicioPorRol(u.rol));
  });
}));

// Cerrar sesión
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('asistencia.sid');
    res.redirect('/login');
  });
});

module.exports = router;

/**
 * Asistencia UTP - Punto de entrada del servidor.
 * Inicia con:  npm start   (o  npm run dev  para recargar al guardar)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const pool = require('./src/config/db');
const { locals } = require('./src/middlewares/locals');
const { requiereLogin } = require('./src/middlewares/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MINUTOS_SESION = Number(process.env.SESSION_MINUTOS) || 60;

if (!process.env.SESSION_SECRET) {
  console.warn('AVISO: falta SESSION_SECRET en .env. Se usará una clave temporal.');
}

// ---------- Vistas EJS ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Middlewares generales ----------
app.disable('x-powered-by'); // no revelar que usamos Express
app.use(express.urlencoded({ extended: false })); // formularios HTML
app.use(express.json({ limit: '10kb' }));          // peticiones fetch (lector)
app.use(express.static(path.join(__dirname, 'public')));

// Encabezados básicos de seguridad
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

// Sesiones con expiración por inactividad (rolling: cada petición renueva el tiempo)
app.use(session({
  name: 'asistencia.sid',
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,     // JavaScript del navegador no puede leer la cookie
    sameSite: 'lax',    // la cookie no se envía en POST desde otros sitios (mitiga CSRF)
    maxAge: MINUTOS_SESION * 60 * 1000
  }
}));

app.use(locals);

// ---------- Rutas ----------
app.use('/', require('./src/routes/auth'));
app.use('/admin', require('./src/routes/admin'));
app.use('/docente', require('./src/routes/docente'));
app.use('/consulta', requiereLogin, require('./src/routes/consulta'));
app.use('/reportes', requiereLogin, require('./src/routes/reportes'));

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La página que buscas no existe.' });
});

// ---------- Manejador de errores ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const mensaje = err.code === 'ECONNREFUSED'
    ? 'No hay conexión con la base de datos. ¿Está encendido MySQL?'
    : 'Ocurrió un error inesperado. Intenta de nuevo.';

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(500).json({ ok: false, tipo: 'error', mensaje });
  }
  res.status(500).render('error', { titulo: 'Error', mensaje });
});

// ---------- Arranque ----------
app.listen(PORT, async () => {
  console.log(`Asistencia UTP escuchando en http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a MySQL correcta.');
  } catch (err) {
    console.error(`No se pudo conectar a MySQL (${err.code || err.message}). ` +
      'Enciende MySQL en XAMPP y revisa los datos del archivo .env');
  }
});

module.exports = app;

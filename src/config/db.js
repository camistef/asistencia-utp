/**
 * Conexión a MySQL mediante un "pool" de conexiones (mysql2/promise).
 * Todas las consultas del sistema usan placeholders "?" (consultas
 * parametrizadas) para evitar inyección SQL.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'asistencia_utp',
  waitForConnections: true,
  connectionLimit: 10,
  // Las fechas se devuelven como texto 'AAAA-MM-DD HH:MM:SS', tal como están
  // en la BD, para evitar conversiones de zona horaria en JavaScript.
  dateStrings: true,
  charset: 'utf8mb4'
});

module.exports = pool;

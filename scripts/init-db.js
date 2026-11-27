/**
 * Crea la base de datos y carga los datos de prueba.
 * Uso:  npm run db:init
 *
 * Ejecuta database/schema.sql y database/seed.sql usando la conexión
 * definida en .env (no necesita tener el cliente "mysql" en el PATH).
 * ADVERTENCIA: borra la base "asistencia_utp" si ya existe.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // solo aquí: necesario para ejecutar el archivo .sql completo
  });

  for (const archivo of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', archivo), 'utf8');
    console.log(`Ejecutando ${archivo}...`);
    await conn.query(sql);
  }

  await conn.end();
  console.log('Listo. Base de datos "asistencia_utp" creada con datos de prueba.');
  console.log('Usuarios: admin / jperez / mlopez / rgarcia   Contraseña: Utp2026!');
}

main().catch((err) => {
  console.error('Error al inicializar la base de datos:', err.message);
  console.error('¿Está encendido MySQL en el panel de XAMPP? ¿Son correctos los datos del .env?');
  process.exit(1);
});

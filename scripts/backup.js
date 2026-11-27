/**
 * Respaldo de la base de datos (RNF-5).
 * Uso:  npm run backup
 *
 * Ejecuta mysqldump y guarda el archivo en backups/asistencia_utp_AAAA-MM-DD_HHMM.sql
 * Para restaurar:  mysql -u root asistencia_utp < backups/archivo.sql
 *   (o desde phpMyAdmin > Importar)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const dumpPath = process.env.MYSQLDUMP_PATH || 'mysqldump';
const carpeta = path.join(__dirname, '..', 'backups');
fs.mkdirSync(carpeta, { recursive: true });

// Nombre del archivo con fecha y hora: asistencia_utp_2026-11-26_0930.sql
const ahora = new Date();
const dos = (n) => String(n).padStart(2, '0');
const sello = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;
const destino = path.join(carpeta, `${process.env.DB_NAME || 'asistencia_utp'}_${sello}.sql`);

const args = [
  `--host=${process.env.DB_HOST || 'localhost'}`,
  `--port=${process.env.DB_PORT || 3306}`,
  `--user=${process.env.DB_USER || 'root'}`,
  '--routines',
  '--single-transaction', // respaldo consistente sin bloquear tablas InnoDB
  '--default-character-set=utf8mb4',
  process.env.DB_NAME || 'asistencia_utp'
];

// La contraseña se pasa por variable de entorno para que no aparezca en la línea de comandos
const env = { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' };

const salida = fs.createWriteStream(destino);
const proceso = spawn(dumpPath, args, { env });

proceso.stdout.pipe(salida);
proceso.stderr.on('data', (d) => process.stderr.write(d));

proceso.on('error', (err) => {
  console.error(`No se pudo ejecutar mysqldump (${dumpPath}): ${err.message}`);
  console.error('Revisa MYSQLDUMP_PATH en tu archivo .env');
  process.exit(1);
});

proceso.on('close', (codigo) => {
  if (codigo === 0) {
    console.log(`Respaldo creado: ${destino}`);
  } else {
    console.error(`mysqldump terminó con código ${codigo}. El respaldo puede estar incompleto.`);
    process.exit(codigo);
  }
});

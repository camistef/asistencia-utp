/**
 * Genera el hash bcrypt de una contraseña (útil para crear usuarios a mano en SQL).
 * Uso:  npm run hash -- MiContraseña
 */
const bcrypt = require('bcryptjs');

const texto = process.argv[2];
if (!texto) {
  console.log('Uso: npm run hash -- <contraseña>');
  process.exit(1);
}
console.log(bcrypt.hashSync(texto, 10));

/**
 * Envuelve un controlador async para que, si lanza un error, Express lo
 * mande al manejador de errores (Express 4 no lo hace solo).
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

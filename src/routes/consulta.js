/**
 * Consulta de asistencia con filtros y porcentaje (RF-7).
 * Disponible para docentes (solo sus sesiones) y administrador (todo).
 */
const express = require('express');
const ah = require('../utils/async');
const consulta = require('../services/consulta');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  const usuario = req.session.usuario;
  const filtros = consulta.leerFiltros(req.query);
  const vista = req.query.vista === 'detalle' ? 'detalle' : 'resumen';
  const opciones = await consulta.opcionesFiltros(usuario);

  // El resumen siempre se calcula (para las tarjetas de totales)
  const filasResumen = await consulta.resumen(filtros, usuario);
  const filasDetalle = vista === 'detalle' ? await consulta.detalle(filtros, usuario, 1000) : [];

  // Query string actual para reutilizarla en los botones de exportar
  const qs = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v).map(([k, v]) => [k, String(v)])
  ).toString();

  res.render('consulta', {
    titulo: 'Consulta de asistencia',
    filtros,
    vista,
    opciones,
    filasResumen,
    filasDetalle,
    totales: consulta.totales(filasResumen),
    qs
  });
}));

module.exports = router;

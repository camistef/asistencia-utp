/**
 * Exportación de reportes en PDF (pdfkit) y Excel (exceljs) - RF-8.
 * Usan los mismos filtros que la pantalla de consulta.
 */
const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const ah = require('../utils/async');
const consulta = require('../services/consulta');

const router = express.Router();

/** Nombre de archivo con fecha: asistencia_2026-11-26.pdf */
function nombreArchivo(ext) {
  const hoy = new Date().toISOString().slice(0, 10);
  return `asistencia_${hoy}.${ext}`;
}

/** Fecha y hora local legible para el pie del reporte. */
function ahoraTexto() {
  return new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

// =====================================================================
//  PDF: resumen por alumno con porcentaje
// =====================================================================
router.get('/pdf', ah(async (req, res) => {
  const usuario = req.session.usuario;
  const filtros = consulta.leerFiltros(req.query);
  const filas = await consulta.resumen(filtros, usuario);
  const totales = consulta.totales(filas);
  const textoFiltros = await consulta.describirFiltros(filtros);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo('pdf')}"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
  doc.pipe(res);

  // Encabezado
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e3a5f').text('Asistencia UTP');
  doc.fontSize(11).font('Helvetica').fillColor('#333')
    .text('Reporte de asistencia - Universidad Tecnológica de Parras');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#555').text(textoFiltros);
  doc.text(`Generado por: ${usuario.nombre}   ·   ${ahoraTexto()}`);
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#000').text(
    `Alumnos: ${totales.alumnos}    Asistencias: ${totales.asistencias}    Faltas: ${totales.faltas}    Asistencia global: ${totales.porcentaje}%`
  );
  doc.moveDown(0.8);

  // Tabla
  const columnas = [
    { titulo: 'Matrícula', campo: 'matricula', ancho: 70 },
    { titulo: 'Alumno', campo: 'alumno', ancho: 150 },
    { titulo: 'Grupo', campo: 'grupo', ancho: 50 },
    { titulo: 'Materia', campo: 'materia', ancho: 120 },
    { titulo: 'Ses.', campo: 'sesiones', ancho: 32, alinear: 'right' },
    { titulo: 'Asis.', campo: 'asistencias', ancho: 32, alinear: 'right' },
    { titulo: 'Faltas', campo: 'faltas', ancho: 36, alinear: 'right' },
    { titulo: '%', campo: 'porcentaje', ancho: 42, alinear: 'right' }
  ];
  const x0 = doc.page.margins.left;
  const altoFila = 16;

  const dibujarEncabezado = () => {
    let x = x0;
    const y = doc.y;
    doc.rect(x0, y - 3, columnas.reduce((t, c) => t + c.ancho, 0), altoFila).fill('#1e3a5f');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
    columnas.forEach((c) => {
      doc.text(c.titulo, x + 3, y, { width: c.ancho - 6, align: c.alinear || 'left' });
      x += c.ancho;
    });
    doc.y = y + altoFila;
    doc.font('Helvetica').fillColor('#000');
  };

  dibujarEncabezado();
  filas.forEach((f, i) => {
    // Salto de página si no cabe la fila
    if (doc.y + altoFila > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      dibujarEncabezado();
    }
    const y = doc.y;
    if (i % 2 === 0) {
      doc.rect(x0, y - 3, columnas.reduce((t, c) => t + c.ancho, 0), altoFila).fill('#eef2f7');
    }
    // Alumnos con menos de 80 % se marcan en rojo
    doc.fillColor(f.porcentaje < 80 ? '#b42318' : '#000').fontSize(8.5);
    let x = x0;
    columnas.forEach((c) => {
      const valor = c.campo === 'porcentaje' ? `${f.porcentaje}%` : String(f[c.campo]);
      doc.text(valor, x + 3, y, { width: c.ancho - 6, align: c.alinear || 'left', lineBreak: false, ellipsis: true });
      x += c.ancho;
    });
    doc.y = y + altoFila;
  });

  if (!filas.length) doc.fontSize(10).fillColor('#555').text('No hay registros con los filtros seleccionados.');

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#777').text('En rojo: alumnos con asistencia menor a 80 %.', x0);
  doc.end();
}));

// =====================================================================
//  EXCEL: hoja "Resumen" y hoja "Detalle"
// =====================================================================
router.get('/excel', ah(async (req, res) => {
  const usuario = req.session.usuario;
  const filtros = consulta.leerFiltros(req.query);
  const filasResumen = await consulta.resumen(filtros, usuario);
  const filasDetalle = await consulta.detalle(filtros, usuario, 20000);
  const textoFiltros = await consulta.describirFiltros(filtros);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Asistencia UTP';
  libro.created = new Date();

  const estiloEncabezado = (hoja) => {
    const fila = hoja.getRow(3);
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    hoja.views = [{ state: 'frozen', ySplit: 3 }]; // fija el encabezado al desplazarse
  };

  // ---- Hoja Resumen ----
  const hr = libro.addWorksheet('Resumen');
  hr.getCell('A1').value = 'Reporte de asistencia - Asistencia UTP';
  hr.getCell('A1').font = { bold: true, size: 14 };
  hr.getCell('A2').value = `${textoFiltros}  ·  Generado: ${ahoraTexto()}`;
  hr.getRow(3).values = ['Matrícula', 'Alumno', 'Grupo', 'Materia', 'Sesiones', 'Asistencias', 'Faltas', '% Asistencia'];
  hr.columns = [
    { key: 'matricula', width: 14 }, { key: 'alumno', width: 34 }, { key: 'grupo', width: 10 },
    { key: 'materia', width: 30 }, { key: 'sesiones', width: 10 }, { key: 'asistencias', width: 12 },
    { key: 'faltas', width: 9 }, { key: 'porcentaje', width: 13 }
  ];
  estiloEncabezado(hr);
  filasResumen.forEach((f) => {
    const fila = hr.addRow({ ...f, porcentaje: f.porcentaje / 100 });
    fila.getCell('porcentaje').numFmt = '0.0%';
    if (f.porcentaje < 80) fila.getCell('porcentaje').font = { color: { argb: 'FFB42318' }, bold: true };
  });

  // ---- Hoja Detalle ----
  const hd = libro.addWorksheet('Detalle');
  hd.getCell('A1').value = 'Detalle por sesión';
  hd.getCell('A1').font = { bold: true, size: 14 };
  hd.getCell('A2').value = textoFiltros;
  hd.getRow(3).values = ['Fecha', 'Hora clase', 'Grupo', 'Materia', 'Matrícula', 'Alumno', 'Estado', 'Hora registro', 'Método'];
  hd.columns = [
    { key: 'fecha', width: 12 }, { key: 'hora_clase', width: 11 }, { key: 'grupo', width: 10 },
    { key: 'materia', width: 30 }, { key: 'matricula', width: 14 }, { key: 'alumno', width: 34 },
    { key: 'estado', width: 10 }, { key: 'hora_registro', width: 13 }, { key: 'metodo', width: 10 }
  ];
  estiloEncabezado(hd);
  filasDetalle.forEach((f) => {
    const fila = hd.addRow({ ...f, hora_registro: f.hora_registro || '', metodo: f.metodo || '' });
    if (f.estado === 'Falta') fila.getCell('estado').font = { color: { argb: 'FFB42318' } };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo('xlsx')}"`);
  await libro.xlsx.write(res);
  res.end();
}));

module.exports = router;

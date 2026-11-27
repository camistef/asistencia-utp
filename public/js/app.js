/**
 * Comportamientos generales de todas las páginas.
 */
(function () {
  'use strict';

  // Formularios con data-confirmar="mensaje": piden confirmación antes de enviarse
  document.querySelectorAll('form[data-confirmar]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirmar'))) e.preventDefault();
    });
  });

  // Los mensajes de éxito desaparecen solos después de 5 segundos
  document.querySelectorAll('.alerta-exito').forEach(function (alerta) {
    setTimeout(function () { alerta.classList.add('oculta'); }, 5000);
  });
})();

/**
 * Pantalla de registro de asistencia con lector de tarjetas.
 *
 * El lector (NFC o código de barras) funciona como teclado USB (HID):
 * escribe el identificador en el campo con foco y envía "Enter".
 * Por eso:
 *   1. El campo #codigo siempre recupera el foco (modo lector).
 *   2. Al recibir Enter se envía el código al servidor con fetch.
 *   3. Se muestra el resultado con color, mensaje, sonido y tiempo de respuesta.
 *
 * Compatible con Chrome, Edge y Firefox (solo usa APIs estándar).
 */
(function () {
  'use strict';

  var raiz = document.getElementById('registro');
  if (!raiz || raiz.dataset.abierta !== '1') return;

  var sesionId = raiz.dataset.sesion;
  var form = document.getElementById('form-lectura');
  var input = document.getElementById('codigo');
  var etiqueta = document.getElementById('etiqueta-codigo');
  var ayuda = document.getElementById('ayuda-modo');
  var chkSonido = document.getElementById('sonido');
  var botonesModo = document.querySelectorAll('.modo[data-modo]');

  var panel = {
    caja: document.getElementById('panel'),
    icono: document.getElementById('panel-icono'),
    titulo: document.getElementById('panel-titulo'),
    nombre: document.getElementById('panel-nombre'),
    matricula: document.getElementById('panel-matricula'),
    tiempo: document.getElementById('panel-tiempo')
  };

  var modo = 'tarjeta';
  var temporizadorPanel = null;

  // Recordar la preferencia de sonido en este navegador
  try {
    if (localStorage.getItem('asistencia.sonido') === '0') chkSonido.checked = false;
  } catch (e) { /* almacenamiento no disponible: se ignora */ }
  chkSonido.addEventListener('change', function () {
    try { localStorage.setItem('asistencia.sonido', chkSonido.checked ? '1' : '0'); } catch (e) { /* nada */ }
    enfocar();
  });

  // ------------------------------------------------------------------
  //  Sonido con Web Audio API (no requiere archivos de audio)
  // ------------------------------------------------------------------
  var audioCtx = null;
  function pitido(tipo) {
    if (!chkSonido.checked) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      // Éxito: dos tonos agudos. Aviso: un tono medio. Error: tono grave largo.
      var notas = {
        exito: [[880, 0, 0.09], [1320, 0.1, 0.12]],
        duplicado: [[600, 0, 0.18]],
        error: [[220, 0, 0.35]]
      }[tipo] || [[600, 0, 0.15]];

      notas.forEach(function (n) {
        var osc = audioCtx.createOscillator();
        var vol = audioCtx.createGain();
        var t = audioCtx.currentTime + n[1];
        osc.type = tipo === 'error' ? 'square' : 'sine';
        osc.frequency.value = n[0];
        vol.gain.setValueAtTime(0.15, t);
        vol.gain.exponentialRampToValueAtTime(0.001, t + n[2]);
        osc.connect(vol).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + n[2]);
      });
    } catch (e) { /* si el navegador no permite audio, se continúa sin sonido */ }
  }

  // ------------------------------------------------------------------
  //  Panel de resultado
  // ------------------------------------------------------------------
  var ESTILOS = {
    exito:          { clase: 'panel-exito', icono: '✓', sonido: 'exito' },
    duplicado:      { clase: 'panel-aviso', icono: '!', sonido: 'duplicado' },
    no_registrada:  { clase: 'panel-error', icono: '✕', sonido: 'error' },
    no_grupo:       { clase: 'panel-error', icono: '✕', sonido: 'error' },
    sesion_cerrada: { clase: 'panel-error', icono: '✕', sonido: 'error' },
    error:          { clase: 'panel-error', icono: '✕', sonido: 'error' }
  };

  function mostrar(r, msCliente) {
    var estilo = ESTILOS[r.tipo] || ESTILOS.error;
    panel.caja.className = 'panel ' + estilo.clase;
    panel.icono.textContent = estilo.icono;
    panel.titulo.textContent = r.mensaje;
    panel.nombre.textContent = r.alumno ? r.alumno.nombre : ' ';
    panel.matricula.textContent = r.alumno
      ? 'Matrícula ' + r.alumno.matricula + (r.hora ? ' · ' + r.hora : '')
      : ' ';
    // Evidencia de RNF-1 (< 2 s): tiempo total visto por el usuario y tiempo en servidor
    panel.tiempo.textContent = msCliente != null
      ? 'Respuesta en ' + msCliente + ' ms (servidor ' + (r.ms != null ? r.ms : '?') + ' ms)'
      : ' ';
    pitido(estilo.sonido);

    // Después de 4 segundos el panel vuelve a "esperando"
    clearTimeout(temporizadorPanel);
    temporizadorPanel = setTimeout(esperar, 4000);
  }

  function esperar() {
    panel.caja.className = 'panel panel-espera';
    panel.icono.textContent = '⌁';
    panel.titulo.textContent = modo === 'tarjeta' ? 'Acerca o pasa tu tarjeta' : 'Escribe la matrícula y presiona Enter';
    panel.nombre.textContent = ' ';
    panel.matricula.textContent = ' ';
    panel.tiempo.textContent = ' ';
  }

  // ------------------------------------------------------------------
  //  Lista de alumnos de la sesión
  // ------------------------------------------------------------------
  function pintarLista(lista) {
    var tbody = document.getElementById('lista');
    tbody.textContent = '';
    var presentes = 0;
    lista.forEach(function (l) {
      if (l.hora) presentes++;
      var tr = document.createElement('tr');
      tr.className = l.hora ? 'presente' : 'pendiente';
      [l.nombre, l.matricula, l.hora ? l.hora + (l.metodo === 'manual' ? ' (manual)' : '') : '—']
        .forEach(function (texto, i) {
          var td = document.createElement('td');
          td.textContent = texto; // textContent evita inyectar HTML
          if (i === 1) td.className = 'mono';
          tr.appendChild(td);
        });
      tbody.appendChild(tr);
    });
    document.getElementById('cont-presentes').textContent = presentes;
    document.getElementById('cont-total').textContent = lista.length;
  }

  // ------------------------------------------------------------------
  //  Envío de la lectura al servidor
  // ------------------------------------------------------------------
  function enviar(codigo) {
    var inicio = performance.now();
    fetch('/docente/sesiones/' + encodeURIComponent(sesionId) + '/asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ codigo: codigo, metodo: modo })
    })
      .then(function (resp) {
        return resp.json().then(function (datos) {
          if (resp.status === 401) {
            // Sesión del docente expirada
            mostrar(datos, null);
            setTimeout(function () { window.location.href = '/login'; }, 2500);
            return;
          }
          mostrar(datos, Math.round(performance.now() - inicio));
          if (datos.lista) pintarLista(datos.lista);
          if (datos.tipo === 'sesion_cerrada') setTimeout(function () { window.location.reload(); }, 2500);
        });
      })
      .catch(function () {
        mostrar({ tipo: 'error', mensaje: 'Sin conexión con el servidor. Intenta de nuevo.' }, null);
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var codigo = input.value.trim();
    input.value = ''; // se limpia de inmediato para la siguiente tarjeta
    if (codigo) enviar(codigo);
    enfocar();
  });

  // ------------------------------------------------------------------
  //  Modo lector / captura manual
  // ------------------------------------------------------------------
  botonesModo.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modo = btn.dataset.modo;
      botonesModo.forEach(function (b) { b.classList.toggle('activo', b === btn); });
      if (modo === 'tarjeta') {
        etiqueta.textContent = 'Lectura de tarjeta';
        input.placeholder = 'Esperando lectura…';
        ayuda.textContent = 'El campo se mantiene activo para el lector. Si el lector falla, usa "Captura manual".';
      } else {
        etiqueta.textContent = 'Matrícula del alumno';
        input.placeholder = 'Ej. 2026TI001';
        ayuda.textContent = 'Escribe la matrícula y presiona Enter o el botón Registrar.';
      }
      esperar();
      enfocar();
    });
  });

  // ------------------------------------------------------------------
  //  Mantener el foco en el campo para que el lector siempre "escriba" ahí
  // ------------------------------------------------------------------
  function enfocar() {
    if (document.activeElement !== input) input.focus({ preventScroll: true });
  }
  input.addEventListener('blur', function () {
    // En modo lector se recupera el foco salvo que el usuario esté usando otro control
    if (modo !== 'tarjeta') return;
    setTimeout(function () {
      var activo = document.activeElement;
      var enControl = activo && activo !== document.body && activo.closest('button, a, input, select, form[data-confirmar]');
      if (!enControl) enfocar();
    }, 150);
  });
  document.addEventListener('click', function (e) {
    if (modo === 'tarjeta' && !e.target.closest('button, a, input, label')) enfocar();
  });
  window.addEventListener('focus', enfocar);
  enfocar();
})();

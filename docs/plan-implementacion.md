# Plan de implementación — Asistencia UTP (5 semanas)

El código base ya está hecho. El plan reparte el trabajo de **instalar, entender, probar, ajustar y presentar**
en 5 semanas, siguiendo las 8 etapas del enunciado. Cada semana termina con algo que se puede mostrar.

## Resumen

| Semana | Etapas | Objetivo | Entregable |
|---|---|---|---|
| 1 | 1 y 2 | Entorno, base de datos y login funcionando | BD creada, login por rol, primer commit en GitHub |
| 2 | 3 | Módulo de gestión (admin) probado | Alta de alumnos, grupos, materias, docentes y asignaciones |
| 3 | 4 | Registro con lector en el aula | Demo de pase de lista con tarjeta real o simulada |
| 4 | 5 y 6 | Consultas, reportes e interfaz pulida | PDF y Excel; pruebas en 3 navegadores |
| 5 | 7 y 8 | Pruebas formales, documentación y presentación | Tabla de pruebas llena, README, ensayo de la exposición |

## Semana 1 — Estructura, base de datos y autenticación (Etapas 1 y 2)

**Tareas**
1. Instalar Node.js 18+ y XAMPP. Encender MySQL desde el panel de XAMPP.
2. `npm install`, copiar `.env.example` a `.env` y cambiar `SESSION_SECRET`.
3. `npm run db:init` y revisar las tablas en phpMyAdmin.
4. `npm start` y entrar con `admin`, `jperez` y una contraseña incorrecta.
5. Estudiar `database/schema.sql` y `docs/diccionario-datos.md`: llaves foráneas, índices y el `UNIQUE (alumno_id, sesion_id)`.
6. Estudiar `src/routes/auth.js` y `src/middlewares/auth.js` (bcrypt, sesión, roles).
7. Subir la rama `desarrollo` a GitHub y abrir un Pull Request hacia `main`.

**Archivos clave:** `database/*.sql`, `app.js`, `src/config/db.js`, `src/routes/auth.js`, `src/middlewares/auth.js`

**Listo cuando:** pasan las pruebas A-1 a A-11 de `docs/casos-de-prueba.md`.

## Semana 2 — Módulo de gestión (Etapa 3)

**Tareas**
1. Recorrer el panel de admin: crear un grupo, una materia, un docente, 3 alumnos y una asignación.
2. Probar los errores: matrícula duplicada, tarjeta duplicada, eliminar un grupo con sesiones.
3. Si la escuela da datos reales de un grupo piloto, capturarlos (solo nombre, matrícula y tarjeta).
4. Estudiar `src/routes/admin.js` (transacción al guardar alumno y grupos) y `src/utils/validar.js`.
5. *(Opcional)* Agregar importación de alumnos desde CSV si el grupo piloto es grande.

**Archivos clave:** `src/routes/admin.js`, `views/admin/*.ejs`, `src/utils/*`

**Listo cuando:** pasan las pruebas G-1 a G-15.

## Semana 3 — Lector de tarjetas y registro (Etapa 4)

**Tareas**
1. Conseguir un lector USB (NFC o de código de barras) que funcione "como teclado". Probarlo en el Bloc de notas:
   al pasar la tarjeta debe escribir un código y saltar de línea.
2. Registrar el UID de algunas tarjetas reales en el formulario del alumno.
3. Abrir una sesión como docente y probar éxito, duplicado, tarjeta no registrada y alumno de otro grupo.
4. Medir el tiempo que aparece en el panel ("Respuesta en N ms") y anotarlo como evidencia de RNF-1.
5. Probar la captura manual y la pérdida de foco (clic fuera del campo).
6. Estudiar `src/services/asistencia.js` y `public/js/registro.js`.

**Sin lector físico:** escribir el ID de la tarjeta de prueba y presionar Enter es exactamente lo que hace el lector.

**Listo cuando:** pasan las pruebas R-1 a R-16.

## Semana 4 — Consultas, reportes e interfaz (Etapas 5 y 6)

**Tareas**
1. Hacer varias sesiones de prueba en días distintos (o usar el historial del seed).
2. Probar los filtros de Consulta y comprobar a mano un porcentaje.
3. Exportar PDF y Excel; revisar que los acentos y las tablas se vean bien.
4. Probar todo en Chrome, Edge y Firefox, y en ventana angosta.
5. Ajustar colores y textos según la retroalimentación del docente asesor.
6. Estudiar `src/services/consulta.js` (cálculo del porcentaje) y `src/routes/reportes.js`.

**Listo cuando:** pasan las pruebas C-1 a C-11 y N-3 a N-6.

## Semana 5 — Pruebas, documentación y presentación (Etapas 7 y 8)

**Tareas**
1. Llenar la columna "Resultado obtenido" de `docs/casos-de-prueba.md` y anotar cada corrección.
2. `npm run backup` y probar la restauración (N-1, N-2).
3. Revisar el README y el manual de usuario; tomar capturas de pantalla para el reporte escrito.
4. Volver a cargar los datos de prueba (`npm run db:init`) antes de la demo.
5. Preparar el guion de la demo (abajo) y ensayarlo.
6. Hacer merge del Pull Request a `main` y etiquetar la versión (`git tag v1.0`).

### Guion sugerido de la demo (10 minutos)
1. Problema: el pase de lista manual tarda de 5 a 10 minutos por clase.
2. Login como admin → alta de un alumno con su tarjeta → asignarlo al grupo.
3. Login como docente → abrir sesión → pasar 3 tarjetas: éxito, duplicado y no registrada.
4. Mostrar el tiempo de respuesta en pantalla (< 2 s).
5. Cerrar la sesión → Consulta con porcentajes → exportar PDF y Excel.
6. Seguridad: hash bcrypt en la BD, roles, consultas parametrizadas, UNIQUE contra duplicados.
7. Respaldo con `npm run backup`.

## Riesgos y cómo manejarlos

| Riesgo | Plan B |
|---|---|
| No se consigue un lector a tiempo | Demo escribiendo el ID y presionando Enter (mismo comportamiento) o usando un lector de código de barras barato |
| El lector NFC no escribe Enter al final | La mayoría se configura escaneando un código de su manual; si no, el docente presiona Enter o el botón "Registrar" |
| MySQL de XAMPP no arranca (puerto 3306 ocupado) | Cambiar el puerto en XAMPP y en `DB_PORT` del `.env` |
| Se pierde la base de datos | `npm run backup` cada semana; `npm run db:init` recrea los datos de prueba |
| El servidor se reinicia y se pierden las sesiones de login | Es normal (sesiones en memoria); solo hay que volver a entrar |

## Mejoras opcionales (si sobra tiempo)

- Importar alumnos desde CSV/Excel.
- Retardos: marcar "retardo" si el alumno pasa después de X minutos de abierta la sesión.
- Cierre automático de sesiones olvidadas.
- Guardar las sesiones de login en MySQL (`express-mysql-session`) para que sobrevivan a reinicios.

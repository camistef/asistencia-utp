# Casos de prueba — Asistencia UTP

**Preparación:** ejecutar `npm run db:init` (datos de prueba) e iniciar con `npm start`.
Contraseña de todas las cuentas: `Utp2026!`.

**Columna "Resultado obtenido":** se llena al ejecutar cada prueba (✅ correcto / ❌ falla y qué pasó).
Las marcadas como *verificado* ya se probaron durante el desarrollo sin base de datos; las demás requieren MySQL encendido.

## 1. Autenticación y roles (RF-9, RNF-3)

| # | Entrada / acción | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| A-1 | Entrar a `/admin` sin iniciar sesión | Redirige a `/login` | ✅ verificado (302 → /login) |
| A-2 | Login con campos vacíos | Mensaje "Escribe tu usuario y contraseña." | ✅ verificado (401) |
| A-3 | Login `admin` / `Utp2026!` | Entra al Panel del administrador | |
| A-4 | Login `jperez` / `Utp2026!` | Entra a "Mis clases" | |
| A-5 | Login `admin` / `incorrecta` | "Usuario o contraseña incorrectos." (no dice cuál falló) | |
| A-6 | 5 logins fallidos seguidos | El 6.º intento muestra "Demasiados intentos… espera 5 minutos" | |
| A-7 | Con sesión de `jperez`, abrir `/admin/alumnos` | Página "Acceso denegado" (403) | |
| A-8 | Con sesión de `admin`, abrir `/docente` | Página "Acceso denegado" (403) | |
| A-9 | Quedarse inactivo más de `SESSION_MINUTOS` y recargar | Pide iniciar sesión de nuevo | |
| A-10 | Revisar la tabla `usuarios` en phpMyAdmin | `password_hash` empieza con `$2a$10$`; no hay contraseñas legibles | |
| A-11 | Botón "Salir" | Cierra sesión y vuelve al login; `/admin` vuelve a pedir login | |

## 2. Gestión de alumnos, grupos y materias (RF-1, RF-2)

| # | Entrada / acción | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| G-1 | Nuevo alumno `2026TI099`, "Prueba Uno", tarjeta `ABC123`, grupo TI-1A | "Alumno registrado." Aparece en la lista con grupo TI-1A | |
| G-2 | Nuevo alumno con matrícula `2026TI001` (ya existe) | "Ya existe un alumno con esa matrícula." | |
| G-3 | Nuevo alumno con tarjeta `04A1B2C301` (ya asignada) | "Esa tarjeta ya está asignada a otro alumno." | |
| G-4 | Matrícula `12` (muy corta) o `ABC$%` | "Matrícula tiene un formato no válido." | |
| G-5 | Editar alumno y cambiarle el grupo | Se guarda; la lista muestra el nuevo grupo | |
| G-6 | Buscar "Camila" en Alumnos | Solo aparece Camila Torres Esquivel | |
| G-7 | "Dar de baja" a un alumno | Estado "Baja"; la fila se ve gris | |
| G-8 | Crear grupo `TI-1A` (ya existe) | "Ya existe un grupo con ese nombre." | |
| G-9 | Eliminar grupo TI-1A (tiene sesiones) | "No se puede eliminar porque tiene información relacionada…" | |
| G-10 | Crear grupo nuevo y eliminarlo | Se elimina correctamente | |
| G-11 | Grupo → Ver alumnos → agregar `2026ME030` | Aparece en la lista del grupo | |
| G-12 | Crear materia con clave `PRG-101` (existe) | "Ya existe una materia con esa clave." | |
| G-13 | Asignar a `rgarcia` TI-1A / Fundamentos de Programación (ya es de jperez) | "Esa materia ya tiene docente asignado en ese grupo." | |
| G-14 | Crear cuenta docente con contraseña de 5 caracteres | "Contraseña requiere mínimo 8 caracteres." | |
| G-15 | Admin intenta desactivar su propia cuenta | No aparece el botón; vía POST: "No puedes desactivar tu propia cuenta." | |

## 3. Registro de asistencia con tarjeta (RF-3 a RF-6, RNF-1)

Iniciar sesión como `jperez` → "Abrir sesión" en **TI-1A · Fundamentos de Programación**.

| # | Entrada (en el campo del lector + Enter) | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| R-1 | `04A1B2C301` | 🟩 "Asistencia registrada." Ana Sofía Martínez Ruiz, matrícula y hora. Sonido de éxito. Contador +1 | |
| R-2 | `04A1B2C301` otra vez | 🟨 "Ya tenía asistencia registrada a las HH:MM:SS." No se crea un segundo registro | |
| R-3 | `FFFFFFFF` | 🟥 "Tarjeta no registrada. Acude con el administrador." | |
| R-4 | `04A1B2C311` (alumno de TI-3B) | 🟥 "El alumno no pertenece a este grupo." con su nombre | |
| R-5 | `2026TI002` en modo lector (código de barras con matrícula) | 🟩 Registra a Luis Fernando Cárdenas Gil | |
| R-6 | Modo "Captura manual": `2026TI003` | 🟩 Registra a Valeria; en la lista aparece "(manual)" | |
| R-7 | Modo manual: `2026XX999` | 🟥 "No existe un alumno con esa matrícula." | |
| R-8 | Texto con símbolos `<script>` | 🟥 "Lectura no válida…" (no se procesa) | |
| R-9 | Leer 10 tarjetas seguidas rápido (01 a 10) | Las 10 se registran; el contador llega a 10/10 | |
| R-10 | Tiempo mostrado en el panel en R-1 | "Respuesta en N ms", con N < 2000 (RNF-1) | |
| R-11 | Hacer clic en cualquier parte de la página | El cursor regresa al campo del lector | |
| R-12 | Intentar abrir otra sesión con una sesión abierta | "Ya tienes una sesión abierta. Ciérrala antes de abrir otra." | |
| R-13 | Cerrar la sesión y pasar una tarjeta (en otra pestaña que quedó abierta) | 🟥 "La sesión ya está cerrada…" y la página se recarga | |
| R-14 | Docente `mlopez` hace POST a la sesión de `jperez` | "La sesión de clase no existe." (no puede registrar en sesiones ajenas) | |
| R-15 | API sin sesión iniciada | JSON 401 "Tu sesión expiró…" | ✅ verificado |
| R-16 | Revisar en BD `asistencias` tras R-1 | Fila con alumno, sesión, `fecha_hora` exacta y `metodo='tarjeta'` | |

## 4. Consulta y reportes (RF-7, RF-8)

| # | Entrada / acción | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| C-1 | `jperez` → Consulta sin filtros | Solo aparecen TI-1A Programación y TI-3B Bases de Datos | |
| C-2 | `admin` → Consulta sin filtros | Aparecen todos los grupos y materias | |
| C-3 | Filtro Grupo TI-1A + Materia Programación | Solo esos registros; porcentajes por alumno | |
| C-4 | Filtro Alumno "2026TI001" | Solo Ana Sofía, en sus materias | |
| C-5 | Rango de fechas de un solo día con sesión | Sesiones = 1 por materia | |
| C-6 | Rango sin sesiones | "No hay registros con estos filtros." | |
| C-7 | Verificar porcentaje a mano: asistencias ÷ sesiones | Coincide con la columna %; < 80 % en rojo | |
| C-8 | Pestaña "Detalle por sesión" | Una fila por alumno y sesión con Presente/Falta | |
| C-9 | Exportar PDF | Se descarga `asistencia_AAAA-MM-DD.pdf` con encabezado, filtros y tabla | ✅ verificado con datos simulados (70 filas → 2 páginas) |
| C-10 | Exportar Excel | Se descarga `.xlsx` con hojas "Resumen" y "Detalle"; % con formato | ✅ verificado con datos simulados |
| C-11 | `jperez` modifica la URL `?grupo=3` (MEC-2A, no es suyo) | Tabla vacía (solo ve sus sesiones) | |

## 5. Respaldo y compatibilidad (RNF-5, RNF-6)

| # | Entrada / acción | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| N-1 | `npm run backup` | Se crea `backups/asistencia_utp_…sql` | |
| N-2 | Borrar una asistencia y restaurar el respaldo en phpMyAdmin | La asistencia vuelve a aparecer | |
| N-3 | Flujo R-1 a R-4 en **Chrome** | Funciona igual (colores, sonido, foco) | |
| N-4 | Flujo R-1 a R-4 en **Edge** | Funciona igual | |
| N-5 | Flujo R-1 a R-4 en **Firefox** | Funciona igual | |
| N-6 | Pantalla de registro en ventana angosta (celular) | Se acomoda en una columna, sin desbordes | |

## Verificaciones hechas durante el desarrollo

- Sintaxis de todos los archivos JavaScript (`node --check`): sin errores.
- Las 18 combinaciones de vistas EJS se renderizaron con datos simulados sin errores, y el HTML de los mensajes se escapa.
- Servidor sin BD: `/login` 200, rutas protegidas 302 → `/login`, API 401 en JSON, 404 para rutas inexistentes.
- PDF y Excel generados con 70 filas simuladas: archivos válidos (firma `%PDF` y `PK`).

## Correcciones registradas

| Fecha | Problema encontrado | Corrección |
|---|---|---|
| 2026-11-26 | Sin MySQL, el mensaje de arranque salía vacío (`AggregateError` sin texto) | Se muestra el código de error y la indicación de encender MySQL en XAMPP |
| 2026-11-26 | (R-14) Un docente que enviaba una lectura a una sesión ajena recibía la lista de alumnos de esa sesión | Se verifica primero que la sesión sea del docente; si no, responde 404 sin datos |
| | | |

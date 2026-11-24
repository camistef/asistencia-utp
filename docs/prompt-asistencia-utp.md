Actúa como desarrollador full-stack senior. Ayúdame a construir "Asistencia UTP", un sistema web de registro de asistencia de alumnos mediante tarjeta universitaria, para un proyecto escolar de la Universidad Tecnológica de Parras. Debe quedar funcional en 5 semanas, así que prioriza lo esencial y mantén el código simple, claro y comentado.

## STACK
- Backend: Node.js + Express
- Base de datos: MySQL (usa mysql2 y consultas parametrizadas)
- Frontend: HTML, CSS y JavaScript (puede ser con plantillas EJS o páginas estáticas que consuman la API). Sin frameworks pesados.
- Autenticación: sesiones o JWT, con contraseñas cifradas con bcrypt
- Reportes: PDF (pdfkit) y Excel (exceljs)
- Control de versiones: Git/GitHub, con .gitignore y un archivo .env para credenciales
- Debe funcionar en Chrome, Edge y Firefox

## CONTEXTO DEL PROBLEMA
El pase de lista manual consume 5-10 minutos por clase, genera errores y dificulta calcular porcentajes de asistencia. El sistema debe automatizar el registro: el alumno acerca o pasa su tarjeta por un lector, y el sistema guarda matrícula, fecha y hora.

## USUARIOS
1. Alumno: registra su asistencia con la tarjeta (no inicia sesión).
2. Docente: inicia sesión, abre la sesión de clase, supervisa registros, consulta asistencia y exporta reportes.
3. Administrador: da de alta alumnos, grupos y materias, y administra cuentas de docentes.

## LECTOR DE TARJETAS
El lector (NFC o código de barras) se comportará como un teclado USB (HID): escribe el identificador y envía Enter. Implementa en la pantalla de "Registro de asistencia" un campo de texto con autofoco que capture ese identificador y lo envíe automáticamente al presionar Enter. Deja una opción de captura manual de matrícula como alternativa si el lector falla.

## REQUISITOS FUNCIONALES
- RF-1: Alta, consulta y modificación de alumnos con matrícula e identificador de tarjeta.
- RF-2: Registro de grupos y materias, y asignación de alumnos a cada grupo.
- RF-3: Lectura de la tarjeta y reconocimiento del alumno.
- RF-4: Guardar la asistencia con fecha y hora exactas.
- RF-5: Impedir registros duplicados del mismo alumno en la misma clase y avisar.
- RF-6: Mensaje claro si la tarjeta no está registrada o no pertenece al grupo.
- RF-7: Consulta de asistencia por grupo, materia, alumno y rango de fechas.
- RF-8: Generar y exportar reportes en PDF o Excel.
- RF-9: Usuario y contraseña para docentes y administrador antes de mostrar información.

## REQUISITOS NO FUNCIONALES
- RNF-1: Registrar una asistencia en menos de 2 segundos desde la lectura.
- RNF-2: Interfaz sencilla, usable sin capacitación.
- RNF-3: Contraseñas nunca en texto plano; acceso protegido.
- RNF-4: Almacenar solo datos mínimos del alumno (nombre, matrícula, grupo).
- RNF-5: Incluir un script de respaldo de la base de datos.
- RNF-6: Compatible con Chrome, Edge y Firefox.
- RNF-7: Código y base de datos documentados.

## FUERA DE ALCANCE (no lo implementes)
App móvil nativa, biometría, integración con el control escolar oficial, otros usos de la tarjeta (pagos, biblioteca, accesos), notificaciones automáticas y fabricación del lector.

## BASE DE DATOS
Diseña el modelo con al menos estas tablas: usuarios (docentes/admin, con rol), alumnos, grupos, materias, alumno_grupo, clases/sesiones (grupo, materia, docente, fecha, estado abierta/cerrada) y asistencias (alumno, sesión, fecha_hora). Agrega una restricción UNIQUE (alumno, sesión) para evitar duplicados. Incluye llaves foráneas, índices y datos de prueba.

## PANTALLAS
1. Login (docente/administrador)
2. Panel del administrador: CRUD de alumnos, grupos, materias y docentes
3. Panel del docente: abrir/cerrar sesión de clase
4. Pantalla de registro con lector: muestra nombre y matrícula del alumno, y mensajes de éxito, duplicado o tarjeta no registrada (con colores y sonido opcional)
5. Consulta de asistencia con filtros (grupo, materia, alumno, fechas) y porcentaje de asistencia
6. Exportación de reportes (PDF/Excel)

## SEGURIDAD
Consultas parametrizadas (evita inyección SQL), validación de datos en backend, control de acceso por rol, sesiones con expiración y credenciales en variables de entorno.

## FORMA DE TRABAJO
Trabaja por etapas y espera mi confirmación antes de pasar a la siguiente:
1. Estructura del proyecto y script SQL (esquema + datos de prueba).
2. Backend: conexión a BD, autenticación y roles.
3. API y módulo de gestión (alumnos, grupos, materias).
4. Módulo de lectura de tarjeta y registro de asistencia (con validación de duplicados y mensajes).
5. Consulta de asistencia y exportación a PDF/Excel.
6. Interfaz completa y estilos.
7. Casos de prueba (tabla con entrada, resultado esperado y resultado obtenido) y correcciones.
8. README con instalación, uso y manual de usuario breve.

En cada etapa entrégame: archivos completos listos para copiar, comandos para ejecutarlos y cómo probar que funciona. Si algo del enunciado es ambiguo, haz una suposición razonable y dímela.

Empieza con la etapa 1.

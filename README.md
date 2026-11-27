# Asistencia UTP

Sistema web para registrar la asistencia de alumnos con su **tarjeta universitaria** (NFC o código de barras).
Proyecto escolar de la Universidad Tecnológica de Parras.

El alumno pasa su tarjeta por el lector y el sistema guarda su matrícula, la fecha y la hora. El docente supervisa
el registro, consulta porcentajes y exporta reportes en PDF o Excel. El administrador da de alta alumnos, grupos,
materias y cuentas de docentes.

## Tecnologías

| Parte | Herramienta |
|---|---|
| Servidor | Node.js 18+ y Express 4 |
| Base de datos | MySQL / MariaDB (XAMPP) con `mysql2` y consultas parametrizadas |
| Vistas | Plantillas EJS, CSS y JavaScript sin frameworks |
| Autenticación | `express-session` (cookie con expiración) y contraseñas con `bcryptjs` |
| Reportes | `pdfkit` (PDF) y `exceljs` (Excel) |

Todo es software libre y gratuito; no se necesita ninguna licencia.

## Estructura

```
asistencia-utp/
├── app.js                  Punto de entrada del servidor
├── database/
│   ├── schema.sql          Tablas, llaves foráneas, índices y restricciones
│   └── seed.sql            Datos de prueba (ficticios)
├── scripts/
│   ├── init-db.js          Crea la BD y carga los datos de prueba
│   ├── backup.js           Respaldo con mysqldump
│   └── hash-password.js    Genera un hash bcrypt
├── src/
│   ├── config/db.js        Pool de conexiones MySQL
│   ├── middlewares/        Sesión requerida, roles, mensajes flash
│   ├── routes/             auth, admin, docente, consulta, reportes
│   ├── services/           Lógica de registro de asistencia y consultas
│   └── utils/              Validación y manejo de errores
├── views/                  Plantillas EJS (login, admin, docente, consulta)
├── public/                 CSS y JavaScript del navegador (lector, sonido)
├── docs/                   Plan, casos de prueba, diccionario de datos
└── backups/                Aquí se guardan los respaldos (no se suben a Git)
```

## Instalación

### 1. Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (`node -v`)
- [XAMPP](https://www.apachefriends.org/) (solo se usa MySQL)
- Chrome, Edge o Firefox

### 2. Encender MySQL

Abre el **panel de control de XAMPP** y presiona **Start** en la fila de **MySQL**.

### 3. Instalar dependencias y configurar

```bash
cd asistencia-utp
npm install
copy .env.example .env      # en PowerShell o CMD (en Git Bash: cp .env.example .env)
```

Abre `.env` y revisa los valores. Con XAMPP recién instalado, los valores por defecto funcionan
(usuario `root` sin contraseña). **Cambia `SESSION_SECRET`** por un texto largo cualquiera.

### 4. Crear la base de datos con datos de prueba

```bash
npm run db:init
```

> También puedes importar `database/schema.sql` y luego `database/seed.sql` desde phpMyAdmin
> (http://localhost/phpmyadmin → Importar).

### 5. Iniciar el sistema

```bash
npm start          # o "npm run dev" para que se reinicie al guardar cambios
```

Abre **http://localhost:3000**.

### Cuentas de prueba

Todas usan la contraseña **`Utp2026!`**

| Usuario | Rol | Materias asignadas |
|---|---|---|
| `admin` | Administrador | — |
| `jperez` | Docente | TI-1A Programación, TI-3B Bases de Datos |
| `mlopez` | Docente | TI-1A y MEC-2A Álgebra Lineal, TI-3B Inglés II |
| `rgarcia` | Docente | MEC-2A Electrónica Digital |

Tarjetas de prueba: los alumnos del 1 al 29 tienen tarjetas `04A1B2C301` a `04A1B2C329`
(TI-1A: 01-10, TI-3B: 11-20, MEC-2A: 21-29). El alumno `2026ME030` no tiene tarjeta (sirve para probar la captura manual).

## Uso con el lector de tarjetas

El lector se conecta por USB y **funciona como un teclado**: escribe el identificador de la tarjeta y presiona Enter.
No necesita drivers ni configuración.

- **Sin lector físico:** en la pantalla de registro escribe un ID de prueba (p. ej. `04A1B2C301`) y presiona Enter;
  es exactamente lo que haría el lector.
- **Lector de código de barras:** si la tarjeta trae la matrícula impresa como código de barras, el sistema la acepta tal cual.
- **Lector NFC:** registra en el alumno el UID que escribe el lector (en el formulario del alumno, haz clic en
  "ID de tarjeta" y pasa la tarjeta).

## Respaldo de la base de datos

```bash
npm run backup
```

Crea `backups/asistencia_utp_AAAA-MM-DD_HHMM.sql`. Si XAMPP no está en `C:\xampp`, ajusta `MYSQLDUMP_PATH` en `.env`.

Para restaurar: phpMyAdmin → base `asistencia_utp` → Importar → elegir el archivo, o
`C:\xampp\mysql\bin\mysql.exe -u root asistencia_utp < backups\archivo.sql`.

## Manual de usuario breve

### Administrador

1. **Grupos y Materias:** crea los grupos (p. ej. `TI-1A`) y las materias (clave y nombre).
2. **Docentes:** crea una cuenta para cada docente (usuario y contraseña de al menos 8 caracteres).
3. **Alumnos:** registra matrícula, nombre y tarjeta, y marca su grupo. Los alumnos no se borran: se dan de baja
   para conservar su historial.
4. **Asignaciones:** indica qué docente imparte qué materia en qué grupo. Sin asignación, el docente no puede abrir la clase.
5. **Consulta:** el administrador ve la asistencia de todos los grupos.

### Docente

1. Inicia sesión. En **Mis clases** aparecen tus materias asignadas.
2. Presiona **Abrir sesión** en la clase que vas a impartir. Se abre la pantalla de registro.
3. Los alumnos pasan su tarjeta. La pantalla muestra:
   - 🟩 **Verde:** asistencia registrada (nombre, matrícula y hora).
   - 🟨 **Amarillo:** el alumno ya se había registrado en esta clase (no se duplica).
   - 🟥 **Rojo:** tarjeta no registrada o el alumno no pertenece al grupo.
4. Si un alumno olvidó la tarjeta o el lector falla, cambia a **Captura manual** y escribe su matrícula.
5. Al terminar, presiona **Cerrar sesión de clase**. Solo puedes tener una sesión abierta a la vez.
6. En **Consulta** filtra por grupo, materia, alumno y fechas, y exporta a **PDF** o **Excel**.

### Alumno

Solo acerca o pasa tu tarjeta por el lector cuando el docente haya abierto la clase. No necesitas cuenta.

## Reglas del sistema (supuestos)

- **Porcentaje de asistencia** = asistencias ÷ sesiones de la materia en el rango de fechas elegido. Si el alumno no
  se registró en una sesión, cuenta como falta. Por debajo de 80 % se marca en rojo.
- No se manejan retardos: cualquier registro mientras la sesión está abierta cuenta como asistencia.
- La fecha y hora del registro las pone el servidor de MySQL (`NOW()`), no el navegador.
- Un docente solo ve y exporta la asistencia de sus propias sesiones.
- Las sesiones de Express se guardan en memoria: si reinicias el servidor, hay que volver a iniciar sesión.
  Para un proyecto escolar es suficiente; en producción se usaría un almacén persistente.

## Seguridad aplicada

- Consultas parametrizadas (`?`) en todo el código, contra inyección SQL.
- Contraseñas con bcrypt; nunca en texto plano.
- Control de acceso por rol en cada ruta (`requiereRol`).
- Sesión con cookie `httpOnly` y `sameSite=lax`; expira tras `SESSION_MINUTOS` de inactividad.
- Bloqueo de 5 minutos tras 5 intentos de login fallidos desde la misma IP.
- Validación de datos en el backend; las vistas escapan el HTML (`<%= %>`) contra XSS.
- Credenciales en `.env`, que no se sube a Git.
- Solo se guardan datos mínimos del alumno: matrícula, nombre, tarjeta y grupo.

## Documentación adicional

- [Plan de implementación](docs/plan-implementacion.md)
- [Diccionario de datos](docs/diccionario-datos.md)
- [Casos de prueba](docs/casos-de-prueba.md)

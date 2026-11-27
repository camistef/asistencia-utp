# Diccionario de datos — Asistencia UTP

Base de datos: `asistencia_utp` · Motor: InnoDB · Codificación: `utf8mb4`
Script: [`database/schema.sql`](../database/schema.sql)

## Diagrama entidad-relación

```
usuarios (docente/admin) 1───N asignaciones N───1 grupos 1───N alumno_grupo N───1 alumnos
        │                          │                │                                   │
        │                          N                │                                   │
        │                          1                │                                   │
        │                       materias            │                                   │
        │                          │                │                                   │
        1                          1                1                                   1
        └──────────N sesiones N────┴────────────────┘                                   │
                       1                                                                │
                       └──────────N asistencias N───────────────────────────────────────┘
                                  UNIQUE (alumno_id, sesion_id)
```

## usuarios
Cuentas que inician sesión: docentes y administradores.

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| nombre | VARCHAR(100) | No | Nombre completo |
| usuario | VARCHAR(50) UNIQUE | No | Nombre para iniciar sesión (minúsculas) |
| password_hash | VARCHAR(100) | No | Hash bcrypt de la contraseña (nunca en texto plano) |
| rol | ENUM('admin','docente') | No | Rol de acceso |
| activo | TINYINT(1) | No | 1 = puede entrar, 0 = desactivada |
| creado_en | DATETIME | No | Fecha de alta |

## alumnos
Solo datos mínimos (RNF-4).

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| matricula | VARCHAR(20) UNIQUE | No | Matrícula escolar |
| nombre | VARCHAR(120) | No | Nombre completo |
| id_tarjeta | VARCHAR(64) UNIQUE | Sí | Código que escribe el lector (UID NFC o código de barras). NULL = sin tarjeta |
| activo | TINYINT(1) | No | 0 = dado de baja (se conserva el historial) |
| creado_en | DATETIME | No | Fecha de alta |

## grupos

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| nombre | VARCHAR(30) UNIQUE | No | Ej. `TI-1A` |
| carrera | VARCHAR(100) | No | Nombre de la carrera |
| cuatrimestre | TINYINT UNSIGNED | No | 1 a 11 (CHECK) |

## materias

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| clave | VARCHAR(20) UNIQUE | No | Ej. `PRG-101` |
| nombre | VARCHAR(100) | No | Nombre de la materia |

## alumno_grupo
Relación muchos a muchos entre alumnos y grupos.

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| alumno_id | INT UNSIGNED PK, FK → alumnos.id | No | Alumno (ON DELETE CASCADE) |
| grupo_id | INT UNSIGNED PK, FK → grupos.id | No | Grupo (ON DELETE CASCADE) |

Índice adicional: `idx_ag_grupo (grupo_id)` para listar rápido los alumnos de un grupo.

## asignaciones
Qué docente imparte qué materia en qué grupo.

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| docente_id | INT UNSIGNED FK → usuarios.id | No | Docente |
| grupo_id | INT UNSIGNED FK → grupos.id | No | Grupo |
| materia_id | INT UNSIGNED FK → materias.id | No | Materia |

Restricción: `UNIQUE (grupo_id, materia_id)`, una materia tiene un solo docente por grupo.

## sesiones
Cada clase impartida.

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| grupo_id | INT UNSIGNED FK → grupos.id | No | Grupo |
| materia_id | INT UNSIGNED FK → materias.id | No | Materia |
| docente_id | INT UNSIGNED FK → usuarios.id | No | Docente que abrió la sesión |
| fecha_inicio | DATETIME | No | Apertura |
| fecha_fin | DATETIME | Sí | Cierre (NULL mientras está abierta) |
| estado | ENUM('abierta','cerrada') | No | Solo se registran asistencias si está abierta |

Índices: `(grupo_id, materia_id, fecha_inicio)` para las consultas por rango y `(docente_id, estado)` para encontrar la sesión abierta.

## asistencias

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| id | INT UNSIGNED PK AI | No | Identificador |
| alumno_id | INT UNSIGNED FK → alumnos.id | No | Alumno |
| sesion_id | INT UNSIGNED FK → sesiones.id | No | Sesión (ON DELETE CASCADE) |
| fecha_hora | DATETIME | No | Momento exacto del registro (lo asigna MySQL con NOW()) |
| metodo | ENUM('tarjeta','manual') | No | Cómo se registró |

Restricción clave: **`UNIQUE (alumno_id, sesion_id)`**. La base de datos rechaza un segundo registro del mismo alumno
en la misma sesión (RF-5); el sistema detecta el error `ER_DUP_ENTRY` y muestra el aviso de duplicado.

## Políticas de borrado

- Alumnos y cuentas **no se borran**, se desactivan, para no perder el historial.
- Grupos y materias solo se eliminan si no tienen sesiones ni asignaciones (`ON DELETE RESTRICT`).

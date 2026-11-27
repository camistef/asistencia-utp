-- =====================================================================
--  Asistencia UTP - Esquema de base de datos
--  Compatible con MySQL 5.7+/8.x y MariaDB 10.4+ (XAMPP)
--  Ejecutar:  mysql -u root < database/schema.sql
--  ADVERTENCIA: borra y vuelve a crear la base "asistencia_utp".
-- =====================================================================

DROP DATABASE IF EXISTS asistencia_utp;
CREATE DATABASE asistencia_utp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asistencia_utp;

-- ---------------------------------------------------------------------
-- usuarios: cuentas que inician sesión (docentes y administradores).
-- La contraseña se guarda SOLO como hash bcrypt (RNF-3).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  usuario        VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(100) NOT NULL,
  rol            ENUM('admin','docente') NOT NULL DEFAULT 'docente',
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_usuario UNIQUE (usuario)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- alumnos: solo datos mínimos (RNF-4): matrícula, nombre e id de tarjeta.
-- El grupo se obtiene de la tabla alumno_grupo.
-- id_tarjeta puede ser NULL si al alumno aún no se le asigna tarjeta.
-- ---------------------------------------------------------------------
CREATE TABLE alumnos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula   VARCHAR(20)  NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  id_tarjeta  VARCHAR(64)  NULL,
  activo      TINYINT(1) NOT NULL DEFAULT 1,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_alumnos_matricula UNIQUE (matricula),
  CONSTRAINT uq_alumnos_tarjeta   UNIQUE (id_tarjeta)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- grupos: p. ej. "TI-1A" (carrera + cuatrimestre + letra)
-- ---------------------------------------------------------------------
CREATE TABLE grupos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(30)  NOT NULL,
  carrera       VARCHAR(100) NOT NULL,
  cuatrimestre  TINYINT UNSIGNED NOT NULL,
  CONSTRAINT uq_grupos_nombre UNIQUE (nombre),
  CONSTRAINT ck_grupos_cuatri CHECK (cuatrimestre BETWEEN 1 AND 11)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- materias
-- ---------------------------------------------------------------------
CREATE TABLE materias (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave   VARCHAR(20)  NOT NULL,
  nombre  VARCHAR(100) NOT NULL,
  CONSTRAINT uq_materias_clave UNIQUE (clave)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- alumno_grupo: relación muchos a muchos alumno <-> grupo (RF-2)
-- ---------------------------------------------------------------------
CREATE TABLE alumno_grupo (
  alumno_id  INT UNSIGNED NOT NULL,
  grupo_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (alumno_id, grupo_id),
  INDEX idx_ag_grupo (grupo_id),
  CONSTRAINT fk_ag_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  CONSTRAINT fk_ag_grupo  FOREIGN KEY (grupo_id)  REFERENCES grupos(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- asignaciones: qué docente imparte qué materia a qué grupo.
-- Un docente solo puede abrir sesiones de sus asignaciones.
-- Una materia en un grupo tiene un solo docente (UNIQUE grupo+materia).
-- ---------------------------------------------------------------------
CREATE TABLE asignaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  docente_id  INT UNSIGNED NOT NULL,
  grupo_id    INT UNSIGNED NOT NULL,
  materia_id  INT UNSIGNED NOT NULL,
  CONSTRAINT uq_asig_grupo_materia UNIQUE (grupo_id, materia_id),
  INDEX idx_asig_docente (docente_id),
  CONSTRAINT fk_asig_docente FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asig_grupo   FOREIGN KEY (grupo_id)   REFERENCES grupos(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_asig_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- sesiones: cada clase impartida (grupo, materia, docente, fecha, estado)
-- ---------------------------------------------------------------------
CREATE TABLE sesiones (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grupo_id      INT UNSIGNED NOT NULL,
  materia_id    INT UNSIGNED NOT NULL,
  docente_id    INT UNSIGNED NOT NULL,
  fecha_inicio  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin     DATETIME NULL,
  estado        ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  INDEX idx_ses_grupo_materia_fecha (grupo_id, materia_id, fecha_inicio),
  INDEX idx_ses_docente_estado (docente_id, estado),
  CONSTRAINT fk_ses_grupo   FOREIGN KEY (grupo_id)   REFERENCES grupos(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_ses_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ses_docente FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- asistencias: un registro por alumno por sesión.
-- UNIQUE (alumno_id, sesion_id) impide duplicados (RF-5).
-- metodo: 'tarjeta' (lector) o 'manual' (captura de matrícula).
-- ---------------------------------------------------------------------
CREATE TABLE asistencias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id   INT UNSIGNED NOT NULL,
  sesion_id   INT UNSIGNED NOT NULL,
  fecha_hora  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo      ENUM('tarjeta','manual') NOT NULL DEFAULT 'tarjeta',
  CONSTRAINT uq_asistencia_alumno_sesion UNIQUE (alumno_id, sesion_id),
  INDEX idx_asis_sesion (sesion_id),
  INDEX idx_asis_fecha (fecha_hora),
  CONSTRAINT fk_asis_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_asis_sesion FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

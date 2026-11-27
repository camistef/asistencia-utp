-- =====================================================================
--  Asistencia UTP - Datos de prueba (TODOS FICTICIOS)
--  Ejecutar DESPUÉS de schema.sql:  mysql -u root < database/seed.sql
--
--  Contraseña de TODAS las cuentas de prueba:  Utp2026!
--    admin      -> Administrador
--    jperez     -> Docente (Programación y Bases de Datos)
--    mlopez     -> Docente (Matemáticas e Inglés)
--    rgarcia    -> Docente (Electrónica)
-- =====================================================================
USE asistencia_utp;

-- ---------- Usuarios (hash bcrypt de "Utp2026!") ----------
INSERT INTO usuarios (id, nombre, usuario, password_hash, rol) VALUES
(1, 'Administrador del Sistema', 'admin',   '$2a$10$aJxDmqL7Lqsdn7P6gxx4penC2gOSQQl5t1Y46NumHQ0J/z8GRXnfO', 'admin'),
(2, 'Juan Pérez Morales',        'jperez',  '$2a$10$aJxDmqL7Lqsdn7P6gxx4penC2gOSQQl5t1Y46NumHQ0J/z8GRXnfO', 'docente'),
(3, 'María López Treviño',       'mlopez',  '$2a$10$aJxDmqL7Lqsdn7P6gxx4penC2gOSQQl5t1Y46NumHQ0J/z8GRXnfO', 'docente'),
(4, 'Roberto García Saucedo',    'rgarcia', '$2a$10$aJxDmqL7Lqsdn7P6gxx4penC2gOSQQl5t1Y46NumHQ0J/z8GRXnfO', 'docente');

-- ---------- Grupos ----------
INSERT INTO grupos (id, nombre, carrera, cuatrimestre) VALUES
(1, 'TI-1A',  'Tecnologías de la Información', 1),
(2, 'TI-3B',  'Tecnologías de la Información', 3),
(3, 'MEC-2A', 'Mecatrónica', 2);

-- ---------- Materias ----------
INSERT INTO materias (id, clave, nombre) VALUES
(1, 'PRG-101', 'Fundamentos de Programación'),
(2, 'BD-301',  'Bases de Datos'),
(3, 'MAT-101', 'Álgebra Lineal'),
(4, 'ING-102', 'Inglés II'),
(5, 'ELE-201', 'Electrónica Digital');

-- ---------- Alumnos (30) ----------
-- id_tarjeta: identificador que "escribe" el lector. En las tarjetas con
-- código de barras suele ser la matrícula; aquí usamos un UID tipo NFC.
INSERT INTO alumnos (id, matricula, nombre, id_tarjeta) VALUES
(1,  '2026TI001', 'Ana Sofía Martínez Ruiz',     '04A1B2C301'),
(2,  '2026TI002', 'Luis Fernando Cárdenas Gil',  '04A1B2C302'),
(3,  '2026TI003', 'Valeria Hernández Soto',      '04A1B2C303'),
(4,  '2026TI004', 'Diego Alejandro Ramos Vega',  '04A1B2C304'),
(5,  '2026TI005', 'Camila Torres Esquivel',      '04A1B2C305'),
(6,  '2026TI006', 'José Manuel Ortiz Leal',      '04A1B2C306'),
(7,  '2026TI007', 'Ximena Flores Aguirre',       '04A1B2C307'),
(8,  '2026TI008', 'Carlos Iván Méndez Rocha',    '04A1B2C308'),
(9,  '2026TI009', 'Fernanda Castillo Ibarra',    '04A1B2C309'),
(10, '2026TI010', 'Emiliano Rivas Contreras',    '04A1B2C310'),
(11, '2025TI011', 'Daniela Guzmán Peña',         '04A1B2C311'),
(12, '2025TI012', 'Ricardo Salinas Montes',      '04A1B2C312'),
(13, '2025TI013', 'Paola Navarro Cruz',          '04A1B2C313'),
(14, '2025TI014', 'Andrés Medina Lozano',        '04A1B2C314'),
(15, '2025TI015', 'Regina Delgado Fuentes',      '04A1B2C315'),
(16, '2025TI016', 'Sebastián Morales Treviño',   '04A1B2C316'),
(17, '2025TI017', 'Natalia Rangel Sáenz',        '04A1B2C317'),
(18, '2025TI018', 'Miguel Ángel Herrera Villa',  '04A1B2C318'),
(19, '2025TI019', 'Mariana Ochoa Cepeda',        '04A1B2C319'),
(20, '2025TI020', 'Jorge Luis Valdés Zamora',    '04A1B2C320'),
(21, '2026ME021', 'Itzel Barrera Galindo',       '04A1B2C321'),
(22, '2026ME022', 'Kevin Alonso Duarte',         '04A1B2C322'),
(23, '2026ME023', 'Renata Cisneros Luna',        '04A1B2C323'),
(24, '2026ME024', 'Óscar Iván Padilla Reyes',    '04A1B2C324'),
(25, '2026ME025', 'Alejandra Montoya Silva',     '04A1B2C325'),
(26, '2026ME026', 'Bruno Esparza Quintero',      '04A1B2C326'),
(27, '2026ME027', 'Sofía Arredondo Campos',      '04A1B2C327'),
(28, '2026ME028', 'Hugo Benavides Tapia',        '04A1B2C328'),
(29, '2026ME029', 'Lucía Garza Mireles',         '04A1B2C329'),
(30, '2026ME030', 'Mateo Villarreal Olivo',      NULL);  -- alumno sin tarjeta (usa captura manual)

-- ---------- Alumnos por grupo (10 por grupo) ----------
INSERT INTO alumno_grupo (alumno_id, grupo_id)
SELECT id, CASE WHEN id <= 10 THEN 1 WHEN id <= 20 THEN 2 ELSE 3 END FROM alumnos;

-- ---------- Asignaciones docente - grupo - materia ----------
INSERT INTO asignaciones (docente_id, grupo_id, materia_id) VALUES
(2, 1, 1),  -- Juan Pérez:  TI-1A  Fundamentos de Programación
(2, 2, 2),  -- Juan Pérez:  TI-3B  Bases de Datos
(3, 1, 3),  -- María López: TI-1A  Álgebra Lineal
(3, 2, 4),  -- María López: TI-3B  Inglés II
(3, 3, 3),  -- María López: MEC-2A Álgebra Lineal
(4, 3, 5);  -- Roberto García: MEC-2A Electrónica Digital

-- ---------- Historial: 6 sesiones cerradas por asignación ----------
-- Se generan en días anteriores a la fecha de instalación,
-- para que las consultas y reportes tengan datos al instalar.
INSERT INTO sesiones (grupo_id, materia_id, docente_id, fecha_inicio, fecha_fin, estado)
SELECT a.grupo_id, a.materia_id, a.docente_id,
       TIMESTAMP(CURDATE() - INTERVAL d.n DAY, '08:00:00') + INTERVAL (a.id - 1) HOUR,
       TIMESTAMP(CURDATE() - INTERVAL d.n DAY, '08:50:00') + INTERVAL (a.id - 1) HOUR,
       'cerrada'
FROM asignaciones a
CROSS JOIN (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) d;

-- ---------- Asistencias del historial (~80 % de asistencia) ----------
-- La condición con módulo "salta" de forma determinista a algunos alumnos
-- para simular faltas. Se registra entre el minuto 1 y 9 de la clase.
INSERT INTO asistencias (alumno_id, sesion_id, fecha_hora, metodo)
SELECT ag.alumno_id, s.id,
       s.fecha_inicio + INTERVAL ((ag.alumno_id + s.id) % 9 + 1) MINUTE,
       IF(al.id_tarjeta IS NULL, 'manual', 'tarjeta')
FROM sesiones s
JOIN alumno_grupo ag ON ag.grupo_id = s.grupo_id
JOIN alumnos al      ON al.id = ag.alumno_id
WHERE (ag.alumno_id * 7 + s.id * 3) % 5 <> 0;

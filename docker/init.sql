-- Tabla USUARIO (para creación de usuarios e inicio de sesión)
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    es_vip BOOLEAN DEFAULT FALSE,
    reservas_totales INTEGER DEFAULT 0,
    verificado BOOLEAN DEFAULT FALSE,
    token_verificacion VARCHAR(255)
);

-- Tabla VUELO (rutas disponibles con precios fijos)
CREATE TABLE vuelo (
    id SERIAL PRIMARY KEY,
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    tipo_vuelo VARCHAR(20) CHECK (tipo_vuelo IN ('ida', 'ida_vuelta')),
    precio_base DECIMAL(10,2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla ASIENTO (mapa de asientos del avión)
CREATE TABLE asiento (
    id SERIAL PRIMARY KEY,
    numero_asiento VARCHAR(10) UNIQUE NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('negocios', 'economico')),
    precio_base DECIMAL(10,2) NOT NULL,
    ocupado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla RESERVA (para las reservas de usuarios)
CREATE TABLE reserva (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id),
    vuelo_id INTEGER REFERENCES vuelo(id),
    fecha_salida DATE NOT NULL,
    fecha_regreso DATE,
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'modificada', 'cancelada')),
    precio_total DECIMAL(10,2) NOT NULL,
    metodo_seleccion VARCHAR(20) CHECK (metodo_seleccion IN ('manual', 'automatico', 'aleatorio')),
    cantidad_pasajeros INTEGER NOT NULL
);

-- Tabla PASAJERO (datos de cada pasajero)
CREATE TABLE pasajero (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER REFERENCES reserva(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    cui VARCHAR(20) NOT NULL,
    departamento VARCHAR(100),
    municipio VARCHAR(100),
    tipo_asiento VARCHAR(20) CHECK (tipo_asiento IN ('negocios', 'economico')),
    numero_asiento VARCHAR(10) NOT NULL,
    tiene_equipaje BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DATOS INICIALES ESENCIALES
-- =============================================

-- Insertar TODOS los asientos del avión (63 asientos totales)
INSERT INTO asiento (numero_asiento, tipo, precio_base) VALUES
-- Clase Negocios - Filas A-B (14 asientos)
('A1', 'negocios', 1500.00), ('A2', 'negocios', 1500.00), ('A3', 'negocios', 1500.00), ('A4', 'negocios', 1500.00), ('A5', 'negocios', 1500.00), ('A6', 'negocios', 1500.00), ('A7', 'negocios', 1500.00),
('B1', 'negocios', 1500.00), ('B2', 'negocios', 1500.00), ('B3', 'negocios', 1500.00), ('B4', 'negocios', 1500.00), ('B5', 'negocios', 1500.00), ('B6', 'negocios', 1500.00), ('B7', 'negocios', 1500.00),

-- Clase Económica - Filas C-I (49 asientos)
('C1', 'economico', 800.00), ('C2', 'economico', 800.00), ('C3', 'economico', 800.00), ('C4', 'economico', 800.00), ('C5', 'economico', 800.00), ('C6', 'economico', 800.00), ('C7', 'economico', 800.00),
('D1', 'economico', 800.00), ('D2', 'economico', 800.00), ('D3', 'economico', 800.00), ('D4', 'economico', 800.00), ('D5', 'economico', 800.00), ('D6', 'economico', 800.00), ('D7', 'economico', 800.00),
('E1', 'economico', 800.00), ('E2', 'economico', 800.00), ('E3', 'economico', 800.00), ('E4', 'economico', 800.00), ('E5', 'economico', 800.00), ('E6', 'economico', 800.00), ('E7', 'economico', 800.00),
('F1', 'economico', 800.00), ('F2', 'economico', 800.00), ('F3', 'economico', 800.00), ('F4', 'economico', 800.00), ('F5', 'economico', 800.00), ('F6', 'economico', 800.00), ('F7', 'economico', 800.00),
('G1', 'economico', 800.00), ('G2', 'economico', 800.00), ('G3', 'economico', 800.00), ('G4', 'economico', 800.00), ('G5', 'economico', 800.00), ('G6', 'economico', 800.00), ('G7', 'economico', 800.00),
('H1', 'economico', 800.00), ('H2', 'economico', 800.00), ('H3', 'economico', 800.00), ('H4', 'economico', 800.00), ('H5', 'economico', 800.00), ('H6', 'economico', 800.00), ('H7', 'economico', 800.00),
('I1', 'economico', 800.00), ('I2', 'economico', 800.00), ('I3', 'economico', 800.00), ('I4', 'economico', 800.00), ('I5', 'economico', 800.00), ('I6', 'economico', 800.00), ('I7', 'economico', 800.00);

-- Insertar rutas disponibles - Precios fijos por ruta y tipo
INSERT INTO vuelo (origen, destino, tipo_vuelo, precio_base) VALUES
-- Vuelos SOLO IDA
('Ciudad de Guatemala (GUA)', 'Flores, Petén (FRS)', 'ida', 800.00),
('Ciudad de Guatemala (GUA)', 'San Salvador (SAL)', 'ida', 850.00),
('Ciudad de Guatemala (GUA)', 'San José, Costa Rica (SJO)', 'ida', 1000.00),
('Ciudad de Guatemala (GUA)', 'Cancún, México (CUN)', 'ida', 1200.00),
('Ciudad de Guatemala (GUA)', 'Ciudad de México (MEX)', 'ida', 1100.00),
('Ciudad de Guatemala (GUA)', 'Alaska (AK)', 'ida', 1500.00),
('Ciudad de Guatemala (GUA)', 'Brasil, Janeiro (BR)', 'ida', 1300.00),

-- Vuelos IDA Y VUELTA (precio por persona por trayecto)
('Ciudad de Guatemala (GUA)', 'Flores, Petén (FRS)', 'ida_vuelta', 800.00),
('Ciudad de Guatemala (GUA)', 'San Salvador (SAL)', 'ida_vuelta', 850.00),
('Ciudad de Guatemala (GUA)', 'San José, Costa Rica (SJO)', 'ida_vuelta', 1000.00),
('Ciudad de Guatemala (GUA)', 'Cancún, México (CUN)', 'ida_vuelta', 1200.00),
('Ciudad de Guatemala (GUA)', 'Ciudad de México (MEX)', 'ida_vuelta', 1100.00),
('Ciudad de Guatemala (GUA)', 'Alaska (AK)', 'ida_vuelta', 1500.00),
('Ciudad de Guatemala (GUA)', 'Brasil, Janeiro (BR)', 'ida_vuelta', 1300.00);

-- =============================================
-- ÍNDICES PARA MEJOR PERFORMANCE
-- =============================================

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_reserva_usuario_id ON reserva(usuario_id);
CREATE INDEX idx_pasajero_reserva_id ON pasajero(reserva_id);
CREATE INDEX idx_asiento_numero ON asiento(numero_asiento);
CREATE INDEX idx_asiento_ocupado ON asiento(ocupado) WHERE ocupado = false;
CREATE INDEX idx_vuelo_origen_destino ON vuelo(origen, destino);


DO $$ 
BEGIN
    RAISE NOTICE '✅ Base de datos AeroPusRiva inicializada correctamente';
    RAISE NOTICE '📊 Tablas creadas: usuario, vuelo, asiento, reserva, pasajero';
    RAISE NOTICE '💺 Asientos insertados: 63 asientos (14 negocios + 49 económico)';
    RAISE NOTICE '✈️  Rutas configuradas: 7 destinos × 2 tipos de vuelo = 14 rutas';
    RAISE NOTICE '💰 Precios fijos: Mismo precio sin importar fecha';
END $$;           
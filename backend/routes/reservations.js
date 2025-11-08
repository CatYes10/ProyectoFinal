const express = require('express');
const pool = require('../config/database');
const authenticateSession = require('../middleware/auth');
const xml2js = require('xml2js');

const router = express.Router();

// CREAR NUEVA RESERVA
router.post('/', authenticateSession, async (req, res) => {
  try {
    const { 
      vuelo_id, 
      fecha_salida, 
      fecha_regreso, 
      pasajeros, 
      metodo_seleccion,
      asientos_seleccionados 
    } = req.body;

    const usuario_id = req.user.userId;

    // Validaciones básicas
    if (!vuelo_id || !fecha_salida || !pasajeros || !Array.isArray(pasajeros) || pasajeros.length === 0) {
      return res.status(400).json({ error: 'Datos de reserva incompletos' });
    }

    // Verificar que el vuelo existe
    const vuelo = await pool.query(
      'SELECT * FROM vuelo WHERE id = $1 AND activo = true',
      [vuelo_id]
    );

    if (vuelo.rows.length === 0) {
      return res.status(400).json({ error: 'Vuelo no encontrado' });
    }


for (const asiento of asientos_seleccionados) {
  const asientoDisponible = await pool.query(
    `SELECT a.* 
     FROM asiento a
     WHERE a.numero_asiento = $1 
     AND NOT EXISTS (
       SELECT 1 FROM pasajero p 
       JOIN reserva r ON p.reserva_id = r.id 
       JOIN vuelo v ON r.vuelo_id = v.id
       WHERE p.numero_asiento = a.numero_asiento 
       AND r.fecha_salida = $2 
       AND v.destino = $3
     )`,  
    [asiento, fecha_salida, vuelo.rows[0].destino]
  );

  if (asientoDisponible.rows.length === 0) {
    return res.status(400).json({ error: `El asiento ${asiento} no está disponible para ${vuelo.rows[0].destino} en la fecha ${fecha_salida}` });
  }
}

    // Calcular precio total
    let precioTotal = 0;
    const detallesPasajeros = [];

    for (let i = 0; i < pasajeros.length; i++) {
      const pasajero = pasajeros[i];
      const asiento = asientos_seleccionados[i];
      
      // Validar CUI 
      if (!/^\d{13}$/.test(pasajero.cui)) {
        return res.status(400).json({ error: `CUI inválido para ${pasajero.nombre}. Debe tener 13 dígitos.` });
      }

      // Obtener información del asiento
      const asientoInfo = await pool.query(
        'SELECT tipo, precio_base FROM asiento WHERE numero_asiento = $1',
        [asiento]
      );

      if (asientoInfo.rows.length === 0) {
        return res.status(400).json({ error: `Asiento ${asiento} no válido` });
      }

      let precioPasajero = asientoInfo.rows[0].precio_base;
      
      // Recargo por equipaje
      if (pasajero.tiene_equipaje) {
        precioPasajero += 100; // Q100 adicional por equipaje
      }

      // Si es vuelo ida y vuelta, duplicar precio
      if (vuelo.rows[0].tipo_vuelo === 'ida_vuelta') {
        precioPasajero *= 2;
      }

      precioTotal = Number(precioTotal) + Number(precioPasajero);

      detallesPasajeros.push({
        nombre_completo: pasajero.nombre,
        cui: pasajero.cui,
        departamento: pasajero.departamento,
        municipio: pasajero.municipio,
        asiento: asiento,
        tipo_asiento: asientoInfo.rows[0].tipo,
        tiene_equipaje: pasajero.tiene_equipaje,
        precio_final: precioPasajero
      });
    }

    // Aplicar descuento VIP si corresponde
    const usuario = await pool.query(
      'SELECT es_vip FROM usuario WHERE id = $1',
      [usuario_id]
    );

    if (usuario.rows[0].es_vip) {
      precioTotal *= 0.9; // 10% de descuento
    }

    // INICIAR TRANSACCIÓN
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Crear la reserva principal
      const reservaResult = await client.query(
        `INSERT INTO reserva (
          usuario_id, vuelo_id, fecha_salida, fecha_regreso, 
          precio_total, metodo_seleccion, cantidad_pasajeros
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          usuario_id, vuelo_id, fecha_salida, fecha_regreso,
          precioTotal, metodo_seleccion, pasajeros.length
        ]
      );

      const reserva_id = reservaResult.rows[0].id;

      // 2. Crear registros de pasajeros y marcar asientos como ocupados
      for (const detalle of detallesPasajeros) {
        // Insertar pasajero
        await client.query(
          `INSERT INTO pasajero (
            reserva_id, nombre_completo, cui, departamento, municipio,
            tipo_asiento, numero_asiento, tiene_equipaje
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            reserva_id, detalle.nombre_completo, detalle.cui, detalle.departamento,
            detalle.municipio, detalle.tipo_asiento, detalle.asiento,
            detalle.tiene_equipaje
          ]
        );
       
      }

      // 3. Actualizar contador de reservas del usuario
      await client.query(
        'UPDATE usuario SET reservas_totales = reservas_totales + 1 WHERE id = $1',
        [usuario_id]
      );

      // 4. Verificar si el usuario se convierte en VIP
      const usuarioActualizado = await client.query(
        'SELECT reservas_totales FROM usuario WHERE id = $1',
        [usuario_id]
      );

      if (usuarioActualizado.rows[0].reservas_totales >= 5) {
        await client.query(
          'UPDATE usuario SET es_vip = true WHERE id = $1',
          [usuario_id]
        );
      }

      await client.query('COMMIT');

      // Obtener la reserva completa para la respuesta
      const reservaCompleta = await pool.query(
        `SELECT r.*, u.email, v.origen, v.destino, v.tipo_vuelo
         FROM reserva r
         JOIN usuario u ON r.usuario_id = u.id
         JOIN vuelo v ON r.vuelo_id = v.id
         WHERE r.id = $1`,
        [reserva_id]
      );

      const pasajerosReserva = await pool.query(
        'SELECT * FROM pasajero WHERE reserva_id = $1',
        [reserva_id]
      );

      res.status(201).json({
        message: 'Reserva creada exitosamente',
        reserva: {
          ...reservaCompleta.rows[0],
          pasajeros: pasajerosReserva.rows
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creando reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear reserva' });
  }
});


// OBTENER ASIENTOS OCUPADOS REALES
router.get('/reportes/asientos-ocupados', authenticateSession, async (req, res) => {
  try {
    console.log('📊 Obteniendo asientos ocupados reales...');
    
    const result = await pool.query(`
      SELECT DISTINCT p.numero_asiento 
      FROM pasajero p
      JOIN reserva r ON p.reserva_id = r.id
      WHERE r.id IS NOT NULL
      ORDER BY p.numero_asiento
    `);
    
    const asientosOcupados = result.rows.map(row => row.numero_asiento);
    
    console.log('✅ Asientos ocupados encontrados:', asientosOcupados);
    
    res.json({
      success: true,
      data: asientosOcupados
    });

  } catch (error) {
    console.error('❌ Error obteniendo asientos ocupados:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});
// OBTENER ASIENTOS OCUPADOS POR FECHA ESPECÍFICA
router.get('/reportes/asientos-ocupados/:fecha', authenticateSession, async (req, res) => {
  try {
    const { fecha } = req.params;
    console.log(`📊 Obteniendo asientos ocupados para fecha: ${fecha}`);
    
    const result = await pool.query(`
      SELECT DISTINCT p.numero_asiento 
      FROM pasajero p
      JOIN reserva r ON p.reserva_id = r.id
      WHERE DATE(r.fecha_reserva) = $1
      ORDER BY p.numero_asiento
    `, [fecha]);
    
    const asientosOcupados = result.rows.map(row => row.numero_asiento);
    
    console.log(`✅ Asientos ocupados para ${fecha}:`, asientosOcupados);
    
    res.json({
      success: true,
      data: asientosOcupados
    });

  } catch (error) {
    console.error('❌ Error obteniendo asientos ocupados por fecha:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});


// CARGAR XML - VERSIÓN CORREGIDA CON VALORES VÁLIDOS
router.post('/cargar-xml', authenticateSession, async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📥 === INICIO CARGA XML (VERSIÓN CORREGIDA) ===');
    
    if (!req.files || !req.files.xmlFile) {
      return res.status(400).json({
        success: false,
        error: 'No se envió ningún archivo XML'
      });
    }

    const xmlFile = req.files.xmlFile;
    const xmlContent = xmlFile.data.toString('utf8');
    
    console.log('📄 Contenido XML recibido:', xmlContent.substring(0, 500));

    // Parsear XML
    const { parseString } = require('xml2js');
    
    const resultados = await new Promise((resolve, reject) => {
      parseString(xmlContent, (err, result) => {
        if (err) {
          reject(new Error('Error parseando XML: ' + err.message));
        } else {
          resolve(result);
        }
      });
    });

    // Validar estructura del XML
    let reservations = [];
    
    if (resultados.reservations && resultados.reservations.reservation) {
      console.log('✅ Estructura detectada: <reservations><reservation>');
      reservations = Array.isArray(resultados.reservations.reservation) 
        ? resultados.reservations.reservation 
        : [resultados.reservations.reservation];
    } else if (resultados.flightReservation && resultados.flightReservation.flightSeat) {
      console.log('✅ Estructura detectada: <flightReservation><flightSeat>');
      reservations = Array.isArray(resultados.flightReservation.flightSeat)
        ? resultados.flightReservation.flightSeat
        : [resultados.flightReservation.flightSeat];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Estructura XML no reconocida'
      });
    }

    console.log(`📊 Procesando ${reservations.length} reservas del XML`);

    // 🔥 VALOR CORRECTO - 'manual' es válido según la constraint
    const metodoSeleccion = 'manual';
    console.log(`🎯 Usando método válido: ${metodoSeleccion}`);

    const resultadosCarga = {
      exitosos: 0,
      errores: 0,
      detallesErrores: [],
      asientosCargados: []
    };

    // Procesar cada reserva
    for (let i = 0; i < reservations.length; i++) {
      const reservationData = reservations[i];
      
      try {
        // Validar campos requeridos
        const camposRequeridos = ['seatNumber', 'passengerName', 'user', 'idNumber', 'hasLuggage', 'reservationDate'];
        const camposFaltantes = camposRequeridos.filter(campo => !reservationData[campo] || !reservationData[campo][0]);
        
        if (camposFaltantes.length > 0) {
          throw new Error(`Campos faltantes: ${camposFaltantes.join(', ')}`);
        }

        const seatNumber = reservationData.seatNumber[0].trim();
        const passengerName = reservationData.passengerName[0].trim();
        const userEmail = reservationData.user[0].trim();
        const idNumber = reservationData.idNumber[0].trim();
        const hasLuggage = reservationData.hasLuggage[0].toString().toLowerCase() === 'true';
        const reservationDate = reservationData.reservationDate[0].trim();

        console.log(`🔧 Procesando: ${seatNumber} - ${passengerName}`);

        // Validar formato de asiento
        if (!/^[A-Z][1-9][0-9]?$/.test(seatNumber)) {
          throw new Error(`Formato de asiento inválido: ${seatNumber}`);
        }

        // Validar CUI (13 dígitos)
        if (!/^\d{13}$/.test(idNumber)) {
          throw new Error(`CUI inválido: ${idNumber}`);
        }

        // Parsear fecha (formato DD/MM/YYYY HH:MI)
        const [datePart, timePart] = reservationDate.split(' ');
        const [day, month, year] = datePart.split('/');
        const fechaReserva = new Date(`${year}-${month}-${day}T${timePart}:00`);
        
        if (isNaN(fechaReserva.getTime())) {
          throw new Error(`Fecha inválida: ${reservationDate}`);
        }

        // Verificar si el asiento ya está ocupado
        const asientoOcupado = await pool.query(
          `SELECT 1 FROM pasajero WHERE numero_asiento = $1 AND reserva_id IS NOT NULL`,
          [seatNumber]
        );

        if (asientoOcupado.rows.length > 0) {
          throw new Error(`Asiento ${seatNumber} ya está ocupado`);
        }

        // Buscar usuario por email
        const usuario = await pool.query(
          'SELECT id, email FROM usuario WHERE email = $1',
          [userEmail]
        );

        let usuarioId;
        if (usuario.rows.length === 0) {
          // Crear usuario con password temporal
          const bcrypt = require('bcrypt');
          const passwordTemporal = await bcrypt.hash('temp123456', 10);
          
          const nuevoUsuario = await pool.query(
            `INSERT INTO usuario (email, password, reservas_totales, es_vip) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userEmail, passwordTemporal, 0, false]
          );
          usuarioId = nuevoUsuario.rows[0].id;
          console.log(`👤 Nuevo usuario creado: ${userEmail}`);
        } else {
          usuarioId = usuario.rows[0].id;
        }

        // 🔥 CREAR RESERVA CON MÉTODO VÁLIDO
        const reserva = await pool.query(
          `INSERT INTO reserva (usuario_id, vuelo_id, fecha_salida, fecha_reserva, precio_total, metodo_seleccion, cantidad_pasajeros)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [usuarioId, 1, fechaReserva, new Date(), 0, metodoSeleccion, 1]
        );

        const reservaId = reserva.rows[0].id;

        // Determinar tipo de asiento
        const numeroFila = parseInt(seatNumber.substring(1));
        const tipoAsiento = numeroFila <= 2 ? 'negocios' : 'economico';

        // Crear pasajero
        await pool.query(
          `INSERT INTO pasajero (reserva_id, nombre_completo, cui, departamento, municipio, tipo_asiento, numero_asiento, tiene_equipaje)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [reservaId, passengerName, idNumber, 'No especificado', 'No especificado', tipoAsiento, seatNumber, hasLuggage]
        );

        resultadosCarga.exitosos++;
        resultadosCarga.asientosCargados.push(seatNumber);

        console.log(`✅ Asiento ${seatNumber} cargado exitosamente`);

      } catch (error) {
        resultadosCarga.errores++;
        resultadosCarga.detallesErrores.push({
          linea: i + 1,
          asiento: reservationData.seatNumber ? reservationData.seatNumber[0] : 'Desconocido',
          error: error.message
        });
        
        console.error(`❌ Error en línea ${i + 1}:`, error.message);
      }
    }

    const endTime = Date.now();
    const tiempoProcesamiento = endTime - startTime;

    console.log(`📊 Resumen carga XML: ${resultadosCarga.exitosos} exitosos, ${resultadosCarga.errores} errores`);

    res.json({
      success: true,
      tiempoProcesamiento,
      metodo_usado: metodoSeleccion,
      resumen: {
        totalReservas: reservations.length,
        exitosos: resultadosCarga.exitosos,
        errores: resultadosCarga.errores,
        detallesErrores: resultadosCarga.detallesErrores,
        asientosCargados: resultadosCarga.asientosCargados
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const tiempoProcesamiento = endTime - startTime;
    
    console.error('❌ Error general cargando XML:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error procesando archivo XML: ' + error.message,
      tiempoProcesamiento
    });
  }
});
// 🔥 FUNCIÓN PARA DETECTAR MÉTODO VÁLIDO
async function detectarMetodoValido() {
  const metodosPosibles = ['manual', 'automatic', 'sistema', 'aleatorio', 'asignado', 'predefinido'];
  
  for (const metodo of metodosPosibles) {
    try {
      // Crear usuario temporal para prueba
      const bcrypt = require('bcrypt');
      const passwordTemp = await bcrypt.hash('test123', 10);
      const usuarioTest = await pool.query(
        'INSERT INTO usuario (email, password) VALUES ($1, $2) RETURNING id',
        [`test-${Date.now()}@test.com`, passwordTemp]
      );
      
      // Probar el método
      const reservaTest = await pool.query(
        'INSERT INTO reserva (usuario_id, metodo_seleccion) VALUES ($1, $2) RETURNING id',
        [usuarioTest.rows[0].id, metodo]
      );
      
      // Limpiar
      await pool.query('DELETE FROM reserva WHERE id = $1', [reservaTest.rows[0].id]);
      await pool.query('DELETE FROM usuario WHERE id = $1', [usuarioTest.rows[0].id]);
      
      console.log(`✅ Método válido detectado: ${metodo}`);
      return metodo;
      
    } catch (error) {
      console.log(`❌ Método no válido: ${metodo}`);
      // Continuar con el siguiente método
    }
  }
  
  // Si ninguno funciona, usar 'manual' como último recurso
  console.log('⚠️  No se detectó método válido, usando "manual"');
  return 'manual';
}

// 🔥 FUNCIÓN DE RESPUESTA SI FALLA EL MÉTODO DETECTADO
async function forzarDeteccionMetodo() {
  // Valores menos comunes pero posibles
  const metodosAlternativos = ['automatico', 'manual', 'sistema', 'default', 'predeterminado'];
  
  for (const metodo of metodosAlternativos) {
    try {
      // Probar rápidamente
      const test = await pool.query('SELECT 1 WHERE $1 = ANY(enum_range(NULL::metodo_seleccion_enum))', [metodo]);
      if (test.rows.length > 0) {
        console.log(`🎯 Método alternativo válido: ${metodo}`);
        return metodo;
      }
    } catch (error) {
      // Ignorar errores, continuar
    }
  }
  
  return 'manual'; // Último recurso
}

// 🔍 RUTA DE DIAGNÓSTICO COMPLETO
router.get('/debug-database', async (req, res) => {
  try {
    console.log('🔍 === INICIO DIAGNÓSTICO BASE DE DATOS ===');

    // 1. Ver todas las constraints de la tabla reserva
    const constraintsResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'reserva'::regclass
    `);

    console.log('📌 CONSTRAINTS de la tabla RESERVA:');
    constraintsResult.rows.forEach(row => {
      console.log(`   ${row.constraint_name}: ${row.constraint_definition}`);
    });

    // 2. Ver la estructura de la tabla reserva
    const tableStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'reserva'
      ORDER BY ordinal_position
    `);

    console.log('🏗️  ESTRUCTURA de la tabla RESERVA:');
    tableStructure.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}) - Nullable: ${row.is_nullable}`);
    });

    // 3. Ver valores existentes en metodo_seleccion
    const existingValues = await pool.query(`
      SELECT DISTINCT metodo_seleccion, COUNT(*) as cantidad
      FROM reserva 
      GROUP BY metodo_seleccion
      ORDER BY cantidad DESC
    `);

    console.log('📊 VALORES EXISTENTES en metodo_seleccion:');
    existingValues.rows.forEach(row => {
      console.log(`   '${row.metodo_seleccion}': ${row.cantidad} registros`);
    });

    // 4. Ver si es un ENUM
    const enumCheck = await pool.query(`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname LIKE '%metodo%' OR t.typname LIKE '%seleccion%'
      ORDER BY t.typname, e.enumsortorder
    `);

    if (enumCheck.rows.length > 0) {
      console.log('🎯 VALORES ENUM encontrados:');
      enumCheck.rows.forEach(row => {
        console.log(`   ${row.enum_name}: ${row.enum_value}`);
      });
    } else {
      console.log('ℹ️  No se encontraron ENUMs relacionados con metodo_seleccion');
    }

    console.log('✅ === FIN DIAGNÓSTICO ===');

    res.json({
      constraints: constraintsResult.rows,
      table_structure: tableStructure.rows,
      existing_values: existingValues.rows,
      enums: enumCheck.rows
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({ error: error.message });
  }
});

// OBTENER RESERVAS DEL USUARIO
router.get('/mis-reservas', authenticateSession, async (req, res) => {
  try {
    const usuario_id = req.user.userId;

    const reservas = await pool.query(
      `SELECT r.*, v.origen, v.destino, v.tipo_vuelo
       FROM reserva r
       JOIN vuelo v ON r.vuelo_id = v.id
       WHERE r.usuario_id = $1
       ORDER BY r.fecha_reserva DESC`,
      [usuario_id]
    );

    res.json({
      success: true,
      data: reservas.rows
    });

  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// OBTENER DETALLE DE UNA RESERVA ESPECÍFICA
router.get('/:id', authenticateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user.userId;

    const reserva = await pool.query(
      `SELECT r.*, v.origen, v.destino, v.tipo_vuelo
       FROM reserva r
       JOIN vuelo v ON r.vuelo_id = v.id
       WHERE r.id = $1 AND r.usuario_id = $2`,
      [id, usuario_id]
    );

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const pasajeros = await pool.query(
      'SELECT * FROM pasajero WHERE reserva_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...reserva.rows[0],
        pasajeros: pasajeros.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// OBTENER ESTADÍSTICAS COMPLETAS PARA REPORTES
router.get('/reportes/stats', authenticateSession, async (req, res) => {
  try {
    console.log('📊 Endpoint de estadísticas llamado - VERSIÓN NUEVA');

    // 1. Cantidad de usuarios creados
    const userCountResult = await pool.query('SELECT COUNT(*) FROM usuario');
    const userCount = parseInt(userCountResult.rows[0].count);

    // 2. Total de reservas
    const totalReservationsResult = await pool.query('SELECT COUNT(*) FROM reserva');
    const totalReservations = parseInt(totalReservationsResult.rows[0].count);

    // 3. Asientos ocupados totales
    const occupiedSeatsResult = await pool.query(`
      SELECT COUNT(DISTINCT numero_asiento) 
      FROM pasajero 
      WHERE reserva_id IS NOT NULL
    `);
    const occupiedSeats = parseInt(occupiedSeatsResult.rows[0].count);

    // 4. Reservas por usuario (promedio)
    const reservationsPerUserResult = await pool.query(`
      SELECT COUNT(*)::decimal / NULLIF(COUNT(DISTINCT usuario_id), 0) as avg_reservations
      FROM reserva
    `);
    const reservationsPerUser = parseFloat(reservationsPerUserResult.rows[0].avg_reservations || 0).toFixed(1);

    // 5. Asientos negocios ocupados
    const businessOccupiedResult = await pool.query(`
      SELECT COUNT(DISTINCT p.numero_asiento)
      FROM pasajero p
      JOIN asiento a ON p.numero_asiento = a.numero_asiento
      WHERE a.tipo = 'negocios' AND p.reserva_id IS NOT NULL
    `);
    const businessOccupied = parseInt(businessOccupiedResult.rows[0].count || 0);

    // 6. Asientos económicos ocupados
    const economyOccupiedResult = await pool.query(`
      SELECT COUNT(DISTINCT p.numero_asiento)
      FROM pasajero p
      JOIN asiento a ON p.numero_asiento = a.numero_asiento
      WHERE a.tipo = 'economico' AND p.reserva_id IS NOT NULL
    `);
    const economyOccupied = parseInt(economyOccupiedResult.rows[0].count || 0);

    // 7. Asientos negocios libres
    const businessFreeResult = await pool.query(`
      SELECT COUNT(*) 
      FROM asiento 
      WHERE tipo = 'negocios' 
      AND numero_asiento NOT IN (
        SELECT DISTINCT numero_asiento 
        FROM pasajero 
        WHERE reserva_id IS NOT NULL
      )
    `);
    const businessFree = parseInt(businessFreeResult.rows[0].count || 0);

    // 8. Asientos económicos libres
    const economyFreeResult = await pool.query(`
      SELECT COUNT(*) 
      FROM asiento 
      WHERE tipo = 'economico' 
      AND numero_asiento NOT IN (
        SELECT DISTINCT numero_asiento 
        FROM pasajero 
        WHERE reserva_id IS NOT NULL
      )
    `);
    const economyFree = parseInt(economyFreeResult.rows[0].count || 0);

    // 9. Asientos seleccionados manualmente
    const manualSelectionsResult = await pool.query(`
      SELECT COUNT(*) 
      FROM reserva 
      WHERE metodo_seleccion = 'manual'
    `);
    const manualSelections = parseInt(manualSelectionsResult.rows[0].count || 0);

    // 10. Asientos seleccionados aleatoriamente
    const randomSelectionsResult = await pool.query(`
      SELECT COUNT(*) 
      FROM reserva 
      WHERE metodo_seleccion = 'automatic'
    `);
    const randomSelections = parseInt(randomSelectionsResult.rows[0].count || 0);

    // 11. Asientos modificados
    const modifiedSeats = 0;

    // 12. Asientos cancelados
    const canceledSeats = 0;

    // FORMATO CORRECTO QUE ESPERA EL FRONTEND
    const responseData = {
      success: true,
      data: {
        userCount,
        totalReservations,
        occupiedSeats,
        reservationsPerUser,
        businessOccupied,
        economyOccupied,
        businessFree,
        economyFree,
        manualSelections,
        randomSelections,
        modifiedSeats,
        canceledSeats
      }
    };

    console.log('✅ Enviando respuesta NUEVA:', JSON.stringify(responseData, null, 2));
    
    res.setHeader('Content-Type', 'application/json');
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error en endpoint NUEVO:', error);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false,
      error: 'Error interno: ' + error.message 
    });
  }
});


// GENERAR XML DE ASIENTOS RESERVADOS (ESTRUCTURA EXACTA)
  // GENERAR XML DE ASIENTOS RESERVADOS - VERSIÓN CORREGIDA
router.get('/export/xml', authenticateSession, async (req, res) => {
  try {
    console.log('📤 Iniciando exportación XML...');
    
    const result = await pool.query(`
      SELECT 
        p.numero_asiento as "seatNumber",
        p.nombre_completo as "passengerName",
        u.email as "user",
        p.cui as "idNumber",
        p.tiene_equipaje as "hasLuggage",
        TO_CHAR(r.fecha_reserva, 'DD/MM/YYYY HH24:MI') as "reservationDate"
      FROM pasajero p
      JOIN reserva r ON p.reserva_id = r.id
      JOIN usuario u ON r.usuario_id = u.id
      ORDER BY r.fecha_reserva DESC
    `);

    const reservations = result.rows;
    console.log(`📊 Encontradas ${reservations.length} reservas para exportar`);

    // Construir el XML CORRECTAMENTE FORMADO
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<flightReservation>\n';
    
    reservations.forEach(reservation => {
      xml += '  <flightSeat>\n';
      xml += `    <seatNumber>${escapeXml(reservation.seatNumber)}</seatNumber>\n`;
      xml += `    <passengerName>${escapeXml(reservation.passengerName)}</passengerName>\n`;
      xml += `    <user>${escapeXml(reservation.user)}</user>\n`;
      xml += `    <idNumber>${escapeXml(reservation.idNumber)}</idNumber>\n`;
      xml += `    <hasLuggage>${reservation.hasLuggage}</hasLuggage>\n`;
      xml += `    <reservationDate>${reservation.reservationDate}</reservationDate>\n`;
      xml += '  </flightSeat>\n';
    });
    
    xml += '</flightReservation>'; // 🔥 ETIQUETA DE CIERRE CRÍTICA

    // Función para escapar caracteres XML
    function escapeXml(unsafe) {
      if (!unsafe) return '';
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    console.log('✅ XML generado correctamente, tamaño:', xml.length, 'caracteres');
    console.log('📊 Estructura: <flightReservation> con', reservations.length, 'elementos <flightSeat>');

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="asientos-reservados.xml"');
    res.send(xml);

  } catch (error) {
    console.error('❌ Error generando XML:', error);
    res.status(500).json({ error: 'Error interno del servidor al generar XML' });
  }
});
// OBTENER FECHAS CON RESERVAS DISPONIBLES
router.get('/reportes/fechas-disponibles', authenticateSession, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT DATE(fecha_reserva) as fecha
      FROM reserva 
      ORDER BY fecha DESC
    `);

    const fechas = result.rows.map(row => row.fecha);
    
    res.json({
      success: true,
      data: fechas
    });

  } catch (error) {
    console.error('Error obteniendo fechas disponibles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// OBTENER ESTADÍSTICAS POR FECHA ESPECÍFICA
router.get('/reportes/stats/:fecha', authenticateSession, async (req, res) => {
  try {
    const { fecha } = req.params;
    console.log(`📊 Obteniendo estadísticas para fecha: ${fecha}`);

    // 1. Reservas de la fecha específica
    const totalReservationsResult = await pool.query(
      'SELECT COUNT(*) FROM reserva WHERE DATE(fecha_reserva) = $1',
      [fecha]
    );
    const totalReservations = parseInt(totalReservationsResult.rows[0].count);

    // Si no hay reservas para esta fecha, retornar vacío
    if (totalReservations === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay reservas para esta fecha'
      });
    }

    // 2. Asientos ocupados en la fecha
    const occupiedSeatsResult = await pool.query(`
      SELECT COUNT(DISTINCT p.numero_asiento) 
      FROM pasajero p
      JOIN reserva r ON p.reserva_id = r.id
      WHERE DATE(r.fecha_reserva) = $1
    `, [fecha]);
    const occupiedSeats = parseInt(occupiedSeatsResult.rows[0].count);

    // 3. Usuarios que hicieron reservas en la fecha
    const userCountResult = await pool.query(
      'SELECT COUNT(DISTINCT usuario_id) FROM reserva WHERE DATE(fecha_reserva) = $1',
      [fecha]
    );
    const userCount = parseInt(userCountResult.rows[0].count);

    // 4. Reservas por usuario (promedio)
    const reservationsPerUser = totalReservations / userCount;

    // 5. Asientos negocios ocupados
    const businessOccupiedResult = await pool.query(`
      SELECT COUNT(DISTINCT p.numero_asiento)
      FROM pasajero p
      JOIN asiento a ON p.numero_asiento = a.numero_asiento
      JOIN reserva r ON p.reserva_id = r.id
      WHERE a.tipo = 'negocios' AND DATE(r.fecha_reserva) = $1
    `, [fecha]);
    const businessOccupied = parseInt(businessOccupiedResult.rows[0].count || 0);

    // 6. Asientos económicos ocupados
    const economyOccupiedResult = await pool.query(`
      SELECT COUNT(DISTINCT p.numero_asiento)
      FROM pasajero p
      JOIN asiento a ON p.numero_asiento = a.numero_asiento
      JOIN reserva r ON p.reserva_id = r.id
      WHERE a.tipo = 'economico' AND DATE(r.fecha_reserva) = $1
    `, [fecha]);
    const economyOccupied = parseInt(economyOccupiedResult.rows[0].count || 0);

    // 7. Asientos seleccionados manualmente
    const manualSelectionsResult = await pool.query(`
      SELECT COUNT(*) 
      FROM reserva 
      WHERE metodo_seleccion = 'manual' AND DATE(fecha_reserva) = $1
    `, [fecha]);
    const manualSelections = parseInt(manualSelectionsResult.rows[0].count || 0);

    // 8. Asientos seleccionados aleatoriamente
    const randomSelectionsResult = await pool.query(`
      SELECT COUNT(*) 
      FROM reserva 
      WHERE metodo_seleccion = 'automatic' AND DATE(fecha_reserva) = $1
    `, [fecha]);
    const randomSelections = parseInt(randomSelectionsResult.rows[0].count || 0);

    const responseData = {
      success: true,
      data: {
        fecha,
        userCount,
        totalReservations,
        occupiedSeats,
        reservationsPerUser: reservationsPerUser.toFixed(1),
        businessOccupied,
        economyOccupied,
        manualSelections,
        randomSelections,
        modifiedSeats: 0,
        canceledSeats: 0
      }
    };

    console.log('✅ Estadísticas por fecha:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas por fecha:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// 🔧 ENDPOINT DE DIAGNÓSTICO TEMPORAL
router.get('/test-reportes', async (req, res) => {
  console.log('✅ Endpoint de prueba /test-reportes ejecutándose');
  res.json({
    success: true,
    message: 'Endpoint de prueba funcionando',
    data: { test: 123 }
  });
});
// 👇 ESTA LÍNEA ES CRÍTICA - debe ser exactamente así
module.exports = router;
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// OBTENER todos los vuelos
router.get('/', async (req, res) => {
  try {
    const flights = await pool.query(
      `SELECT * FROM vuelo WHERE activo = true ORDER BY destino, tipo_vuelo`
    );

    res.json({
      success: true,
      data: flights.rows
    });

  } catch (error) {
    console.error('Error obteniendo vuelos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// OBTENER asientos
router.get('/seats', async (req, res) => {
  try {
    const seats = await pool.query(
      `SELECT * FROM asiento ORDER BY numero_asiento`
    );

    res.json({
      success: true,
      data: seats.rows
    });

  } catch (error) {
    console.error('Error obteniendo asientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

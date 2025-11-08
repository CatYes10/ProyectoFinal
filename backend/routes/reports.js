const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 📊 Obtener estadísticas generales
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuario) AS userCount,
        (SELECT COUNT(*) FROM reserva) AS totalReservations,
        (SELECT COUNT(*) FROM asiento WHERE ocupado = true) AS occupiedSeats,
        (SELECT COUNT(*) FROM asiento WHERE ocupado = false) AS freeSeats,
        (SELECT COUNT(*) FROM asiento WHERE tipo = 'negocios' AND ocupado = true) AS businessOccupied,
        (SELECT COUNT(*) FROM asiento WHERE tipo = 'economico' AND ocupado = true) AS economyOccupied,
        (SELECT COUNT(*) FROM asiento WHERE tipo = 'negocios' AND ocupado = false) AS businessFree,
        (SELECT COUNT(*) FROM asiento WHERE tipo = 'economico' AND ocupado = false) AS economyFree
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo estadísticas' });
  }
});

// 💺 Asientos ocupados (todos)
router.get('/asientos-ocupados', async (req, res) => {
  try {
    const result = await pool.query(`SELECT numero_asiento FROM asiento WHERE ocupado = true`);
    const asientos = result.rows.map(r => r.numero_asiento);
    res.json({ success: true, data: asientos });
  } catch (error) {
    console.error('❌ Error cargando asientos ocupados:', error);
    res.status(500).json({ success: false, error: 'Error cargando asientos' });
  }
});

// 📅 Fechas disponibles (de reservas)
router.get('/fechas-disponibles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT fecha_salida 
      FROM reserva 
      ORDER BY fecha_salida DESC
    `);
    const fechas = result.rows.map(r => r.fecha_salida);
    res.json({ success: true, data: fechas });
  } catch (error) {
    console.error('❌ Error obteniendo fechas:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo fechas' });
  }
});

module.exports = router;

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const pool = require('./config/database');

const app = express();

const reportRoutes = require('./routes/reports');
app.use('/api/reports', reportRoutes);


// ✅ 1. CORS DEBE IR PRIMERO
app.use(cors({
  origin: 'http://localhost:4200', // URL del frontend
  credentials: true                // permite enviar cookies
}));

// ✅ 2. Body parser ANTES DE session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 3. Manejo de archivos
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true
}));

// ✅ 4. Sesiones (después de cors y json)
app.use(session({
  secret: 'super_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,   // ⚠️ false en HTTP local
    httpOnly: true,  // no accesible desde JS
    sameSite: 'lax', // permite cookies entre localhost:4200 y 3000
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ✅ 5. Rutas
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes.router);
app.use('/api/flights', require('./routes/flights'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/reports', require('./routes/reports')); // 👈 AÑADIR ESTA


// ✅ 6. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend funcionando correctamente'
  });
});

// ✅ 7. Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;

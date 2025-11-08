const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const router = express.Router();

// MIDDLEWARE DE AUTENTICACIÓN
const authenticateSession = (req, res, next) => {
  console.log('🔐 === MIDDLEWARE AUTHENTICATE SESSION ===');
  console.log('📌 Session ID:', req.sessionID);
  console.log('📌 Session keys:', Object.keys(req.session));
  console.log('📌 UserId en sesión:', req.session.userId);
  console.log('📌 UserEmail en sesión:', req.session.userEmail);
  console.log('📌 URL:', req.originalUrl);
  
  if (!req.session.userId) {
    console.log('❌ FALLO: No hay userId en sesión');
    return res.status(401).json({ 
      error: 'Debes iniciar sesión',
      code: 'NO_SESSION_USERID'
    });
  }
  
  req.user = {
    userId: req.session.userId,
    email: req.session.userEmail
  };
  
  console.log('✅ AUTORIZADO: User', req.user.userId);
  console.log('========================================');
  
  next();
};

// REGISTRO de usuario
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email.endsWith('@gmail.com') && !email.endsWith('@outlook.com')) {
      return res.status(400).json({ 
        error: 'Solo se permiten emails @gmail.com y @outlook.com' 
      });
    }

    const userExists = await pool.query(
      'SELECT * FROM usuario WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO usuario (email, password, fecha_creacion, es_vip, reservas_totales, verificado) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, false, 0, false) 
       RETURNING id, email, fecha_creacion, es_vip, reservas_totales, verificado`,
      [email, hashedPassword]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// LOGIN de usuario
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 === INICIO DE LOGIN ===');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    const user = await pool.query(
      'SELECT * FROM usuario WHERE email = $1', 
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const userData = user.rows[0];

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    console.log('✅ Credenciales válidas para:', userData.email);

    // Guardar en sesión
    req.session.userId = userData.id;
    req.session.userEmail = userData.email;

    console.log('💾 Sesión actualizada:', {
      sessionId: req.sessionID,
      userId: req.session.userId,
      userEmail: req.session.userEmail
    });

    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      console.log('✅ Sesión guardada correctamente');
      
      // ✅ RESPONSE CORREGIDA - usar solo columnas que existen en tu tabla
      res.json({
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          // No existe 'nombre' en tu tabla, usamos email como referencia
          nombre: userData.email.split('@')[0], // Extraemos la parte antes del @
          es_vip: userData.es_vip || false,
          reservas_totales: userData.reservas_totales || 0,
          verificado: userData.verificado || false,
          fecha_creacion: userData.fecha_creacion
        }
      });
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor: ' + error.message 
    });
  }
});

// RUTA CHECK - CORREGIDA
router.get('/check', async (req, res) => {
  try {
    console.log('🔍 Verificando autenticación...');
    console.log('Session ID:', req.sessionID);
    console.log('User ID en sesión:', req.session.userId);

    if (!req.session.userId) {
      console.log('❌ No hay usuario en sesión');
      return res.json({ 
        authenticated: false
      });
    }

    // ✅ CONSULTA CORREGIDA - usar solo columnas que existen
    const user = await pool.query(
      'SELECT id, email, es_vip, reservas_totales, verificado, fecha_creacion FROM usuario WHERE id = $1',
      [req.session.userId]
    );

    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado en BD');
      return res.json({ 
        authenticated: false 
      });
    }

    const userData = user.rows[0];
    console.log('✅ Usuario autenticado:', userData.email);

    res.json({
      authenticated: true,
      user: {
        id: userData.id,
        email: userData.email,
        nombre: userData.email.split('@')[0], // Extraemos nombre del email
        es_vip: userData.es_vip || false,
        reservas_totales: userData.reservas_totales || 0,
        verificado: userData.verificado || false,
        fecha_creacion: userData.fecha_creacion
      }
    });

  } catch (error) {
    console.error('❌ Error en /check:', error);
    res.status(500).json({ 
      authenticated: false,
      error: 'Error interno del servidor' 
    });
  }
});

// RUTA PARA VERIFICAR LOGIN (PROTEGIDA)
router.get('/check-login', authenticateSession, (req, res) => {
  res.json({
    success: true,
    message: 'Sesión activa',
    user: req.user
  });
});

// RUTA DE DIAGNÓSTICO DE SESIÓN
router.get('/session-debug', (req, res) => {
  console.log('🔍 === DIAGNÓSTICO DE SESIÓN ===');
  console.log('📌 Session ID:', req.sessionID);
  console.log('📌 Session completa:', req.session);
  console.log('📌 Cookies headers:', req.headers.cookie);
  console.log('📌 User ID en sesión:', req.session?.userId);
  
  res.json({
    sessionId: req.sessionID,
    sessionExists: !!req.session,
    userId: req.session?.userId,
    userEmail: req.session?.userEmail,
    authenticated: !!req.session?.userId,
    cookies: req.headers.cookie,
    sessionData: req.session
  });
});

// LOGOUT
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error al destruir sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    
    console.log('✅ Sesión cerrada exitosamente');
    res.json({ 
      success: true,
      message: 'Logout exitoso' 
    });
  });
});

// ✅ EXPORTAR EL MIDDLEWARE Y EL ROUTER
module.exports = {
  router,
  authenticateSession
};
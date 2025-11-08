
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7, authHeader.length)
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yourSecretKey');

    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

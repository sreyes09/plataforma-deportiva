const jwt = require('jsonwebtoken');

// Middleware que protege rutas privadas del sistema usando JWT.
const verificarToken = (req, res, next) => {
  // El frontend envia el JWT en el header Authorization con formato Bearer.
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado, token requerido' });
  }

  try {
    // Se elimina el prefijo Bearer para verificar unicamente el valor del token.
    const tokenLimpio = token.replace('Bearer ', '');
    const verificado = jwt.verify(tokenLimpio, process.env.JWT_SECRETO);
    // El payload verificado se guarda en req.usuario para que lo use el controlador.
    req.usuario = verificado;
    return next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

module.exports = verificarToken;

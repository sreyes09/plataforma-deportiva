const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Reglas unificadas para validar contraseñas en backend y documentarlas con claridad.
// Objeto fuente de verdad para la politica de contrasenas.
// Backend y frontend se apoyan en estas mismas reglas.
const REGLAS_CONTRASENA = {
  longitudMinima: 8,
  requiereMayuscula: true,
  requiereMinuscula: true,
  requiereNumero: true,
  requiereCaracterEspecial: true,
};

// Valida cada regla por separado para devolver mensajes fáciles de explicar al usuario.
const validarContrasena = (contrasena = '') => {
  const errores = [];

  if (contrasena.length < REGLAS_CONTRASENA.longitudMinima) {
    errores.push(`La contraseña debe tener al menos ${REGLAS_CONTRASENA.longitudMinima} caracteres.`);
  }

  if (REGLAS_CONTRASENA.requiereMayuscula && !/[A-Z]/.test(contrasena)) {
    errores.push('La contraseña debe incluir al menos una letra mayúscula.');
  }

  if (REGLAS_CONTRASENA.requiereMinuscula && !/[a-z]/.test(contrasena)) {
    errores.push('La contraseña debe incluir al menos una letra minúscula.');
  }

  if (REGLAS_CONTRASENA.requiereNumero && !/\d/.test(contrasena)) {
    errores.push('La contraseña debe incluir al menos un número.');
  }

  if (REGLAS_CONTRASENA.requiereCaracterEspecial && !/[^A-Za-z0-9]/.test(contrasena)) {
    errores.push('La contraseña debe incluir al menos un carácter especial.');
  }

  return {
    esValida: errores.length === 0,
    errores,
  };
};

// Genera un código temporal de seis dígitos para el segundo paso del login.
// El sistema usa un codigo numerico corto para simplificar la entrada manual.
const generarCodigoDosPasos = () =>
  `${Math.floor(100000 + Math.random() * 900000)}`;

// Encapsula la firma del token JWT para reutilizarla en login y verificación 2FA.
const generarTokenSesion = (usuario) =>
  jwt.sign(
    { id: usuario._id, rol: usuario.rol },
    process.env.JWT_SECRETO,
    { expiresIn: '7d' }
  );

// Cifra el código de dos pasos antes de guardarlo en base de datos.
const cifrarCodigoDosPasos = async (codigo) => {
  const sal = await bcrypt.genSalt(10);
  return bcrypt.hash(codigo, sal);
};

// Compara el código enviado por el usuario contra el hash almacenado.
const compararCodigoDosPasos = async (codigoPlano, codigoHash = '') => {
  if (!codigoHash) return false;
  return bcrypt.compare(codigoPlano, codigoHash);
};

module.exports = {
  REGLAS_CONTRASENA,
  validarContrasena,
  generarCodigoDosPasos,
  generarTokenSesion,
  cifrarCodigoDosPasos,
  compararCodigoDosPasos,
};

const mongoose = require('mongoose');

// Modelo de usuario base para autenticacion y roles del sistema.
// Guarda la identidad principal con la que el usuario entra al proyecto.
const usuarioEsquema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  apellidos: {
    type: String,
    required: true,
    trim: true,
  },
  correo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  contrasena: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ['deportista', 'entrenador', 'administrador'],
    default: 'deportista',
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo',
  },
  // Esta seccion almacena el estado temporal del segundo paso del login.
  dobleFactor: {
    habilitado: {
      type: Boolean,
      default: true,
    },
    codigoHash: {
      type: String,
      default: '',
    },
    expiraEn: {
      type: Date,
      default: null,
    },
    ultimoEnvio: {
      type: Date,
      default: null,
    },
  },
  // Seccion separada para la recuperacion de contrasena desde el login.
  restablecimiento: {
    codigoHash: {
      type: String,
      default: '',
    },
    expiraEn: {
      type: Date,
      default: null,
    },
    ultimoEnvio: {
      type: Date,
      default: null,
    },
  },
  // Fecha administrativa que ayuda a auditoria y orden de cuentas.
  fechaRegistro: {
    type: Date,
    default: Date.now,
  },
});

// Exporta el modelo listo para consultas, registro y login.
module.exports = mongoose.model('Usuario', usuarioEsquema);

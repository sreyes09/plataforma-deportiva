const express = require('express');
const {
  registrar,
  iniciarSesion,
  verificarDosPasos,
  obtenerReglasContrasena,
  solicitarRestablecimiento,
  restablecerContrasena,
} = require('../controladores/authControlador');

const router = express.Router();

// Este archivo solo define las rutas; la logica real vive en el controlador.

// Registro de usuarios con validacion de seguridad.
router.post('/registrar', registrar);

// Primer paso del login: correo y contraseña.
router.post('/iniciar-sesion', iniciarSesion);

// Segundo paso del login: código temporal.
router.post('/verificar-dos-pasos', verificarDosPasos);

// Reglas publicas para apoyar la validacion en frontend.
router.get('/reglas-contrasena', obtenerReglasContrasena);

// Recuperacion de acceso desde la pantalla publica.
router.post('/solicitar-restablecimiento', solicitarRestablecimiento);
router.post('/restablecer-contrasena', restablecerContrasena);

module.exports = router;

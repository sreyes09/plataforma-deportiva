const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const { obtenerPanel, actualizarPanel, vincularDeportista } = require('../controladores/panelControlador');

// Todas las rutas del panel son privadas, por eso pasan primero por verificarToken.
router.get('/', verificarToken, obtenerPanel);
router.put('/', verificarToken, actualizarPanel);
router.post('/deportistas/vincular', verificarToken, vincularDeportista);

module.exports = router;

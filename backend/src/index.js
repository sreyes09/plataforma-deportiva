const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

dotenv.config();

// Punto de entrada del backend con la configuracion principal de Express.
// Aqui se cargan variables de entorno, middlewares y las rutas principales.
const app = express();

const authRutas = require('./rutas/authRutas');
const panelRutas = require('./rutas/panelRutas');

// Middleware global para aceptar JSON y permitir la conexion con el frontend.
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Modulos principales del sistema expuestos como API REST.
app.use('/api/auth', authRutas);
app.use('/api/panel', panelRutas);

// Ruta de salud para comprobar rapidamente si el servidor esta levantado.
app.get('/', (_req, res) => {
  res.json({ mensaje: 'Servidor de Vyrox funcionando' });
});

// La aplicacion solo escucha peticiones despues de conectarse con MongoDB.
// Eso evita que el frontend intente trabajar contra un servidor sin base de datos.
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB Atlas');
    app.listen(process.env.PUERTO, () => {
      console.log(`Servidor corriendo en el puerto ${process.env.PUERTO}`);
    });
  })
  .catch((error) => {
    console.error('Error conectando a MongoDB:', error.message);
  });

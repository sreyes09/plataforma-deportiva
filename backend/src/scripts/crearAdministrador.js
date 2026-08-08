require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../modelos/Usuario');

// Script administrativo seguro para crear o promover una cuenta a administrador.
// Uso:
// node src/scripts/crearAdministrador.js "Nombre" "Apellidos" "correo@dominio.com" "ContrasenaSegura123!"

const [, , nombre, apellidos, correoEntrada, contrasenaEntrada] = process.argv;

const validarParametros = () => {
  if (!nombre || !apellidos || !correoEntrada || !contrasenaEntrada) {
    console.log('Uso: node src/scripts/crearAdministrador.js "Nombre" "Apellidos" "correo@dominio.com" "ContrasenaSegura123!"');
    process.exit(1);
  }
};

const crearOActualizarAdministrador = async () => {
  validarParametros();

  const correo = String(correoEntrada).trim().toLowerCase();
  const hash = await bcrypt.hash(contrasenaEntrada, 10);

  const existente = await Usuario.findOne({ correo });

  if (existente) {
    existente.nombre = nombre;
    existente.apellidos = apellidos;
    existente.contrasena = hash;
    existente.rol = 'administrador';
    existente.estado = 'activo';
    await existente.save();

    console.log(`Cuenta promovida/actualizada como administrador: ${correo}`);
    return;
  }

  await Usuario.create({
    nombre,
    apellidos,
    correo,
    contrasena: hash,
    rol: 'administrador',
    estado: 'activo',
  });

  console.log(`Administrador creado correctamente: ${correo}`);
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await crearOActualizarAdministrador();
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('No se pudo crear el administrador:', error.message);
    try {
      await mongoose.disconnect();
    } catch (_error) {
      // No hace falta otra accion si la conexion no estaba abierta.
    }
    process.exit(1);
  });

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../modelos/Usuario');

// Script administrativo seguro para crear o promover una cuenta a administrador.
// Acepta ambos formatos para evitar errores de uso manual:
// 1. node src/scripts/crearAdministrador.js "Nombre" "Apellidos" "correo@dominio.com" "ContrasenaSegura123!"
// 2. node src/scripts/crearAdministrador.js "correo@dominio.com" "Nombre" "Apellidos" "ContrasenaSegura123!"

const [, , arg1, arg2, arg3, arg4] = process.argv;

const mostrarUso = () => {
  console.log('Uso 1: node src/scripts/crearAdministrador.js "Nombre" "Apellidos" "correo@dominio.com" "ContrasenaSegura123!"');
  console.log('Uso 2: node src/scripts/crearAdministrador.js "correo@dominio.com" "Nombre" "Apellidos" "ContrasenaSegura123!"');
};

const esCorreoValido = (valor = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());

const resolverParametros = () => {
  if (!arg1 || !arg2 || !arg3 || !arg4) {
    mostrarUso();
    process.exit(1);
  }

  if (esCorreoValido(arg1)) {
    return {
      correo: String(arg1).trim().toLowerCase(),
      nombre: String(arg2).trim(),
      apellidos: String(arg3).trim(),
      contrasena: String(arg4),
    };
  }

  if (esCorreoValido(arg3)) {
    return {
      nombre: String(arg1).trim(),
      apellidos: String(arg2).trim(),
      correo: String(arg3).trim().toLowerCase(),
      contrasena: String(arg4),
    };
  }

  console.log('No se detectó un correo válido en los parámetros recibidos.');
  mostrarUso();
  process.exit(1);
};

const crearOActualizarAdministrador = async () => {
  const { nombre, apellidos, correo, contrasena } = resolverParametros();
  const hash = await bcrypt.hash(contrasena, 10);

  const existente = await Usuario.findOne({ correo });

  if (existente) {
    existente.nombre = nombre;
    existente.apellidos = apellidos;
    existente.contrasena = hash;
    existente.rol = 'administrador';
    existente.estado = 'activo';
    await existente.save();

    console.log('Cuenta promovida/actualizada como administrador: ' + correo);
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

  console.log('Administrador creado correctamente: ' + correo);
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
      // No hace falta otra acción si la conexión no estaba abierta.
    }
    process.exit(1);
  });
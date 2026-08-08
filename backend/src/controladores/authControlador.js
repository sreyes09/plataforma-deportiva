const bcrypt = require('bcryptjs');
const Usuario = require('../modelos/Usuario');
const {
  REGLAS_CONTRASENA,
  validarContrasena,
  generarCodigoDosPasos,
  generarTokenSesion,
  cifrarCodigoDosPasos,
  compararCodigoDosPasos,
} = require('../utils/seguridadAuth');
const {
  enviarCodigoDosPasos,
  enviarCodigoRestablecimiento,
} = require('../utils/correoAuth');

// Centraliza la respuesta que representa una sesión ya verificada.
// Se usa despues de completar el segundo paso para devolver siempre
// el mismo formato de token y datos del usuario autenticado.
const construirRespuestaSesion = (usuario) => ({
  mensaje: 'Inicio de sesi\u00f3n exitoso',
  token: generarTokenSesion(usuario),
  usuario: {
    id: usuario._id,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    rol: usuario.rol,
  },
});

// Devuelve solo los datos mínimos que el frontend necesita para el segundo paso.
// Devuelve al frontend un resumen del desafio pendiente sin abrir la sesion todavia.
const construirRespuestaDosPasos = (usuario, resultadoEntrega = {}) => ({
  mensaje:
    resultadoEntrega?.modoEntrega === 'correo'
      ? 'C\u00f3digo de verificaci\u00f3n enviado al correo registrado'
      : 'C\u00f3digo temporal generado en modo local. Revise la consola del servidor.',
  requiereVerificacionDosPasos: true,
  desafioId: usuario._id,
  correo: resultadoEntrega?.destinatario || usuario.correo,
  expiraEnMinutos: 10,
  modoEntrega: resultadoEntrega?.modoEntrega || 'correo',
});

// Registra al usuario aplicando la política actual de contraseña.
const registrar = async (req, res) => {
  try {
    const {
      nombre = '',
      apellidos = '',
      correo = '',
      contrasena = '',
      rol = 'deportista',
    } = req.body;

    const correoNormalizado = correo.trim().toLowerCase();
    const validacionContrasena = validarContrasena(contrasena);

    // Antes de crear el usuario se valida la contrasena contra todas las reglas activas.
    if (!validacionContrasena.esValida) {
      return res.status(400).json({
        mensaje: 'La contrase\u00f1a no cumple con los requisitos de seguridad.',
        errores: validacionContrasena.errores,
        reglas: REGLAS_CONTRASENA,
      });
    }

    const usuarioExiste = await Usuario.findOne({ correo: correoNormalizado });
    if (usuarioExiste) {
      return res.status(400).json({ mensaje: 'El correo ya est\u00e1 registrado' });
    }

    // bcrypt genera un hash seguro para no almacenar la contrasena original.
    const sal = await bcrypt.genSalt(10);
    const contrasenaCifrada = await bcrypt.hash(contrasena, sal);

    const usuario = await Usuario.create({
      nombre,
      apellidos,
      correo: correoNormalizado,
      contrasena: contrasenaCifrada,
      rol,
    });

    return res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      reglasContrasena: REGLAS_CONTRASENA,
      token: generarTokenSesion(usuario),
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

// Primer paso del login: valida credenciales, crea el código y lo entrega por correo o respaldo local.
const iniciarSesion = async (req, res) => {
  try {
    const { correo = '', contrasena = '' } = req.body;
    const correoNormalizado = correo.trim().toLowerCase();

    // El login se ejecuta siempre sobre el correo normalizado para evitar duplicados visuales.
    const usuario = await Usuario.findOne({ correo: correoNormalizado });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Correo o contrase\u00f1a incorrectos' });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(400).json({ mensaje: 'Correo o contrase\u00f1a incorrectos' });
    }

    // El codigo del segundo factor se crea en memoria y luego se guarda en forma cifrada.
    const codigo = generarCodigoDosPasos();
    const codigoHash = await cifrarCodigoDosPasos(codigo);
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

    usuario.dobleFactor = {
      ...(usuario.dobleFactor || {}),
      habilitado: true,
      codigoHash,
      expiraEn,
      ultimoEnvio: new Date(),
    };

    await usuario.save();

    const resultadoEnvio = await enviarCodigoDosPasos({
      correo: usuario.correo,
      nombre: usuario.nombre,
      codigo,
    });

    return res.json(construirRespuestaDosPasos(usuario, resultadoEnvio));
  } catch (error) {
    if (error.message.includes('SMTP')) {
      return res.status(503).json({
        mensaje:
          'No se pudo enviar el c\u00f3digo de verificaci\u00f3n por correo. Revise la configuraci\u00f3n SMTP del servidor.',
        error: error.message,
      });
    }

    return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

// Segundo paso del login: valida el código temporal y devuelve la sesión final.
const verificarDosPasos = async (req, res) => {
  try {
    const { desafioId = '', codigo = '' } = req.body;

    const usuario = await Usuario.findById(desafioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Desaf\u00edo de verificaci\u00f3n no encontrado' });
    }

    if (!usuario.dobleFactor?.codigoHash || !usuario.dobleFactor?.expiraEn) {
      return res.status(400).json({ mensaje: 'No hay una verificaci\u00f3n pendiente para este usuario' });
    }

    if (new Date(usuario.dobleFactor.expiraEn).getTime() < Date.now()) {
      usuario.dobleFactor.codigoHash = '';
      usuario.dobleFactor.expiraEn = null;
      await usuario.save();
      return res.status(400).json({ mensaje: 'El c\u00f3digo de verificaci\u00f3n ya expir\u00f3' });
    }

    const codigoValido = await compararCodigoDosPasos(codigo, usuario.dobleFactor.codigoHash);
    if (!codigoValido) {
      return res.status(400).json({ mensaje: 'El c\u00f3digo de verificaci\u00f3n es incorrecto' });
    }

    usuario.dobleFactor.codigoHash = '';
    usuario.dobleFactor.expiraEn = null;
    await usuario.save();

    return res.json(construirRespuestaSesion(usuario));
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

// Expone las reglas al frontend para mantener la UI y la API sincronizadas.
const obtenerReglasContrasena = async (_req, res) => {
  return res.json({ reglas: REGLAS_CONTRASENA });
};

// Inicia la recuperacion de acceso enviando un codigo temporal al correo registrado.
const solicitarRestablecimiento = async (req, res) => {
  try {
    const { correo = '' } = req.body;
    const correoNormalizado = correo.trim().toLowerCase();

    const usuario = await Usuario.findOne({ correo: correoNormalizado });
    if (!usuario) {
      return res.json({
        mensaje: 'Si el correo existe en Vyrox, recibira un codigo de restablecimiento.',
      });
    }

    const codigo = generarCodigoDosPasos();
    const codigoHash = await cifrarCodigoDosPasos(codigo);
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

    usuario.restablecimiento = {
      codigoHash,
      expiraEn,
      ultimoEnvio: new Date(),
    };

    await usuario.save();

    const resultadoEnvio = await enviarCodigoRestablecimiento({
      correo: usuario.correo,
      nombre: usuario.nombre,
      codigo,
    });

    return res.json({
      mensaje:
        resultadoEnvio?.modoEntrega === 'correo'
          ? 'Codigo de restablecimiento enviado al correo registrado'
          : 'Codigo de restablecimiento generado en modo local. Revise la consola del servidor.',
      desafioId: usuario._id,
      correo: resultadoEnvio?.destinatario || usuario.correo,
      expiraEnMinutos: 10,
      modoEntrega: resultadoEnvio?.modoEntrega || 'correo',
    });
  } catch (error) {
    if (error.message.includes('SMTP')) {
      return res.status(503).json({
        mensaje:
          'No se pudo enviar el codigo de restablecimiento por correo. Revise la configuracion SMTP del servidor.',
        error: error.message,
      });
    }

    return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

// Completa la recuperacion usando el codigo temporal y una nueva contrasena segura.
const restablecerContrasena = async (req, res) => {
  try {
    const { desafioId = '', codigo = '', nuevaContrasena = '' } = req.body;

    const usuario = await Usuario.findById(desafioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Solicitud de restablecimiento no encontrada' });
    }

    if (!usuario.restablecimiento?.codigoHash || !usuario.restablecimiento?.expiraEn) {
      return res.status(400).json({ mensaje: 'No hay un restablecimiento pendiente para este usuario' });
    }

    if (new Date(usuario.restablecimiento.expiraEn).getTime() < Date.now()) {
      usuario.restablecimiento.codigoHash = '';
      usuario.restablecimiento.expiraEn = null;
      await usuario.save();
      return res.status(400).json({ mensaje: 'El codigo de restablecimiento ya expiro' });
    }

    const codigoValido = await compararCodigoDosPasos(codigo, usuario.restablecimiento.codigoHash);
    if (!codigoValido) {
      return res.status(400).json({ mensaje: 'El codigo de restablecimiento es incorrecto' });
    }

    const validacion = validarContrasena(nuevaContrasena);
    if (!validacion.esValida) {
      return res.status(400).json({
        mensaje: 'La nueva contrasena no cumple con los requisitos de seguridad.',
        errores: validacion.errores,
        reglas: REGLAS_CONTRASENA,
      });
    }

    const sal = await bcrypt.genSalt(10);
    usuario.contrasena = await bcrypt.hash(nuevaContrasena, sal);
    usuario.restablecimiento.codigoHash = '';
    usuario.restablecimiento.expiraEn = null;
    await usuario.save();

    return res.json({ mensaje: 'Contrasena restablecida correctamente' });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  registrar,
  iniciarSesion,
  verificarDosPasos,
  obtenerReglasContrasena,
  solicitarRestablecimiento,
  restablecerContrasena,
};

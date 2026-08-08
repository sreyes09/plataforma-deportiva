const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Lee la configuración SMTP desde variables de entorno para centralizar su uso.
const obtenerConfiguracionSmtp = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  return {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  };
};

// Permite detectar rápidamente si el servidor ya puede enviar correos reales.
const smtpConfigurado = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = obtenerConfiguracionSmtp();
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
};

// En desarrollo no bloqueamos el acceso si el correo aún no fue configurado.
const usarRespaldoLocal = () =>
  process.env.NODE_ENV !== 'production' || process.env.SMTP_PERMITIR_RESPALDO_LOCAL === 'true';

// Construye el transporte SMTP a partir de las variables configuradas.
const crearTransporteCorreo = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = obtenerConfiguracionSmtp();

  if (!smtpConfigurado()) {
    throw new Error(
      'Faltan variables SMTP para enviar correos. Configure SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.',
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// Guarda el código en consola únicamente para pruebas locales cuando aún no hay SMTP.
const registrarCodigoEnConsola = ({ correo, nombre, codigo }) => {
  console.log(
    `[2FA LOCAL] Usuario: ${nombre} | Correo: ${correo} | C\u00f3digo temporal: ${codigo}`,
  );
};

// Guarda un historial temporal de envios para comprobar destinatario y resultado del correo.
const registrarLogCorreo = (linea) => {
  const carpetaLogs = path.join(__dirname, '..', 'logs');
  const archivoLogs = path.join(carpetaLogs, 'correos.log');

  if (!fs.existsSync(carpetaLogs)) {
    fs.mkdirSync(carpetaLogs, { recursive: true });
  }

  fs.appendFileSync(archivoLogs, `${linea}\n`, 'utf8');
};

// Envía el código temporal del segundo factor al correo registrado del usuario.
const enviarCodigoDosPasos = async ({ correo, nombre, codigo }) => {
  const destinatario = String(correo || '').trim().toLowerCase();
  const marcaTiempo = new Date().toISOString();

  if (!smtpConfigurado()) {
    if (!usarRespaldoLocal()) {
      throw new Error(
        'Faltan variables SMTP para enviar correos. Configure SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.',
      );
    }

    registrarCodigoEnConsola({ correo: destinatario, nombre, codigo });
    registrarLogCorreo(
      `[${marcaTiempo}] MODO=LOCAL | USUARIO=${nombre} | DESTINATARIO=${destinatario} | CODIGO=${codigo}`
    );
    return { modoEntrega: 'consola-local', destinatario };
  }

  const transporte = crearTransporteCorreo();
  const remitente = process.env.SMTP_FROM || process.env.SMTP_USER;

  const info = await transporte.sendMail({
    from: `"Vyrox" <${remitente}>`,
    to: destinatario,
    replyTo: remitente,
    subject: 'Codigo de acceso a Vyrox',
    text: `Hola ${nombre}.\n\nTu codigo de verificacion para iniciar sesion en Vyrox es: ${codigo}\n\nEste codigo vence en 10 minutos.\n\nSi no solicitaste este acceso, puedes ignorar este mensaje.\n`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 16px;">Vyrox</h2>
        <p>Hola ${nombre},</p>
        <p>Tu codigo de verificacion para iniciar sesion es:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 18px 0;">
          ${codigo}
        </p>
        <p>Este codigo vence en 10 minutos.</p>
        <p>Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      </div>
    `,
  });

  const lineaLog =
    `[${marcaTiempo}] MODO=CORREO | REMITENTE=${remitente} | DESTINATARIO=${destinatario} | ` +
    `MESSAGE_ID=${info.messageId} | ACEPTADOS=${(info.accepted || []).join(',') || 'ninguno'}`;

  console.log(`[2FA MAIL] ${lineaLog}`);
  registrarLogCorreo(lineaLog);

  return {
    modoEntrega: 'correo',
    destinatario,
    messageId: info.messageId,
    accepted: info.accepted || [],
  };
};

module.exports = {
  enviarCodigoDosPasos,
  enviarCodigoRestablecimiento: async ({ correo, nombre, codigo }) => {
    const destinatario = String(correo || '').trim().toLowerCase();
    const marcaTiempo = new Date().toISOString();

    if (!smtpConfigurado()) {
      if (!usarRespaldoLocal()) {
        throw new Error(
          'Faltan variables SMTP para enviar correos. Configure SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.',
        );
      }

      registrarCodigoEnConsola({ correo: destinatario, nombre, codigo });
      registrarLogCorreo(
        `[${marcaTiempo}] MODO=LOCAL-RESET | USUARIO=${nombre} | DESTINATARIO=${destinatario} | CODIGO=${codigo}`
      );
      return { modoEntrega: 'consola-local', destinatario };
    }

    const transporte = crearTransporteCorreo();
    const remitente = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporte.sendMail({
      from: `"Vyrox" <${remitente}>`,
      to: destinatario,
      replyTo: remitente,
      subject: 'Codigo para restablecer tu contrasena en Vyrox',
      text: `Hola ${nombre}.\n\nTu codigo para restablecer la contrasena de Vyrox es: ${codigo}\n\nEste codigo vence en 10 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.\n`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 16px;">Vyrox</h2>
          <p>Hola ${nombre},</p>
          <p>Tu codigo para restablecer la contrasena es:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 18px 0;">
            ${codigo}
          </p>
          <p>Este codigo vence en 10 minutos.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      `,
    });

    const lineaLog =
      `[${marcaTiempo}] MODO=CORREO-RESET | REMITENTE=${remitente} | DESTINATARIO=${destinatario} | ` +
      `MESSAGE_ID=${info.messageId} | ACEPTADOS=${(info.accepted || []).join(',') || 'ninguno'}`;

    console.log(`[RESET MAIL] ${lineaLog}`);
    registrarLogCorreo(lineaLog);

    return {
      modoEntrega: 'correo',
      destinatario,
      messageId: info.messageId,
      accepted: info.accepted || [],
    };
  },
  smtpConfigurado,
};

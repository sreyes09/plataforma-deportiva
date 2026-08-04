// Reglas compartidas con la interfaz para explicar la seguridad de la contraseña.
// Este objeto sirve como respaldo si el backend todavia no devolvio su configuracion.
export const reglasContrasenaPorDefecto = {
  longitudMinima: 8,
  requiereMayuscula: true,
  requiereMinuscula: true,
  requiereNumero: true,
  requiereCaracterEspecial: true,
}

// Evalúa visualmente cada requisito para darle retroalimentación inmediata al usuario.
export const validarContrasenaCliente = (
  contrasena = '',
  reglas = reglasContrasenaPorDefecto,
) => {
  // Cada validacion se calcula por separado para poder mostrar al usuario
  // exactamente que requisito ya cumple y cual todavia falta.
  const validaciones = [
    {
      id: 'longitud',
      texto: `Mínimo ${reglas.longitudMinima} caracteres`,
      cumplida: contrasena.length >= reglas.longitudMinima,
    },
    {
      id: 'mayuscula',
      texto: 'Al menos una mayúscula',
      cumplida: !reglas.requiereMayuscula || /[A-Z]/.test(contrasena),
    },
    {
      id: 'minuscula',
      texto: 'Al menos una minúscula',
      cumplida: !reglas.requiereMinuscula || /[a-z]/.test(contrasena),
    },
    {
      id: 'numero',
      texto: 'Al menos un número',
      cumplida: !reglas.requiereNumero || /\d/.test(contrasena),
    },
    {
      id: 'especial',
      texto: 'Al menos un carácter especial',
      cumplida: !reglas.requiereCaracterEspecial || /[^A-Za-z0-9]/.test(contrasena),
    },
  ]

  return {
    validaciones,
    esValida: validaciones.every((item) => item.cumplida),
  }
}

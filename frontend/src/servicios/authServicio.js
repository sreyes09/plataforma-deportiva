import axios from 'axios'

// Servicio centralizado para todas las operaciones de autenticacion.
const URL_BASE = 'http://localhost:5000/api'

const authServicio = {
  // Crea una cuenta nueva y devuelve el usuario con su token inicial.
  registrar: async (datos) => {
    const respuesta = await axios.post(`${URL_BASE}/auth/registrar`, datos)
    return respuesta.data
  },

  // Ejecuta el primer paso del login: valida credenciales y dispara el codigo 2FA.
  iniciarSesion: async (datos) => {
    const respuesta = await axios.post(`${URL_BASE}/auth/iniciar-sesion`, datos)
    return respuesta.data
  },

  // Ejecuta el segundo paso del login usando el desafio y el codigo temporal.
  verificarDosPasos: async (datos) => {
    const respuesta = await axios.post(`${URL_BASE}/auth/verificar-dos-pasos`, datos)
    return respuesta.data
  },

  // Permite que el frontend consulte las mismas reglas de seguridad del backend.
  obtenerReglasContrasena: async () => {
    const respuesta = await axios.get(`${URL_BASE}/auth/reglas-contrasena`)
    return respuesta.data
  },
}

export default authServicio

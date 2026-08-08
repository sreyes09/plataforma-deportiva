import axios from 'axios'

// Servicio que encapsula todas las operaciones protegidas del tablero.
const URL_BASE = 'http://localhost:5000/api'

// Recupera el token guardado localmente para autorizar peticiones privadas.
const obtenerToken = () => localStorage.getItem('token')

// Inserta el JWT en el encabezado Authorization de cada solicitud al panel.
const obtenerConfiguracion = () => ({
  headers: {
    Authorization: `Bearer ${obtenerToken()}`,
  },
})

const panelServicio = {
  // Pide al backend todo el panel ya adaptado al rol del usuario.
  obtener: async () => {
    const respuesta = await axios.get(`${URL_BASE}/panel`, obtenerConfiguracion())
    return respuesta.data
  },

  // Guarda cambios generales del panel: perfil, estadisticas, metas, etc.
  actualizar: async (datos) => {
    const respuesta = await axios.put(`${URL_BASE}/panel`, datos, obtenerConfiguracion())
    return respuesta.data
  },

  // Relaciona al entrenador con una cuenta real de deportista usando su correo.
  vincularDeportista: async (correo) => {
    const respuesta = await axios.post(
      `${URL_BASE}/panel/deportistas/vincular`,
      { correo },
      obtenerConfiguracion()
    )
    return respuesta.data
  },

  // Permite al administrador activar o desactivar cuentas del sistema.
  actualizarEstadoUsuario: async (usuarioId, estado) => {
    const respuesta = await axios.patch(
      `${URL_BASE}/panel/usuarios/${usuarioId}/estado`,
      { estado },
      obtenerConfiguracion()
    )
    return respuesta.data
  },
}

export default panelServicio

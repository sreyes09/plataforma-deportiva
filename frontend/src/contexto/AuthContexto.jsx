import { useState } from 'react'
import { AuthContexto } from './AuthContextoContext'

// Proveedor global que conserva la sesion del usuario autenticado.
export function AuthProveedor({ children }) {
  // La sesion inicial se reconstruye desde localStorage para no perder
  // el acceso cuando el usuario recarga la pagina.
  const [usuario, setUsuario] = useState(
    JSON.parse(localStorage.getItem('usuario')) || null,
  )

  // Guarda token y usuario para mantener la sesion aun al recargar la pagina.
  const guardarSesion = (datos) => {
    localStorage.setItem('token', datos.token)
    localStorage.setItem('usuario', JSON.stringify(datos.usuario))
    setUsuario(datos.usuario)
  }

  // Limpia la sesion actual y devuelve la aplicacion al estado publico.
  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  // El provider expone el usuario actual y las acciones necesarias
  // para crear o destruir la sesion desde cualquier pantalla.
  return (
    <AuthContexto.Provider value={{ usuario, guardarSesion, cerrarSesion }}>
      {children}
    </AuthContexto.Provider>
  )
}

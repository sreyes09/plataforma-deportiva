import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexto/useAuth'

// Evita que usuarios sin sesion entren al tablero.
function RutaProtegida({ children }) {
  const { usuario } = useAuth()

  // Si no hay usuario autenticado en el contexto, se redirige al login.
  if (!usuario) {
    return <Navigate to="/" />
  }

  // Si la sesion existe, la ruta renderiza normalmente su contenido.
  return children
}

export default RutaProtegida

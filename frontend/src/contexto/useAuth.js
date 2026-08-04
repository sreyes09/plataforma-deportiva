import { useContext } from 'react'
import { AuthContexto } from './AuthContextoContext'

// Hook de conveniencia para consumir el contexto de autenticacion.
// Evita repetir useContext(AuthContexto) en cada componente.
export function useAuth() {
  return useContext(AuthContexto)
}

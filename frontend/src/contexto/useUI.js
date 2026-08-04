import { useContext } from 'react'
import { UIContexto } from './UIContextoContext'

// Atajo para acceder a tema e idioma sin repetir useContext en cada pantalla.
export function useUI() {
  return useContext(UIContexto)
}

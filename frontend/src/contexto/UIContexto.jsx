import { useEffect, useMemo, useState } from 'react'
import { UIContexto } from './UIContextoContext'

const TEMA_INICIAL = 'dark'
const IDIOMA_INICIAL = 'es'

// Mantiene centralizadas las preferencias de apariencia para que toda la app
// pueda reaccionar al modo claro/oscuro y al idioma seleccionado.
export function UIProveedor({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem('vyrox-tema') || TEMA_INICIAL)
  const [idioma, setIdioma] = useState(() => localStorage.getItem('vyrox-idioma') || IDIOMA_INICIAL)

  // Refleja el tema en el documento para que las variables CSS cambien
  // sin tener que repetir clases visuales en cada componente.
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    localStorage.setItem('vyrox-tema', tema)
  }, [tema])

  // Guarda el idioma actual para mantener la preferencia al recargar.
  useEffect(() => {
    localStorage.setItem('vyrox-idioma', idioma)
  }, [idioma])

  const alternarTema = () => {
    setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))
  }

  const alternarIdioma = () => {
    setIdioma((actual) => (actual === 'es' ? 'en' : 'es'))
  }

  const valor = useMemo(() => ({
    tema,
    idioma,
    alternarTema,
    alternarIdioma,
    esOscuro: tema === 'dark',
    t: (es, en) => (idioma === 'en' ? en : es),
  }), [idioma, tema])

  return (
    <UIContexto.Provider value={valor}>
      {children}
    </UIContexto.Provider>
  )
}

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RutaProtegida from './componentes/RutaProtegida'
import Inicio from './paginas/inicio'
import Registro from './paginas/registro'
import Tablero from './paginas/tablero'

// Define la navegacion principal entre vistas publicas y privadas.
// Las rutas de inicio y registro son publicas.
// La ruta del tablero queda protegida por RutaProtegida para obligar
// a que exista una sesion valida antes de entrar.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<Registro />} />
        <Route
          path="/tablero"
          element={(
            <RutaProtegida>
              <Tablero />
            </RutaProtegida>
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

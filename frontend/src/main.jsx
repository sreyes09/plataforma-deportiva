import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProveedor } from './contexto/AuthContexto.jsx'
import { UIProveedor } from './contexto/UIContexto.jsx'

// Punto de entrada del frontend.
// Aqui se monta React sobre el elemento root y se envuelve toda la app
// con el proveedor de autenticacion para que cualquier pantalla pueda
// consultar la sesion actual.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UIProveedor>
      <AuthProveedor>
        <App />
      </AuthProveedor>
    </UIProveedor>
  </StrictMode>,
)

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotonPrimario, CampoEntrada, ControlPreferencia, IndicadorCarga, SelectEntrada, Superficie } from '../componentes/uiBase'
import { useAuth } from '../contexto/useAuth'
import { useUI } from '../contexto/useUI'
import authServicio from '../servicios/authServicio'
import {
  reglasContrasenaPorDefecto,
  validarContrasenaCliente,
} from '../utils/seguridadAuth'

// Pantalla de registro con validación explícita de seguridad para la contraseña.
function Registro() {
  const [formulario, setFormulario] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    rol: 'deportista',
  })
  const [reglasContrasena, setReglasContrasena] = useState(reglasContrasenaPorDefecto)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { guardarSesion } = useAuth()
  const { alternarIdioma, alternarTema, esOscuro, idioma, t, tema } = useUI()
  const navegar = useNavigate()

  // Carga las reglas desde el backend para que la interfaz y la API usen la misma política.
  useEffect(() => {
    const cargarReglas = async () => {
      try {
        const respuesta = await authServicio.obtenerReglasContrasena()
        if (respuesta?.reglas) {
          setReglasContrasena(respuesta.reglas)
        }
      } catch {
        setReglasContrasena(reglasContrasenaPorDefecto)
      }
    }

    cargarReglas()
  }, [])

  const validacionContrasena = useMemo(
    () => validarContrasenaCliente(formulario.contrasena, reglasContrasena),
    [formulario.contrasena, reglasContrasena],
  )

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value })
  }

  // Registra al usuario solo si la contraseña cumple con las reglas configuradas.
  const manejarRegistro = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    if (!validacionContrasena.esValida) {
      setError(t('La contraseña aún no cumple con todos los requisitos de seguridad.', 'The password does not meet every security requirement yet.'))
      setCargando(false)
      return
    }

    try {
      const datos = await authServicio.registrar(formulario)
      guardarSesion(datos)
      navegar('/tablero')
    } catch (err) {
      const errores = err.response?.data?.errores
      setError(errores?.length ? errores.join(' ') : (err.response?.data?.mensaje || t('Error al registrarse', 'Registration failed')))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Superficie className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <ControlPreferencia
            etiqueta="Theme"
            valor={tema === 'dark' ? 'Dark' : 'Light'}
            onClick={alternarTema}
          />
          <ControlPreferencia
            etiqueta="Lang"
            valor={idioma.toUpperCase()}
            onClick={alternarIdioma}
          />
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-2 w-24 rounded-full bg-[linear-gradient(90deg,#22d3ee,#2563eb)] shadow-[0_0_24px_rgba(34,211,238,0.45)]" />
          <h1 className="text-4xl font-black uppercase tracking-[0.35em] text-cyan-300">Vyrox</h1>
          <h2 className={`mt-3 text-3xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
            {t('Crear cuenta', 'Create account')}
          </h2>
          <p className={`mt-2 ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('Únase a Vyrox y empiece a registrar su progreso', 'Join Vyrox and start tracking your progress')}
          </p>
        </div>

        {error && (
          <div className={`mb-4 rounded-2xl border p-4 text-center text-sm ${
            esOscuro
              ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={manejarRegistro} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Nombre', 'First name')}
            </label>
            <CampoEntrada
              type="text"
              name="nombre"
              placeholder={t('Su nombre', 'Your first name')}
              value={formulario.nombre}
              onChange={manejarCambio}
              required
            />
          </div>

          <div>
            <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Apellidos', 'Last name')}
            </label>
            <CampoEntrada
              type="text"
              name="apellidos"
              placeholder={t('Sus apellidos', 'Your last name')}
              value={formulario.apellidos}
              onChange={manejarCambio}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Correo electrónico', 'Email')}
            </label>
            <CampoEntrada
              type="email"
              name="correo"
              placeholder="correo@ejemplo.com"
              value={formulario.correo}
              onChange={manejarCambio}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Contraseña', 'Password')}
            </label>
            <CampoEntrada
              type="password"
              name="contrasena"
              placeholder="********"
              value={formulario.contrasena}
              onChange={manejarCambio}
              required
            />
            <div className={`mt-3 rounded-2xl border p-4 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/55'
                : 'border-slate-200 bg-slate-50/95'
            }`}>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                {t('Requisitos de seguridad', 'Security requirements')}
              </p>
              <div className="mt-2 space-y-2">
                {validacionContrasena.validaciones.map((item) => (
                  <p
                    key={item.id}
                    className={`text-sm ${item.cumplida ? 'text-emerald-400' : (esOscuro ? 'text-slate-300' : 'text-slate-600')}`}
                  >
                    {item.cumplida ? t('Cumple', 'Met') : t('Pendiente', 'Pending')}: {item.texto}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Rol', 'Role')}
            </label>
            <SelectEntrada
              name="rol"
              value={formulario.rol}
              onChange={manejarCambio}
            >
              <option value="deportista">{t('Deportista', 'Athlete')}</option>
              <option value="entrenador">{t('Entrenador', 'Coach')}</option>
            </SelectEntrada>
          </div>

          <div className="md:col-span-2">
            <BotonPrimario
              type="submit"
              disabled={cargando || !validacionContrasena.esValida}
              className="mt-2 w-full"
            >
              {cargando ? t('Registrando...', 'Creating account...') : t('Registrarse', 'Create account')}
            </BotonPrimario>
          </div>

          {cargando && (
            <div className="md:col-span-2">
              <IndicadorCarga texto={t('Guardando usuario en la plataforma...', 'Saving user into the platform...')} />
            </div>
          )}

          <p className={`md:col-span-2 text-center text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('¿Ya tiene cuenta?', 'Already have an account?')}{' '}
            <span
              onClick={() => navegar('/')}
              className="cursor-pointer font-semibold text-cyan-400 hover:underline"
            >
              {t('Inicie sesión', 'Sign in')}
            </span>
          </p>
        </form>
      </Superficie>
    </div>
  )
}

export default Registro

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotonPrimario, BotonSecundario, CampoEntrada, ControlPreferencia, IndicadorCarga, Superficie } from '../componentes/uiBase'
import { useAuth } from '../contexto/useAuth'
import { useUI } from '../contexto/useUI'
import authServicio from '../servicios/authServicio'

const enmascararCorreo = (correo = '') => {
  const [usuario = '', dominio = ''] = String(correo).split('@')
  if (!usuario || !dominio) return correo
  const prefijo = usuario.slice(0, 2)
  return `${prefijo}${'*'.repeat(Math.max(usuario.length - 2, 1))}@${dominio}`
}

// Pantalla de acceso con flujo de dos pasos: credenciales y código temporal.
function Inicio() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [codigo, setCodigo] = useState('')
  const [desafio, setDesafio] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { guardarSesion } = useAuth()
  const { alternarIdioma, alternarTema, esOscuro, idioma, t, tema } = useUI()
  const navegar = useNavigate()

  // Primer paso: valida credenciales y solicita el código temporal.
  const manejarCredenciales = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    setMensaje('')

    try {
      const datos = await authServicio.iniciarSesion({ correo, contrasena })
      setDesafio(datos)
      setMensaje(
        datos.modoEntrega === 'correo'
          ? t(
              `Revise el correo registrado ${enmascararCorreo(datos.correo)} para obtener el código temporal.`,
              `Check the registered email ${enmascararCorreo(datos.correo)} to get the temporary code.`,
            )
          : t(
              'Revise la consola del servidor para obtener el código temporal en este entorno local.',
              'Check the server console to retrieve the temporary code in this local environment.',
            ),
      )
    } catch (err) {
      setError(err.response?.data?.mensaje || t('Error al iniciar sesión', 'Sign-in failed'))
    } finally {
      setCargando(false)
    }
  }

  // Segundo paso: confirma el código y crea la sesión definitiva.
  const manejarVerificacion = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    try {
      const datos = await authServicio.verificarDosPasos({
        desafioId: desafio?.desafioId,
        codigo,
      })
      guardarSesion(datos)
      navegar('/tablero')
    } catch (err) {
      setError(err.response?.data?.mensaje || t('No se pudo completar la verificación', 'Verification could not be completed'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Superficie className="w-full max-w-md">
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
            {desafio ? t('Verificación en dos pasos', 'Two-step verification') : t('Iniciar sesión', 'Sign in')}
          </h2>
          <p className={`mt-2 ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {desafio
              ? t('Ingrese el código temporal para completar el acceso', 'Enter the temporary code to complete access')
              : t('Acceda a su cuenta deportiva', 'Access your sports account')}
          </p>
        </div>

        {mensaje && (
          <div className={`mb-4 rounded-2xl border p-4 text-center text-sm ${
            esOscuro
              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
              : 'border-cyan-300 bg-cyan-50 text-cyan-900'
          }`}>
            {mensaje}
          </div>
        )}

        {error && (
          <div className={`mb-4 rounded-2xl border p-4 text-center text-sm ${
            esOscuro
              ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}>
            {error}
          </div>
        )}

        {!desafio ? (
          <form onSubmit={manejarCredenciales} className="flex flex-col gap-4">
            <div>
              <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('Correo electrónico', 'Email')}
              </label>
              <CampoEntrada
                type="email"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('Contraseña', 'Password')}
              </label>
              <CampoEntrada
                type="password"
                placeholder="********"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            <BotonPrimario type="submit" disabled={cargando} className="mt-2 w-full">
              {cargando ? t('Validando credenciales...', 'Validating credentials...') : t('Continuar', 'Continue')}
            </BotonPrimario>

            {cargando && (
              <IndicadorCarga texto={t('Consultando al servidor...', 'Contacting the server...')} />
            )}

            <p className={`text-center text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('¿No tiene cuenta?', 'Do not have an account?')}{' '}
              <span
                onClick={() => navegar('/registro')}
                className="cursor-pointer font-semibold text-cyan-400 hover:underline"
              >
                {t('Regístrese', 'Register')}
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={manejarVerificacion} className="flex flex-col gap-4">
            <div>
              <label className={`mb-2 block text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('Código temporal', 'Temporary code')}
              </label>
              <CampoEntrada
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <BotonPrimario type="submit" disabled={cargando} className="mt-2 w-full">
              {cargando ? t('Verificando código...', 'Verifying code...') : t('Verificar y entrar', 'Verify and enter')}
            </BotonPrimario>

            {cargando && (
              <IndicadorCarga texto={t('Confirmando segundo factor...', 'Confirming second factor...')} />
            )}

            <BotonSecundario
              type="button"
              onClick={() => {
                setDesafio(null)
                setCodigo('')
                setMensaje('')
                setError('')
              }}
              className="w-full"
            >
              {t('Volver al primer paso', 'Back to first step')}
            </BotonSecundario>
          </form>
        )}
      </Superficie>
    </div>
  )
}

export default Inicio

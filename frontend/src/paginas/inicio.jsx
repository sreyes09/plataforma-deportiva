import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotonPrimario, BotonSecundario, IndicadorCarga } from '../componentes/uiBase'
import { useAuth } from '../contexto/useAuth'
import { useUI } from '../contexto/useUI'
import authServicio from '../servicios/authServicio'
import {
  reglasContrasenaPorDefecto,
  validarContrasenaCliente,
} from '../utils/seguridadAuth'

// Enmascara el correo para mostrar al usuario a dónde fue enviado el código.
const enmascararCorreo = (correo = '') => {
  const [usuario = '', dominio = ''] = String(correo).split('@')
  if (!usuario || !dominio) return correo
  const prefijo = usuario.slice(0, 2)
  return `${prefijo}${'*'.repeat(Math.max(usuario.length - 2, 1))}@${dominio}`
}

// Iconos simples en SVG para mantener el diseño consistente sin dependencias extra.
function Icono({ tipo, className = 'h-5 w-5' }) {
  const iconos = {
    usuario: (
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z"
        fill="currentColor"
      />
    ),
    correo: (
      <path
        d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm8 6 8-4H4l8 4Zm8-1.764-7.47 3.735a1.2 1.2 0 0 1-1.06 0L4 10.236V16h16v-5.764Z"
        fill="currentColor"
      />
    ),
    candado: (
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z"
        fill="currentColor"
      />
    ),
    luna: (
      <path
        d="M14.53 3.47A8.2 8.2 0 0 0 20 11.28 8 8 0 1 1 11.28 2a8.2 8.2 0 0 0 3.25 1.47Z"
        fill="currentColor"
      />
    ),
    idioma: (
      <path
        d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm6.93 9h-3.01a15.9 15.9 0 0 0-1.28-5.07A8.02 8.02 0 0 1 18.93 11ZM12 4.07c.93 1.14 1.9 3.35 2.29 6.93H9.71C10.1 7.42 11.07 5.21 12 4.07ZM4.99 13h3.01a15.9 15.9 0 0 0 1.28 5.07A8.02 8.02 0 0 1 4.99 13Zm3.01-2H4.99a8.02 8.02 0 0 1 4.29-5.07A15.9 15.9 0 0 0 8 11Zm4 8.93c-.93-1.14-1.9-3.35-2.29-6.93h4.58c-.39 3.58-1.36 5.79-2.29 6.93ZM14.72 18.07A15.9 15.9 0 0 0 16 13h3.01a8.02 8.02 0 0 1-4.29 5.07Z"
        fill="currentColor"
      />
    ),
    flecha: (
      <path
        d="M13.172 12 8.222 7.05l1.414-1.414L16 12l-6.364 6.364-1.414-1.414L13.172 12Z"
        fill="currentColor"
      />
    ),
    grafico: (
      <path d="M5 19V9h3v10H5Zm5 0V5h3v14h-3Zm5 0v-7h3v7h-3Z" fill="currentColor" />
    ),
    atleta: (
      <path
        d="M14.5 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM8.8 10.1l2.6 1.5-1.3 2.4-2.3 1.5 1.1 1.7 3.1-2 1.6-3 1.6 1.1V19h2v-6.8l-2.4-1.7.6-1.2 1.8.9.9-1.8-2.7-1.3a2 2 0 0 0-2.7.8l-.8 1.5-1.5-.8a2 2 0 0 0-2.6.6l-1.3 2 1.7 1.1 1.2-1.8Z"
        fill="currentColor"
      />
    ),
    escudo: (
      <path
        d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3Zm1 12h3v2h-3v3h-2v-3H8v-2h3V9h2v5Z"
        fill="currentColor"
      />
    ),
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {iconos[tipo]}
    </svg>
  )
}

// Campo visual con icono para acercarnos a la referencia del mockup.
function CampoConIcono({
  etiqueta,
  icono,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  maxLength,
  inputMode,
  esOscuro,
}) {
  return (
    <label className="block">
      <span className={`mb-3 block text-sm font-medium ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{etiqueta}</span>
      <div className={[
        'flex items-center gap-3 rounded-2xl border px-4 py-4 transition focus-within:border-cyan-400/70 focus-within:ring-4 focus-within:ring-cyan-400/10',
        esOscuro ? 'border-white/12 bg-slate-950/70' : 'border-slate-300/80 bg-white/92',
      ].join(' ')}>
        <span className={esOscuro ? 'text-slate-400' : 'text-slate-500'}>
          <Icono tipo={icono} className="h-5 w-5" />
        </span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          inputMode={inputMode}
          className={[
            'w-full bg-transparent text-base outline-none',
            esOscuro ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400',
          ].join(' ')}
        />
      </div>
    </label>
  )
}

// Tarjetas de valor en la parte inferior del panel izquierdo.
function TarjetaCaracteristica({ icono, titulo, descripcion, esOscuro }) {
  return (
    <div
      className={[
        'rounded-[1.6rem] border p-5 transition',
        esOscuro
          ? 'border-white/10 bg-white/5 text-slate-300'
          : 'border-cyan-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,248,255,0.96))] text-slate-700 shadow-[0_14px_28px_rgba(14,116,144,0.1)]',
      ].join(' ')}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.18)] ${esOscuro ? 'border-cyan-400/35 bg-cyan-400/6' : 'border-cyan-500/45 bg-cyan-500/12 text-cyan-600'}`}>
        <Icono tipo={icono} className="h-8 w-8" />
      </div>
      <div className="mt-4">
        <p className={`text-xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{titulo}</p>
        <p className={`mt-2 text-sm leading-7 ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{descripcion}</p>
      </div>
    </div>
  )
}

// Ilustración UI abstracta para simular el panel analítico del mockup.
function ResumenVisual({ esOscuro }) {
  return (
    <div className={[
      'relative mt-10 min-h-[20rem] overflow-hidden rounded-[2rem] border p-6 shadow-[0_30px_80px_rgba(5,11,24,0.25)]',
      esOscuro
        ? 'border-cyan-400/12 bg-[radial-gradient(circle_at_top,#10204c_0%,#081224_58%,#050b18_100%)]'
        : 'border-cyan-500/15 bg-[radial-gradient(circle_at_top,#dff6ff_0%,#f8fbff_58%,#ebf6ff_100%)]',
    ].join(' ')}>
      <div className={`absolute -left-10 bottom-10 h-44 w-44 rounded-full blur-3xl ${esOscuro ? 'bg-cyan-500/10' : 'bg-cyan-500/12'}`} />
      <div className={`absolute right-6 top-8 h-28 w-28 rounded-full blur-2xl ${esOscuro ? 'bg-blue-500/10' : 'bg-blue-500/12'}`} />

      <div className="relative z-10 ml-auto max-w-[22rem] space-y-4">
        <div className={`rounded-[1.6rem] border p-5 ${esOscuro ? 'border-cyan-400/15 bg-slate-950/60' : 'border-cyan-500/15 bg-white/88'}`}>
          <div className="mb-4 flex items-center justify-between">
            <p className={`text-sm font-medium ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Resumen semanal</p>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">Live</span>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex h-24 flex-1 items-end gap-2">
              {[28, 44, 36, 62, 48, 74, 92].map((altura) => (
                <span
                  key={altura}
                  className="flex-1 rounded-t-full bg-[linear-gradient(180deg,#22d3ee,#2563eb)] opacity-90"
                  style={{ height: `${altura}%` }}
                />
              ))}
            </div>
            <div className="ml-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-cyan-400/30">
              <div className="text-center">
                <p className={`text-3xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>87%</p>
                <p className={`text-[11px] uppercase tracking-[0.2em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Meta</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`rounded-[1.4rem] border p-5 ${esOscuro ? 'border-white/10 bg-slate-950/55' : 'border-slate-300/70 bg-white/88'}`}>
            <p className={`text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Distancia</p>
            <p className={`mt-3 text-3xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>25.4 km</p>
          </div>
          <div className={`rounded-[1.4rem] border p-5 ${esOscuro ? 'border-white/10 bg-slate-950/55' : 'border-slate-300/70 bg-white/88'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Sesiones</p>
                <p className={`mt-3 text-3xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>12</p>
              </div>
              <span className="text-cyan-300">
                <Icono tipo="grafico" className="h-10 w-10" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-36 w-full ${esOscuro ? 'bg-[linear-gradient(180deg,transparent,rgba(2,8,23,0.75))]' : 'bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.72))]'}`} />
      <div className="absolute bottom-6 left-8 hidden max-w-[18rem] lg:block">
        <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Vyrox analytics</p>
        <p className={`mt-3 text-sm leading-7 ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
          Metricas individuales, avances por metas y seguimiento real desde una sola vista.
        </p>
      </div>
    </div>
  )
}

// Botones superiores de tema e idioma con estilo mas cercano a la referencia.
function BarraPreferencias({ idioma, alternarIdioma, alternarTema, esOscuro, t, tema }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={alternarTema}
        title={tema === 'dark' ? t('Tema: oscuro', 'Theme: dark') : t('Tema: claro', 'Theme: light')}
        className={[
          'flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] transition hover:border-cyan-400/40 sm:w-auto',
          esOscuro
            ? 'border-white/12 bg-slate-900/70 text-slate-100 hover:text-cyan-300'
            : 'border-cyan-300/80 bg-white/92 text-slate-800 shadow-[0_10px_24px_rgba(14,116,144,0.12)] hover:text-cyan-600',
        ].join(' ')}
      >
        <Icono tipo="luna" className="h-5 w-5" />
        <span>{tema === 'dark' ? t('Tema: oscuro', 'Theme: dark') : t('Tema: claro', 'Theme: light')}</span>
      </button>
      <button
        type="button"
        onClick={alternarIdioma}
        className={[
          'flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition hover:border-cyan-400/40 sm:w-auto',
          esOscuro
            ? 'border-white/12 bg-slate-900/70 text-slate-100'
            : 'border-cyan-300/80 bg-white/92 text-slate-800 shadow-[0_10px_24px_rgba(14,116,144,0.12)]',
        ].join(' ')}
      >
        <Icono tipo="idioma" className={`h-5 w-5 ${esOscuro ? 'text-cyan-300' : 'text-cyan-600'}`} />
        <span>{idioma === 'es' ? 'Idioma: Español' : 'Language: English'}</span>
        <span className={esOscuro ? 'text-slate-400' : 'text-slate-500'}>▾</span>
      </button>
    </div>
  )
}

// Pantalla principal de acceso con flujo de dos pasos.
function Inicio() {
  const [vistaAcceso, setVistaAcceso] = useState('login')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [codigo, setCodigo] = useState('')
  const [desafio, setDesafio] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarRestablecimiento, setMostrarRestablecimiento] = useState(false)
  const [desafioRestablecimiento, setDesafioRestablecimiento] = useState(null)
  const [correoRestablecimiento, setCorreoRestablecimiento] = useState('')
  const [codigoRestablecimiento, setCodigoRestablecimiento] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [reglasContrasena] = useState(reglasContrasenaPorDefecto)
  const { guardarSesion } = useAuth()
  const { alternarIdioma, alternarTema, esOscuro, idioma, t } = useUI()
  const navegar = useNavigate()
  const validacionRestablecimiento = validarContrasenaCliente(nuevaContrasena, reglasContrasena)

  // Primer paso: credenciales y solicitud del codigo temporal.
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
              `Revise el correo registrado ${enmascararCorreo(datos.correo)} para obtener el codigo temporal.`,
              `Check the registered email ${enmascararCorreo(datos.correo)} to get the temporary code.`,
            )
          : t(
              'Revise la consola del servidor para obtener el codigo temporal en este entorno local.',
              'Check the server console to retrieve the temporary code in this local environment.',
            ),
      )
    } catch (err) {
      setError(err.response?.data?.mensaje || t('Error al iniciar sesi?n.', 'Sign-in failed.'))
    } finally {
      setCargando(false)
    }
  }

  // Segundo paso: validación del código y creación de la sesión final.
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
      setError(
        err.response?.data?.mensaje ||
          t('No se pudo completar la verificacion.', 'Verification could not be completed.'),
      )
    } finally {
      setCargando(false)
    }
  }

  // Envia al correo registrado un codigo para iniciar el restablecimiento.
  const manejarSolicitudRestablecimiento = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    setMensaje('')

    try {
      const datos = await authServicio.solicitarRestablecimiento({ correo: correoRestablecimiento })
      setDesafioRestablecimiento(datos)
      setMensaje(
        datos.modoEntrega === 'correo'
          ? t(
              `Revise el correo ${enmascararCorreo(datos.correo)} para obtener el codigo de restablecimiento.`,
              `Check the email ${enmascararCorreo(datos.correo)} to get the recovery code.`,
            )
          : t(
              'Revise la consola del servidor para obtener el codigo de restablecimiento en este entorno local.',
              'Check the server console to get the recovery code in this local environment.',
            ),
      )
    } catch (err) {
      setError(err.response?.data?.mensaje || t('No se pudo iniciar el restablecimiento.', 'Could not start password reset.'))
    } finally {
      setCargando(false)
    }
  }

  // Completa el restablecimiento con codigo temporal y nueva contrasena segura.
  const manejarRestablecimiento = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    if (!validacionRestablecimiento.esValida) {
      setError(t('La nueva contraseña aún no cumple todos los requisitos.', 'The new password does not meet every requirement yet.'))
      setCargando(false)
      return
    }

    try {
      const respuesta = await authServicio.restablecerContrasena({
        desafioId: desafioRestablecimiento?.desafioId,
        codigo: codigoRestablecimiento,
        nuevaContrasena,
      })
      setMensaje(respuesta.mensaje || t('Contrasena restablecida correctamente.', 'Password reset successfully.'))
      setDesafioRestablecimiento(null)
      setCodigoRestablecimiento('')
      setNuevaContrasena('')
      setMostrarRestablecimiento(false)
      setVistaAcceso('login')
    } catch (err) {
      const errores = err.response?.data?.errores
      setError(
        errores?.length
          ? errores.join(' ')
          : err.response?.data?.mensaje || t('No se pudo restablecer la contraseña.', 'Password reset could not be completed.'),
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={[
      'min-h-screen overflow-x-hidden',
      esOscuro
        ? 'bg-[radial-gradient(circle_at_top_left,#0c1c4d_0%,#071225_36%,#040916_100%)] text-white'
        : 'bg-[radial-gradient(circle_at_top_left,#dff3ff_0%,#f4f9ff_38%,#e7f0fb_100%)] text-slate-900',
    ].join(' ')}>
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[1.08fr_0.92fr] xl:gap-10 xl:px-10">
        <div className={`pointer-events-none absolute inset-0 ${esOscuro ? 'bg-[radial-gradient(circle_at_20%_85%,rgba(37,99,235,0.18),transparent_18%),radial-gradient(circle_at_70%_25%,rgba(34,211,238,0.12),transparent_14%)]' : 'bg-[radial-gradient(circle_at_20%_85%,rgba(37,99,235,0.12),transparent_18%),radial-gradient(circle_at_70%_25%,rgba(34,211,238,0.1),transparent_14%)]'}`} />

        <section className={[
          'relative z-10 hidden min-h-[45rem] flex-col justify-between rounded-[2rem] border p-8 shadow-[0_20px_80px_rgba(2,8,23,0.18)] xl:flex xl:p-12',
          esOscuro
            ? 'border-white/6 bg-[linear-gradient(180deg,rgba(6,12,28,0.72),rgba(5,10,22,0.48))]'
            : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,247,255,0.82))]',
        ].join(' ')}>
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#26d0ff,#2559ff)] text-slate-950 shadow-[0_0_30px_rgba(37,99,235,0.35)]">
                <span className="text-2xl font-black">V</span>
              </div>
              <span className={`text-3xl font-semibold tracking-[0.16em] ${esOscuro ? 'text-white' : 'text-slate-900'}`}>VYROX</span>
            </div>
            <div className={`mt-8 h-px w-full ${esOscuro ? 'bg-white/8' : 'bg-slate-200'}`} />

            <div className="mt-12 max-w-[42rem]">
              <h1 className="text-6xl font-black uppercase tracking-tight text-transparent bg-[linear-gradient(90deg,#39d7ff,#1d9eff,#2d5cff)] bg-clip-text md:text-7xl xl:text-8xl">
                VYROX
              </h1>
              <h2 className={`mt-4 max-w-[24rem] text-4xl font-bold leading-tight md:text-5xl ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                {desafio
                  ? t('Proteja su acceso aqui', 'Protect your access here')
                  : t('Tu progreso comienza aqui', 'Your progress starts here')}
              </h2>
              <p className={`mt-6 max-w-[28rem] text-lg leading-8 md:text-xl ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                {desafio
                  ? t(
                      'Confirme el codigo temporal y complete el ingreso a su espacio deportivo seguro.',
                      'Confirm the temporary code and complete access to your secure sports workspace.',
                    )
                  : t(
                      'Construya su historial deportivo, siga sus estadisticas y alcance sus metas.',
                      'Build your sports history, track your stats and reach your goals.',
                    )}
              </p>
            </div>
          </div>

          <ResumenVisual esOscuro={esOscuro} />

          <div className="mt-8 hidden gap-6 md:grid-cols-3 xl:grid">
            <TarjetaCaracteristica
              icono="atleta"
              titulo={t('Perfil deportivo', 'Sports profile')}
              descripcion={t('Personalizable y editable.', 'Customizable and editable.')}
              esOscuro={esOscuro}
            />
            <TarjetaCaracteristica
              icono="grafico"
              titulo={t('Seguimiento', 'Tracking')}
              descripcion={t('Estadisticas y sesiones reales.', 'Real stats and sessions.')}
              esOscuro={esOscuro}
            />
            <TarjetaCaracteristica
              icono="escudo"
              titulo={t('Seguridad 2FA', '2FA security')}
              descripcion={t('Acceso protegido con doble verificacion.', 'Protected access with two-step verification.')}
              esOscuro={esOscuro}
            />
          </div>
        </section>

        <section className="relative z-10 order-1 flex items-start justify-center xl:items-center">
          <div className="w-full max-w-[42rem] xl:max-w-[46rem]">
            <div className="mb-5 xl:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#26d0ff,#2559ff)] text-slate-950 shadow-[0_0_28px_rgba(37,99,235,0.32)]">
                  <span className="text-xl font-black">V</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">VYROX</p>
                  <h2 className={`mt-1 text-3xl font-bold leading-tight ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                    {desafio
                      ? t('Verificaci?n segura', 'Secure verification')
                      : t('Tu progreso comienza aqu?', 'Your progress starts here')}
                  </h2>
                </div>
              </div>
              <p className={`mt-3 text-sm leading-7 ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                {desafio
                  ? t('Ingresa el c?digo temporal y termina el acceso a tu cuenta deportiva.', 'Enter the temporary code to finish signing in to your sports account.')
                  : t('Accede r?pido, ajusta tus preferencias y contin?a con tu seguimiento.', 'Access quickly, adjust your preferences and continue your tracking.')}
              </p>
            </div>

            <BarraPreferencias
              idioma={idioma}
              alternarIdioma={alternarIdioma}
              alternarTema={alternarTema}
              esOscuro={esOscuro}
              t={t}
              tema={esOscuro ? 'dark' : 'light'}
            />

            <div className={[
              'mt-5 rounded-[1.75rem] border p-5 shadow-[0_24px_60px_rgba(2,8,23,0.18)] sm:p-7 xl:mt-6 xl:rounded-[2rem] xl:p-10',
              esOscuro
                ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,28,52,0.96),rgba(10,17,34,0.94))]'
                : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,247,255,0.94))]',
            ].join(' ')}>
              <div className="mb-8">
                <h3 className={`text-3xl font-bold sm:text-4xl ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                  {desafio
                    ? t('Verificación de acceso', 'Access verification')
                    : vistaAcceso === 'recuperar'
                      ? t('Recuperar acceso', 'Recover access')
                      : t('Iniciar sesión', 'Sign in')}
                </h3>
                <p className={`mt-3 text-base leading-7 sm:text-lg ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                  {desafio
                    ? t('Ingrese el código enviado al correo registrado.', 'Enter the code sent to the registered email.')
                    : vistaAcceso === 'recuperar'
                      ? t('Solicite su código y luego defina una nueva contraseña segura.', 'Request your code and then set a new secure password.')
                      : t('Acceda a su cuenta deportiva y continúe con su seguimiento.', 'Access your sports account and continue your tracking.')}
                </p>
              </div>

              {mensaje && (
                <div className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${
                  esOscuro
                    ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                    : 'border-cyan-500/65 bg-cyan-100 text-cyan-950 shadow-[0_10px_24px_rgba(8,145,178,0.18)]'
                }`}>
                  {mensaje}
                </div>
              )}

              {error && (
                <div className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${
                  esOscuro
                    ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
                    : 'border-rose-300/80 bg-rose-50 text-rose-800'
                }`}>
                  {error}
                </div>
              )}

              {desafio ? (
                <form onSubmit={manejarVerificacion} className="space-y-6">
                  <CampoConIcono
                    etiqueta={t('Código temporal', 'Temporary code')}
                    icono="candado"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    esOscuro={esOscuro}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                  />

                  <BotonPrimario type="submit" disabled={cargando} className="flex w-full items-center justify-center gap-3 py-4 text-lg">
                    <span>
                      {cargando ? t('Verificando código...', 'Verifying code...') : t('Verificar y entrar', 'Verify and enter')}
                    </span>
                    {!cargando && <Icono tipo="flecha" className="h-5 w-5" />}
                  </BotonPrimario>

                  {cargando && <IndicadorCarga texto={t('Confirmando segundo factor...', 'Confirming second factor...')} />}

                  <BotonSecundario
                    type="button"
                    onClick={() => {
                      setDesafio(null)
                      setCodigo('')
                      setMensaje('')
                      setError('')
                    }}
                    className={`w-full py-4 text-base ${esOscuro ? 'border border-white/10 bg-white/5' : 'border border-slate-300 bg-white/80'}`}
                  >
                    {t('Volver al primer paso', 'Back to first step')}
                  </BotonSecundario>
                </form>
              ) : vistaAcceso === 'recuperar' ? (
                <div className="space-y-6">
                  {!desafioRestablecimiento ? (
                    <form onSubmit={manejarSolicitudRestablecimiento} className="space-y-4">
                      <div className={`rounded-[1.8rem] border p-5 ${
                        esOscuro
                          ? 'border-white/10 bg-slate-950/55'
                          : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_16px_30px_rgba(14,116,144,0.1)]'
                      }`}>
                        <p className={`text-xs uppercase tracking-[0.24em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>
                          {t('Recuperación de acceso', 'Access recovery')}
                        </p>
                        <h4 className={`mt-3 text-xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                          {t('Solicitar código de restablecimiento', 'Request a reset code')}
                        </h4>
                        <div className="mt-4 space-y-4">
                          <CampoConIcono
                            etiqueta={t('Correo electrónico', 'Email')}
                            icono="correo"
                            type="email"
                            esOscuro={esOscuro}
                            value={correoRestablecimiento}
                            onChange={(e) => setCorreoRestablecimiento(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            required
                          />
                          <BotonPrimario type="submit" disabled={cargando} className="w-full py-4">
                            {t('Enviar código', 'Send code')}
                          </BotonPrimario>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={manejarRestablecimiento} className="space-y-4">
                      <div className={`rounded-[1.8rem] border p-5 ${
                        esOscuro
                          ? 'border-white/10 bg-slate-950/55'
                          : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_16px_30px_rgba(14,116,144,0.1)]'
                      }`}>
                        <p className={`text-xs uppercase tracking-[0.24em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>
                          {t('Restablecimiento activo', 'Active recovery')}
                        </p>
                        <h4 className={`mt-3 text-xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                          {t('Ingrese el código recibido', 'Enter the received code')}
                        </h4>
                        <div className="mt-4 space-y-4">
                          <CampoConIcono
                            etiqueta={t('Código de restablecimiento', 'Reset code')}
                            icono="candado"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            esOscuro={esOscuro}
                            value={codigoRestablecimiento}
                            onChange={(e) => setCodigoRestablecimiento(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            required
                          />
                          <CampoConIcono
                            etiqueta={t('Nueva contraseña', 'New password')}
                            icono="candado"
                            type="password"
                            esOscuro={esOscuro}
                            value={nuevaContrasena}
                            onChange={(e) => setNuevaContrasena(e.target.value)}
                            placeholder="********"
                            required
                          />
                          <div className={`rounded-2xl border p-4 ${
                            esOscuro ? 'border-white/10 bg-white/5' : 'border-cyan-200/70 bg-slate-50'
                          }`}>
                            <p className={`text-xs uppercase tracking-[0.2em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>
                              {t('Seguridad de la nueva contraseña', 'New password security')}
                            </p>
                            <div className="mt-3 space-y-2">
                              {validacionRestablecimiento.validaciones.map((item) => (
                                <p
                                  key={item.id}
                                  className={`text-sm ${item.cumplida ? 'text-emerald-400' : (esOscuro ? 'text-slate-300' : 'text-slate-600')}`}
                                >
                                  {item.cumplida ? t('Cumple', 'Met') : t('Pendiente', 'Pending')}: {item.texto}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <BotonPrimario type="submit" disabled={cargando || !validacionRestablecimiento.esValida} className="flex-1 py-4">
                              {t('Restablecer contraseña', 'Reset password')}
                            </BotonPrimario>
                            <BotonSecundario
                              type="button"
                              onClick={() => {
                                setDesafioRestablecimiento(null)
                                setCodigoRestablecimiento('')
                                setNuevaContrasena('')
                              }}
                              className="flex-1 py-4"
                            >
                              {t('Volver', 'Back')}
                            </BotonSecundario>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}

                  <BotonSecundario
                    type="button"
                    onClick={() => {
                      setVistaAcceso('login')
                      setMostrarRestablecimiento(false)
                      setDesafioRestablecimiento(null)
                      setCodigoRestablecimiento('')
                      setNuevaContrasena('')
                      setError('')
                      setMensaje('')
                    }}
                    className={`w-full py-4 text-base ${esOscuro ? 'border border-white/10 bg-white/5' : 'border border-slate-300 bg-white/80'}`}
                  >
                    {t('Volver al inicio de sesión', 'Back to sign in')}
                  </BotonSecundario>
                </div>
              ) : (
                <form onSubmit={manejarCredenciales} className="space-y-6">
                  <CampoConIcono
                    etiqueta={t('Correo electrónico', 'Email')}
                    icono="correo"
                    type="email"
                    esOscuro={esOscuro}
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />

                  <CampoConIcono
                    etiqueta={t('Contraseña', 'Password')}
                    icono="candado"
                    type="password"
                    esOscuro={esOscuro}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="********"
                    required
                  />

                  <BotonPrimario type="submit" disabled={cargando} className="flex w-full items-center justify-center gap-3 py-4 text-lg">
                    <span>
                      {cargando ? t('Validando credenciales...', 'Validating credentials...') : t('Continuar', 'Continue')}
                    </span>
                    {!cargando && <Icono tipo="flecha" className="h-5 w-5" />}
                  </BotonPrimario>

                  {cargando && <IndicadorCarga texto={t('Consultando al servidor...', 'Contacting the server...')} />}

                  <div className="flex justify-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setVistaAcceso('recuperar')
                        setMostrarRestablecimiento(true)
                        setDesafioRestablecimiento(null)
                        setCodigoRestablecimiento('')
                        setNuevaContrasena('')
                        setError('')
                        setMensaje('')
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        esOscuro
                          ? 'bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15 hover:text-cyan-200'
                          : 'bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/15 hover:text-cyan-800'
                      }`}
                    >
                      {t('Olvidé mi contraseña', 'Forgot my password')}
                    </button>
                  </div>

                  <div className={`flex items-center gap-3 pt-2 text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`h-px flex-1 ${esOscuro ? 'bg-white/8' : 'bg-slate-200'}`} />
                    <span>{t('No tiene cuenta?', 'Do not have an account?')}</span>
                    <button
                      type="button"
                      onClick={() => navegar('/registro')}
                      className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                      {t('Registrate', 'Register')}
                    </button>
                    <div className={`h-px flex-1 ${esOscuro ? 'bg-white/8' : 'bg-slate-200'}`} />
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Inicio


import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BotonSecundario, ControlPreferencia, IndicadorCarga } from '../componentes/uiBase'
import { useAuth } from '../contexto/useAuth'
import { useUI } from '../contexto/useUI'
import {
  construirPorcentajeMetasDeportista,
  construirPorcentajeMetasEntrenador,
  construirRankingDeportista,
  construirSerieEstadisticasDeportista,
  construirSerieEstadisticasEntrenador,
  crearPanelVacio,
  normalizarPanel,
  obtenerResumenAdministrador,
  obtenerOpcionesDeportistas,
  obtenerResumenDeportista,
  obtenerResumenEntrenador,
} from '../utils/plataformaDatos'
import panelServicio from '../servicios/panelServicio'

// Paleta visual reutilizada por los graficos del tablero.
const coloresGrafico = ['#22d3ee', '#f59e0b', '#38bdf8', '#fb7185']

// Convierte una serie plana en segmentos lineales para dibujar un grafico sin barras.
const construirSegmentosLineales = (serie = [], valorKey = 'valor') => {
  const datos = serie.map((item) => ({
    etiqueta: item.etiqueta,
    detalle: item.detalle,
    valor: Number(item?.[valorKey]) || 0,
  }))

  if (datos.length === 0) {
    return { datos: [], segmentos: [] }
  }

  if (datos.length === 1) {
    const key = 'segmento_0'
    datos[0][key] = datos[0].valor
    return {
      datos,
      segmentos: [{ key, color: coloresGrafico[0], nombre: datos[0].etiqueta }],
    }
  }

  const segmentos = []
  for (let indice = 0; indice < datos.length - 1; indice += 1) {
    const key = `segmento_${indice}`
    datos[indice][key] = datos[indice].valor
    datos[indice + 1][key] = datos[indice + 1].valor
    segmentos.push({
      key,
      color: coloresGrafico[indice % coloresGrafico.length],
      nombre: datos[indice].etiqueta,
    })
  }

  return { datos, segmentos }
}

function GraficoLinealColorido({ serie, grafico }) {
  const lineas = Array.isArray(grafico?.lineas) ? grafico.lineas : []

  if (lineas.length > 0) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={serie} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="etiqueta" stroke="#cbd5e1" />
          <YAxis
            stroke="#cbd5e1"
            domain={grafico.limitePorcentaje ? [0, 100] : ['auto', 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(valor, nombre) => [`${valor}${grafico.sufijoValor || ''}`, nombre]}
            labelFormatter={(label) => label}
          />
          {lineas.map((linea) => (
            <Line
              key={linea.key}
              type="monotone"
              dataKey={linea.key}
              name={linea.nombre}
              stroke={linea.color}
              strokeWidth={3}
              dot={{ r: 4, fill: linea.color, stroke: '#0f172a', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: linea.color, stroke: '#e2e8f0', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const { datos, segmentos } = construirSegmentosLineales(serie, grafico.valorKey)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={datos} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="etiqueta" stroke="#cbd5e1" />
        <YAxis
          stroke="#cbd5e1"
          domain={grafico.limitePorcentaje ? [0, 100] : ['auto', 'auto']}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(valor, _, item) => {
            const detalle = item?.payload?.detalle ? ` (${item.payload.detalle})` : ''
            return `${valor}${grafico.sufijoValor}${detalle}`
          }}
          labelFormatter={(label) => label}
        />
        {segmentos.map((segmento) => (
          <Line
            key={segmento.key}
            type="monotone"
            dataKey={segmento.key}
            stroke={segmento.color}
            strokeWidth={4}
            dot={{ r: 5, fill: segmento.color, stroke: '#0f172a', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: segmento.color, stroke: '#e2e8f0', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// Normaliza textos para que las busquedas ignoren mayusculas y tildes.
const normalizarTexto = (valor = '') =>
  String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// Comprueba si un bloque de texto contiene el termino consultado.
const textoIncluye = (texto, termino) =>
  normalizarTexto(texto).includes(normalizarTexto(termino))

// Asegura que la UI reaccione bien aunque el rol venga con formato irregular.
const obtenerRolSeguro = (valor = '') => String(valor || '').trim().toLowerCase()

// Limpia residuos visuales de codificacion vieja antes de mostrarlos en la interfaz.
const limpiarTextoVisual = (valor = '') =>
  String(valor || '')
    .replace(/Â/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
// Normaliza nombres visibles y elimina repeticiones accidentales como ""Sebastian Sebastian Reyes"".
const formatearNombreVisible = (...valores) => {
  const tokens = limpiarTextoVisual(valores.filter(Boolean).join(' '))
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const vistos = new Set()
  return tokens
    .filter((token) => {
      const llave = token.toLowerCase()
      if (vistos.has(llave)) return false
      vistos.add(llave)
      return true
    })
    .join(' ')
}
// Traduce el rol tecnico a una etiqueta amable para la interfaz.
const etiquetaRolVisible = (rol, t) => {
  const rolSeguro = obtenerRolSeguro(rol)
  if (rolSeguro === 'entrenador') return t('Entrenador', 'Coach')
  if (rolSeguro === 'administrador') return t('Administrador', 'Administrator')
  return t('Deportista', 'Athlete')
}
// Traduce el estado del usuario para reutilizarlo en tarjetas y filtros.
const etiquetaEstadoVisible = (estado, t) => {
  const estadoSeguro = normalizarTexto(estado)
  return estadoSeguro === 'inactivo' ? t('Inactivo', 'Inactive') : t('Activo', 'Active')
}

// Genera las pestañas principales en el idioma activo para no duplicar el dashboard.
const crearModulosDeportista = (t) => [
  { id: 'perfil', titulo: t('Perfil deportivo', 'Sports profile'), descripcion: t('Actualiza tus datos personales y disciplina.', 'Update your personal details and discipline.') },
  { id: 'estadisticas', titulo: t('Estadísticas', 'Statistics'), descripcion: t('Registra tu rendimiento individual.', 'Track your individual performance.') },
  { id: 'sesiones', titulo: t('Sesiones asignadas', 'Assigned sessions'), descripcion: t('Consulta entrenamientos indicados por tus entrenadores.', 'Review training sessions assigned by your coaches.') },
  { id: 'metas', titulo: t('Metas asignadas', 'Assigned goals'), descripcion: t('Revisa objetivos activos y su progreso.', 'Review active goals and progress.') },
  { id: 'competencias', titulo: t('Competencias asignadas', 'Assigned competitions'), descripcion: t('Mira los eventos que te corresponden.', 'See your assigned events.') },
  { id: 'logros', titulo: t('Logros', 'Achievements'), descripcion: t('Reconocimientos y metas completadas.', 'Recognitions and completed goals.') },
]

// Hace lo mismo para la vista del entrenador.
const crearModulosEntrenador = (t) => [
  { id: 'perfil', titulo: t('Perfil del entrenador', 'Coach profile'), descripcion: t('Gestiona tu enfoque y categoria.', 'Manage your coaching focus and category.') },
  { id: 'deportistas', titulo: t('Deportistas vinculados', 'Linked athletes'), descripcion: t('Agrega cuentas reales de deportistas por correo.', 'Link real athlete accounts by email.') },
  { id: 'sesiones', titulo: t('Sesiones', 'Sessions'), descripcion: t('Asigna entrenamientos a uno o varios deportistas.', 'Assign training sessions to one or multiple athletes.') },
  { id: 'metas', titulo: t('Metas', 'Goals'), descripcion: t('Crea objetivos especificos para tus deportistas.', 'Create specific goals for your athletes.') },
  { id: 'competencias', titulo: t('Competencias', 'Competitions'), descripcion: t('Asigna eventos o torneos a tu grupo.', 'Assign events or tournaments to your group.') },
  { id: 'seguimiento', titulo: t('Seguimiento', 'Tracking'), descripcion: t('Registra observaciones individuales.', 'Record individual observations.') },
]

// Vista del administrador para supervisar usuarios y el estado general de la plataforma.
const crearModulosAdministrador = (t) => [
  { id: 'perfil', titulo: t('Perfil del administrador', 'Administrator profile'), descripcion: t('Gestiona tu ficha institucional dentro de Vyrox.', 'Manage your institutional profile inside Vyrox.') },
  { id: 'usuarios', titulo: t('Usuarios inscritos', 'Registered users'), descripcion: t('Revisa deportistas y entrenadores registrados.', 'Review registered athletes and coaches.') },
  { id: 'supervision', titulo: t('Supervisión general', 'General oversight'), descripcion: t('Consulta actividad, volumen y comportamiento global de la plataforma.', 'Review platform-wide activity, volume, and behavior.') },
]

function usePantallaMovil() {
  const [esPantallaMovil, setEsPantallaMovil] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const actualizar = () => setEsPantallaMovil(window.innerWidth < 768)
    actualizar()
    window.addEventListener('resize', actualizar)
    return () => window.removeEventListener('resize', actualizar)
  }, [])

  return esPantallaMovil
}

// Pantalla principal del sistema. Cambia dinamicamente segun el rol autenticado.
function Tablero() {
  const { usuario, cerrarSesion } = useAuth()
  const { alternarIdioma, alternarTema, esOscuro, idioma, t, tema } = useUI()
  const navegar = useNavigate()
  const rolUsuario = obtenerRolSeguro(usuario?.rol)
  const [datos, setDatos] = useState(() => crearPanelVacio(usuario))
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [moduloActivo, setModuloActivo] = useState(() =>
    rolUsuario === 'entrenador'
      ? 'deportistas'
      : rolUsuario === 'administrador'
        ? 'supervision'
        : 'perfil'
  )

  // Carga el panel del usuario apenas exista una sesión válida.
  useEffect(() => {
    if (!usuario) return

    const cargarPanel = async () => {
      setCargando(true)
      setErrorApi('')

      try {
        const respuesta = await panelServicio.obtener()
        setDatos(normalizarPanel(usuario, respuesta))
      } catch (error) {
        setDatos(crearPanelVacio(usuario))
        setErrorApi(error.response?.data?.mensaje || 'No se pudo cargar la información del panel.')
      } finally {
        setCargando(false)
      }
    }

    cargarPanel()
  }, [usuario])

  // Cierra la sesión y devuelve al login público.
  const manejarCerrarSesion = () => {
    cerrarSesion()
    navegar('/')
  }

  // Aplica cambios al estado local y luego los sincroniza con la API.
  const guardarCambios = async (actualizador) => {
    const referenciaActual = structuredClone(datos)
    const siguientes = normalizarPanel(usuario, actualizador(structuredClone(referenciaActual)))
    setDatos(siguientes)
    setGuardando(true)
    setErrorApi('')

    try {
      const respuesta = await panelServicio.actualizar(siguientes)
      setDatos(normalizarPanel(usuario, respuesta))
      return true
    } catch (error) {
      setDatos(referenciaActual)
      setErrorApi(error.response?.data?.mensaje || 'No se pudieron guardar los cambios.')
      return false
    } finally {
      setGuardando(false)
    }
  }

  // Crea la relacion entrenador-deportista a partir del correo del atleta.
  const vincularDeportista = async (correo) => {
    setGuardando(true)
    setErrorApi('')

    try {
      const respuesta = await panelServicio.vincularDeportista(correo)
      setDatos(normalizarPanel(usuario, respuesta))
      return { ok: true }
    } catch (error) {
      const mensaje = error.response?.data?.mensaje || t('No se pudo vincular el deportista.', 'The athlete could not be linked.')
      setErrorApi(mensaje)
      return { ok: false, mensaje }
    } finally {
      setGuardando(false)
    }
  }

  // Cambia el estado activo/inactivo de una cuenta desde la vista administrativa.
  const cambiarEstadoUsuario = async (usuarioId, estado) => {
    setGuardando(true)
    setErrorApi('')

    try {
      const respuesta = await panelServicio.actualizarEstadoUsuario(usuarioId, estado)
      setDatos(normalizarPanel(usuario, respuesta))
      return { ok: true }
    } catch (error) {
      const mensaje = error.response?.data?.mensaje || t('No se pudo actualizar el estado del usuario.', 'The user status could not be updated.')
      setErrorApi(mensaje)
      return { ok: false, mensaje }
    } finally {
      setGuardando(false)
    }
  }

  const esPantallaMovil = usePantallaMovil()

  // Prepara resumenes y series para no recalcular toda la vista en cada render.

  const contenido = useMemo(() => {
    if (!usuario || !datos) return null

    if (rolUsuario === 'administrador') {
      const resumen = obtenerResumenAdministrador(datos)
      return {
        resumen,
        seriePrincipal: [
          { etiqueta: t('Deportistas', 'Athletes'), valor: resumen.deportistas, detalle: t('cuentas deportivas', 'athlete accounts') },
          { etiqueta: t('Entrenadores', 'Coaches'), valor: resumen.entrenadores, detalle: t('cuentas técnicas', 'coach accounts') },
          { etiqueta: t('Activos', 'Active'), valor: resumen.activos, detalle: t('cuentas habilitadas', 'enabled accounts') },
        ],
        serieSecundaria: [
          { nombre: t('Activos', 'Active'), valor: resumen.activos },
          { nombre: t('Inactivos', 'Inactive'), valor: resumen.inactivos },
        ],
        graficoPrincipal: {
          etiqueta: t('Panorama de usuarios', 'User panorama'),
          titulo: t('Distribución actual de cuentas por rol', 'Current account distribution by role'),
          valorKey: 'valor',
          detalleKey: 'detalle',
          nombreValor: t('Usuarios', 'Users'),
          sufijoValor: '',
          limitePorcentaje: false,
        },
        graficoSecundario: {
          etiqueta: t('Estado de acceso', 'Access status'),
          titulo: t(`${resumen.activos} cuentas activas en este momento`, `${resumen.activos} accounts active right now`),
          porcentajeCentro: resumen.usuarios > 0 ? Math.round((resumen.activos / resumen.usuarios) * 100) : 0,
          total: resumen.usuarios,
        },
        modulos: crearModulosAdministrador(t),
      }
    }

    if (rolUsuario === 'entrenador') {
      const distribucion = construirPorcentajeMetasEntrenador(datos)
      return {
        resumen: obtenerResumenEntrenador(datos),
        seriePrincipal: construirResumenCoach(datos),
        serieSecundaria: distribucion.series,
        graficoPrincipal: {
          etiqueta: t('Vista del grupo', 'Group view'),
          titulo: t('Avance de metas por deportista vinculado', 'Goal progress by linked athlete'),
          valorKey: 'valor',
          detalleKey: 'detalle',
          nombreValor: t('Progreso', 'Progress'),
          sufijoValor: '%',
          limitePorcentaje: true,
        },
        graficoSecundario: {
          etiqueta: t('Estado general', 'Overall status'),
          titulo: t(`${distribucion.porcentaje}% de deportistas al día con sus metas`, `${distribucion.porcentaje}% of athletes on track with their goals`),
          porcentajeCentro: distribucion.porcentaje,
          total: distribucion.total,
        },
        modulos: crearModulosEntrenador(t),
      }
    }

    const distribucion = construirPorcentajeMetasDeportista(datos)
    return {
      resumen: obtenerResumenDeportista(datos),
      seriePrincipal: construirSerieDeportista(datos),
      serieSecundaria: distribucion.series,
      graficoPrincipal: {
        etiqueta: t('Rendimiento individual', 'Individual performance'),
        titulo: datos.metas.length > 0 ? t('Porcentaje de avance por meta', 'Goal progress percentage') : t('Evolución de estadísticas', 'Statistics evolution'),
        valorKey: 'valor',
        detalleKey: 'detalle',
        nombreValor: datos.metas.length > 0 ? t('Progreso', 'Progress') : t('Valor', 'Value'),
        sufijoValor: datos.metas.length > 0 ? '%' : '',
        limitePorcentaje: datos.metas.length > 0,
      },
      graficoSecundario: {
        etiqueta: t('Cumplimiento personal', 'Personal completion'),
        titulo: t(`${distribucion.porcentaje}% de metas completadas`, `${distribucion.porcentaje}% of goals completed`),
        porcentajeCentro: distribucion.porcentaje,
        total: distribucion.total,
      },
      ranking: construirRankingDeportista(datos, usuario),
      modulos: crearModulosDeportista(t),
    }
  }, [datos, rolUsuario, t, usuario])

  if (!usuario || cargando || !datos || !contenido) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${esOscuro ? 'text-slate-200' : 'text-slate-700'}`}>
        <IndicadorCarga texto={t('Cargando tablero...', 'Loading dashboard...')} />
      </div>
    )
  }

  const esEntrenador = rolUsuario === 'entrenador'
  const esAdministrador = rolUsuario === 'administrador'
  const rolTexto = esAdministrador
    ? t('Administrador', 'Administrator')
    : esEntrenador
      ? t('Entrenador', 'Coach')
      : t('Deportista', 'Athlete')

  const renderModuloActivo = () => {
    if (esAdministrador) {
      return (
        <ModuloAdministrador
          datos={datos}
          moduloActivo={moduloActivo}
          guardarCambios={guardarCambios}
          cambiarEstadoUsuario={cambiarEstadoUsuario}
        />
      )
    }

    if (esEntrenador) {
      return (
        <ModuloEntrenador
          datos={datos}
          moduloActivo={moduloActivo}
          guardarCambios={guardarCambios}
          vincularDeportista={vincularDeportista}
        />
      )
    }

    return (
      <ModuloDeportista
        datos={datos}
        moduloActivo={moduloActivo}
        guardarCambios={guardarCambios}
        ranking={contenido.ranking}
      />
    )
  }

  return (
    <div className={`min-h-screen ${esOscuro ? 'text-slate-100' : 'text-slate-900'}`}>
      <nav className={`border-b backdrop-blur-xl ${
        esOscuro
          ? 'border-white/10 bg-slate-950/60'
          : 'border-slate-200/80 bg-white/72'
      }`}>
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Vyrox</p>
            <h1 className="text-2xl font-semibold">{t('Panel de', 'Dashboard for')} {rolTexto}</h1>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
            <ControlPreferencia
              etiqueta={t('Tema', 'Theme')}
              valor={tema === 'dark' ? t('Oscuro', 'Dark') : t('Claro', 'Light')}
              onClick={alternarTema}
            />
            <ControlPreferencia
              etiqueta={t('Idioma', 'Language')}
              valor={idioma === 'es' ? t('Español', 'Spanish') : t('Inglés', 'English')}
              onClick={alternarIdioma}
            />
            <div className="w-full text-left sm:flex-1 sm:text-right lg:w-auto">
              <p className={`text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{t('Hola,', 'Hello,')} <span className={`font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearNombreVisible(usuario.nombre, usuario.apellidos)}</span></p>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
                {etiquetaRolVisible(rolUsuario, t)}
              </p>
            </div>
            <BotonSecundario
              onClick={manejarCerrarSesion}
              className="w-full justify-center border-rose-400/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18 sm:w-auto"
            >
              {t('Cerrar sesión', 'Sign out')}
            </BotonSecundario>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">

        {(errorApi || guardando) && (
          <section className="mb-6">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              errorApi
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
            }`}>
              {errorApi || t('Guardando cambios en la base de datos...', 'Saving changes to the database...')}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {esAdministrador ? (
            <>
              <ResumenCard titulo={t('Usuarios', 'Users')} valor={contenido.resumen.usuarios} detalle={t('cuentas registradas', 'registered accounts')} />
              <ResumenCard titulo={t('Deportistas', 'Athletes')} valor={contenido.resumen.deportistas} detalle={t('usuarios del rendimiento', 'performance users')} />
              <ResumenCard titulo={t('Entrenadores', 'Coaches')} valor={contenido.resumen.entrenadores} detalle={t('cuentas técnicas', 'technical accounts')} />
              <ResumenCard titulo={t('Activos', 'Active')} valor={contenido.resumen.activos} detalle={t(`${contenido.resumen.inactivos} inactivos`, `${contenido.resumen.inactivos} inactive`)} />
            </>
          ) : esEntrenador ? (
            <>
              <ResumenCard titulo={t('Deportistas', 'Athletes')} valor={contenido.resumen.deportistas} detalle={t('cuentas vinculadas', 'linked accounts')} />
              <ResumenCard titulo={t('Sesiones', 'Sessions')} valor={contenido.resumen.sesiones} detalle={t(`${contenido.resumen.sesionesPendientes} pendientes`, `${contenido.resumen.sesionesPendientes} pending`)} />
              <ResumenCard titulo={t('Alertas', 'Alerts')} valor={contenido.resumen.alertas} detalle={t('observaciones prioritarias', 'priority observations')} />
              <ResumenCard titulo={t('Competencias', 'Competitions')} valor={contenido.resumen.competencias} detalle={t(`${contenido.resumen.promedioProgreso}% progreso promedio`, `${contenido.resumen.promedioProgreso}% average progress`)} />
            </>
          ) : (
            <>
              <ResumenCard titulo={t('Estadísticas', 'Statistics')} valor={contenido.resumen.estadisticas} detalle={t('registros personales', 'personal records')} />
              <ResumenCard titulo={t('Sesiones', 'Sessions')} valor={contenido.resumen.sesiones} detalle={t('asignadas por entrenadores', 'assigned by coaches')} />
              <ResumenCard titulo={t('Metas', 'Goals')} valor={contenido.resumen.metas} detalle={t(`${contenido.resumen.metasCompletadas} completadas`, `${contenido.resumen.metasCompletadas} completed`)} />
              <ResumenCard titulo={t('Competencias', 'Competitions')} valor={contenido.resumen.competencias} detalle={t('eventos asignados', 'assigned events')} />
            </>
          )}
        </section>

        {!esAdministrador && !esPantallaMovil && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel className="min-h-80">
              <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{contenido.graficoPrincipal.etiqueta}</p>
                <h2 className="text-xl font-semibold">{contenido.graficoPrincipal.titulo}</h2>
              </div>

              <div className="h-64">
                {contenido.seriePrincipal.length === 0 ? (
                  <EstadoVacio mensaje={t('Todavía no hay datos suficientes para graficar esta vista.', 'There is not enough data to chart this view yet.')} />
                ) : (
                  <GraficoLinealColorido serie={contenido.seriePrincipal} grafico={contenido.graficoPrincipal} />
                )}
              </div>
            </Panel>

            <Panel className="min-h-80">
              <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.3em] text-amber-300">{contenido.graficoSecundario.etiqueta}</p>
                <h2 className="text-xl font-semibold">{contenido.graficoSecundario.titulo}</h2>
              </div>

              <div className="h-64">
                {contenido.serieSecundaria.length === 0 ? (
                  <EstadoVacio mensaje={t('Aún no hay metas suficientes para construir esta gráfica.', 'There are not enough goals yet to build this chart.')} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contenido.serieSecundaria}
                        dataKey="valor"
                        nameKey="nombre"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={4}
                      >
                        {contenido.serieSecundaria.map((item, indice) => (
                          <Cell key={'${item.nombre}-${indice}'} fill={coloresGrafico[indice % coloresGrafico.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(valor, _, item) => '${valor} ${item?.payload?.nombre?.toLowerCase?.() || ""}'} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-300">
                <p>{contenido.graficoSecundario.total} {t('elementos evaluados', 'items evaluated')}</p>
                <div className={'rounded-full border px-4 py-2 font-semibold ' + (esOscuro ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_22px_rgba(34,211,238,0.16)]')}>
                  {contenido.graficoSecundario.porcentajeCentro}% {t('completado', 'completed')}
                </div>
              </div>
            </Panel>
          </section>
        )}

        {esPantallaMovil ? (
          <section className="mt-8 space-y-4">
            {contenido.modulos.map((modulo) => (
              <div key={modulo.id} className="space-y-3">
                <button
                  onClick={() => setModuloActivo(modulo.id)}
                  className={'group w-full rounded-[1.8rem] border p-4 text-left transition duration-200 sm:p-5 ' + (
                    moduloActivo === modulo.id
                      ? (esOscuro
                          ? 'border-cyan-400 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.14))] shadow-[0_18px_40px_rgba(8,145,178,0.24)]'
                          : 'border-cyan-500 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(37,99,235,0.18))] shadow-[0_22px_44px_rgba(14,116,144,0.18)]')
                      : (esOscuro
                          ? 'border-white/8 bg-white/5 hover:border-cyan-400/30 hover:bg-white/7'
                          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,249,255,0.92))] shadow-[0_14px_28px_rgba(148,163,184,0.12)] hover:border-cyan-500/45 hover:shadow-[0_18px_36px_rgba(14,116,144,0.16)]')
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold sm:text-lg">{modulo.titulo}</p>
                    <span className={'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em] ' + (
                      moduloActivo === modulo.id
                        ? (esOscuro ? 'bg-cyan-400/18 text-cyan-200' : 'bg-[linear-gradient(135deg,#22d3ee,#60a5fa)] text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]')
                        : (esOscuro ? 'bg-white/8 text-slate-300' : 'bg-slate-200/90 text-slate-700')
                    )}>
                      {moduloActivo === modulo.id ? t('Activo', 'Active') : t('Abrir', 'Open')}
                    </span>
                  </div>
                  <p className={'mt-2 text-sm ' + (esOscuro ? 'text-slate-300' : 'text-slate-600')}>{modulo.descripcion}</p>
                </button>

                {moduloActivo === modulo.id && (
                  <Panel className="p-4 sm:p-5">
                    {renderModuloActivo()}
                  </Panel>
                )}
              </div>
            ))}
          </section>
        ) : (
          <>
            <section className="mt-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {contenido.modulos.map((modulo) => (
                  <button
                    key={modulo.id}
                    onClick={() => setModuloActivo(modulo.id)}
                    className={'group rounded-3xl border p-5 text-left transition duration-200 ' + (
                      moduloActivo === modulo.id
                        ? (esOscuro
                            ? 'border-cyan-400 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.14))] shadow-[0_18px_40px_rgba(8,145,178,0.24)]'
                            : 'border-cyan-500 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(37,99,235,0.18))] shadow-[0_22px_44px_rgba(14,116,144,0.18)]')
                        : (esOscuro
                            ? 'border-white/8 bg-white/5 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/7'
                            : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,249,255,0.92))] shadow-[0_14px_28px_rgba(148,163,184,0.12)] hover:-translate-y-1 hover:border-cyan-500/45 hover:shadow-[0_18px_36px_rgba(14,116,144,0.16)]')
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold">{modulo.titulo}</p>
                      <span className={'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em] ' + (
                        moduloActivo === modulo.id
                          ? (esOscuro ? 'bg-cyan-400/18 text-cyan-200' : 'bg-[linear-gradient(135deg,#22d3ee,#60a5fa)] text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]')
                          : (esOscuro ? 'bg-white/8 text-slate-300' : 'bg-slate-200/90 text-slate-700')
                      )}>
                        {moduloActivo === modulo.id ? t('Activo', 'Active') : t('Abrir', 'Open')}
                      </span>
                    </div>
                    <p className={'mt-2 text-sm ' + (esOscuro ? 'text-slate-300' : 'text-slate-600')}>{modulo.descripcion}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <Panel>
                {renderModuloActivo()}
              </Panel>
            </section>
          </>
        )}

        {!esAdministrador && esPantallaMovil && (
          <section className="mt-8 grid gap-4">
            <Panel className="min-h-[18rem] p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{contenido.graficoPrincipal.etiqueta}</p>
                <h2 className="text-lg font-semibold">{contenido.graficoPrincipal.titulo}</h2>
              </div>
              <div className="h-56">
                {contenido.seriePrincipal.length === 0 ? (
                  <EstadoVacio mensaje={t('Todavía no hay datos suficientes para graficar esta vista.', 'There is not enough data to chart this view yet.')} />
                ) : (
                  <GraficoLinealColorido serie={contenido.seriePrincipal} grafico={contenido.graficoPrincipal} />
                )}
              </div>
            </Panel>

            <Panel className="min-h-[18rem] p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">{contenido.graficoSecundario.etiqueta}</p>
                <h2 className="text-lg font-semibold">{contenido.graficoSecundario.titulo}</h2>
              </div>
              <div className="h-56">
                {contenido.serieSecundaria.length === 0 ? (
                  <EstadoVacio mensaje={t('Aún no hay metas suficientes para construir esta gráfica.', 'There are not enough goals yet to build this chart.')} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contenido.serieSecundaria} dataKey="valor" nameKey="nombre" innerRadius={46} outerRadius={78} paddingAngle={4}>
                        {contenido.serieSecundaria.map((item, indice) => (
                          <Cell key={'${item.nombre}-${indice}'} fill={coloresGrafico[indice % coloresGrafico.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(valor, _, item) => '${valor} ${item?.payload?.nombre?.toLowerCase?.() || ""}'} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <p>{contenido.graficoSecundario.total} {t('elementos evaluados', 'items evaluated')}</p>
                <div className={'rounded-full border px-4 py-2 font-semibold ' + (esOscuro ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_22px_rgba(34,211,238,0.16)]')}>
                  {contenido.graficoSecundario.porcentajeCentro}% {t('completado', 'completed')}
                </div>
              </div>
            </Panel>
          </section>
        )}
      </main>
    </div>
  )
}

function ModuloDeportista({ datos, moduloActivo, guardarCambios, ranking }) {
  const [perfil, setPerfil] = useState(datos.perfil)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nombreFotoPerfil, setNombreFotoPerfil] = useState('')
  const [deportistasSeleccionados, setDeportistasSeleccionados] = useState([])
  const [sesionesSeleccionadas, setSesionesSeleccionadas] = useState([])
  const [metasSeleccionadas, setMetasSeleccionadas] = useState([])
  const [competenciasSeleccionadas, setCompetenciasSeleccionadas] = useState([])
  const [observacionesSeleccionadas, setObservacionesSeleccionadas] = useState([])
  const [estadisticasSeleccionadas, setEstadisticasSeleccionadas] = useState([])
  const [nuevaEstadistica, setNuevaEstadistica] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    disciplina: datos.perfil.disciplina || '',
    metrica: '',
    valor: 1,
    competencia: '',
  })
  const [indiceEdicionEstadistica, setIndiceEdicionEstadistica] = useState(null)
  const [busquedaEstadistica, setBusquedaEstadistica] = useState('')
  const [filtroMetrica, setFiltroMetrica] = useState('')
  const [filtroDisciplinaEstadistica, setFiltroDisciplinaEstadistica] = useState('')
  const [metasLocales, setMetasLocales] = useState(datos.metas)
  const { esOscuro, t } = useUI()

  const perfilRef = useRef(JSON.stringify(datos.perfil))
  const metasRef = useRef(JSON.stringify(datos.metas))
  const perfilTieneContenido = perfilDeportistaTieneContenido(datos.perfil)
  // Acumula estadisticas por metrica para mostrar que areas pesan mas en el rendimiento.
  const estadisticasPorMetrica = useMemo(() => {
    const acumulado = new Map()

    for (const item of datos.estadisticas) {
      const nombre = String(item.metrica || t('Registro', 'Record')).trim() || t('Registro', 'Record')
      acumulado.set(nombre, (acumulado.get(nombre) || 0) + (Number(item.valor) || 0))
    }

    return [...acumulado.entries()]
      .map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
  }, [datos.estadisticas, t])

  // Ordena los registros recientes para construir una grafica temporal simple.
  const historialReciente = useMemo(() => (
    [...datos.estadisticas]
      .sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0))
      .slice(-7)
      .map((item) => ({
        fecha: item.fecha
          ? new Date(item.fecha).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })
          : t('Sin fecha', 'No date'),
        valor: Number(item.valor) || 0,
      }))
  ), [datos.estadisticas, t])

  // Convierte cada meta en porcentaje para poder compararlas dentro del perfil.
  const progresoMetasPerfil = useMemo(() => (
    datos.metas.slice(0, 5).map((meta) => ({
      nombre: meta.titulo,
      valor: meta.objetivo > 0 ? Math.min(Math.round(((Number(meta.progreso) || 0) / meta.objetivo) * 100), 100) : 0,
      detalle: `${meta.progreso}/${meta.objetivo}`,
    }))
  ), [datos.metas])

  // Alimenta los filtros con valores reales ya registrados por el deportista.
  const metricasDisponibles = useMemo(
    () => [...new Set(datos.estadisticas.map((item) => limpiarTextoVisual(item.metrica)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [datos.estadisticas],
  )

  const disciplinasDisponiblesEstadisticas = useMemo(
    () => [...new Set(datos.estadisticas.map((item) => limpiarTextoVisual(item.disciplina)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [datos.estadisticas],
  )

  // Permite filtrar el historial por texto, metrica y disciplina.
  const estadisticasFiltradas = useMemo(() => (
    datos.estadisticas.filter((item) => {
      const metricaVisible = limpiarTextoVisual(item.metrica)
      const disciplinaVisible = limpiarTextoVisual(item.disciplina)
      const contextoVisible = limpiarTextoVisual(item.competencia)
      const fechaVisible = limpiarTextoVisual(item.fecha)

      const coincideMetrica = !filtroMetrica || metricaVisible === filtroMetrica
      const coincideDisciplina = !filtroDisciplinaEstadistica || disciplinaVisible === filtroDisciplinaEstadistica
      const coincideBusqueda =
        !busquedaEstadistica.trim() ||
        [metricaVisible, disciplinaVisible, contextoVisible, fechaVisible, item.valor]
          .some((fragmento) => textoIncluye(fragmento, busquedaEstadistica))

      return coincideMetrica && coincideDisciplina && coincideBusqueda
    })
  ), [busquedaEstadistica, datos.estadisticas, filtroDisciplinaEstadistica, filtroMetrica])

  const toggleSeleccionEstadistica = (indiceOriginal) => {
  setEstadisticasSeleccionadas((previas) => (
    previas.includes(indiceOriginal)
      ? previas.filter((indice) => indice !== indiceOriginal)
      : [...previas, indiceOriginal]
  ))
}

const seleccionarEstadisticasVisibles = () => {
  const indicesVisibles = estadisticasFiltradas
    .map((item) => datos.estadisticas.indexOf(item))
    .filter((indice) => indice >= 0)

  setEstadisticasSeleccionadas((previas) => Array.from(new Set([...(previas || []), ...indicesVisibles])))
}

const deseleccionarEstadisticasVisibles = () => {
  const indicesVisibles = estadisticasFiltradas
    .map((item) => datos.estadisticas.indexOf(item))
    .filter((indice) => indice >= 0)

  setEstadisticasSeleccionadas((previas) => (previas || []).filter((indice) => !indicesVisibles.includes(indice)))
}

// Tarjetas resumen para que el perfil no sea solo un formulario sino tambien un panel analitico.
  const metricasPerfil = useMemo(() => {
    const totalRegistros = datos.estadisticas.length
    const totalValor = datos.estadisticas.reduce((suma, item) => suma + (Number(item.valor) || 0), 0)
    const metaMasAvanzada = progresoMetasPerfil.reduce((maximo, meta) => Math.max(maximo, meta.valor), 0)

    return [
      {
        etiqueta: t('Registros cargados', 'Records logged'),
        valor: totalRegistros,
        detalle: t('estadísticas guardadas', 'saved statistics'),
      },
      {
        etiqueta: t('Volumen acumulado', 'Accumulated volume'),
        valor: totalValor,
        detalle: t('suma de metricas', 'sum of metrics'),
      },
      {
        etiqueta: t('Meta mas avanzada', 'Most advanced goal'),
        valor: `${metaMasAvanzada}%`,
        detalle: t('cumplimiento maximo', 'highest completion'),
      },
    ]
  }, [datos.estadisticas, progresoMetasPerfil, t])

  // Evita mostrar paneles grandes vac?os cuando todav?a no hay datos suficientes.
  const mostrarBloquesAnaliticos =
    estadisticasPorMetrica.length > 0 ||
    historialReciente.length > 0 ||
    progresoMetasPerfil.length > 0

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const perfilStr = JSON.stringify(datos.perfil)
    if (perfilRef.current !== perfilStr) {
      perfilRef.current = perfilStr
      setPerfil(datos.perfil)
      setNombreFotoPerfil('')
    }
    const metasStr = JSON.stringify(datos.metas)
    if (metasRef.current !== metasStr) {
      metasRef.current = metasStr
      setMetasLocales(datos.metas)
    }
    setNuevaEstadistica((previo) => ({
      ...previo,
      disciplina: datos.perfil.disciplina || previo.disciplina,
    }))
  }, [datos])
  /* eslint-enable react-hooks/set-state-in-effect */

  const guardarPerfil = async (e) => {
    e.preventDefault()
    const guardado = await guardarCambios((actuales) => ({ ...actuales, perfil }))
    if (guardado) {
      setEditandoPerfil(false)
      setNombreFotoPerfil('')
    }
  }

  const reiniciarFormularioEstadistica = () => {
    setNuevaEstadistica({
      fecha: new Date().toISOString().slice(0, 10),
      disciplina: datos.perfil.disciplina || '',
      metrica: '',
      valor: 1,
      competencia: '',
    })
    setIndiceEdicionEstadistica(null)
  }

  // Convierte la imagen seleccionada a base64 para guardarla dentro del perfil del deportista.
  const cargarFotoPerfil = (archivo) => {
    if (!archivo) return
    if (!archivo.type?.startsWith('image/')) return

    setNombreFotoPerfil(archivo.name)
    const lector = new FileReader()
    lector.onload = () => {
      setPerfil((previo) => ({ ...previo, foto: lector.result }))
    }
    lector.readAsDataURL(archivo)
  }

  const agregarEstadistica = async (e) => {
    e.preventDefault()

    if (!String(nuevaEstadistica.metrica || '').trim()) return

    await guardarCambios((actuales) => ({
      ...actuales,
      estadisticas: (() => {
        const metricaNormalizada = String(nuevaEstadistica.metrica || '').trim().toLowerCase()
        const disciplinaNormalizada = String(nuevaEstadistica.disciplina || '').trim().toLowerCase()
        const contextoNormalizado = String(nuevaEstadistica.competencia || '').trim().toLowerCase()
        const valorNuevo = Number(nuevaEstadistica.valor) || 0

        if (indiceEdicionEstadistica !== null) {
          return actuales.estadisticas.map((item, indice) => (
            indice === indiceEdicionEstadistica
              ? {
                  ...item,
                  fecha: nuevaEstadistica.fecha || item.fecha,
                  disciplina: nuevaEstadistica.disciplina.trim(),
                  metrica: nuevaEstadistica.metrica.trim(),
                  valor: valorNuevo,
                  competencia: nuevaEstadistica.competencia.trim(),
                }
              : item
          ))
        }

        // Si la metrica ya existe para la misma disciplina y contexto, acumula el valor
        // en lugar de crear un registro duplicado.
        const indiceExistente = actuales.estadisticas.findIndex((item) => (
          String(item.metrica || '').trim().toLowerCase() === metricaNormalizada &&
          String(item.disciplina || '').trim().toLowerCase() === disciplinaNormalizada &&
          String(item.competencia || '').trim().toLowerCase() === contextoNormalizado
        ))

        if (indiceExistente === -1) {
          return [
            {
              ...nuevaEstadistica,
              disciplina: nuevaEstadistica.disciplina.trim(),
              metrica: nuevaEstadistica.metrica.trim(),
              competencia: nuevaEstadistica.competencia.trim(),
              valor: valorNuevo,
            },
            ...actuales.estadisticas,
          ]
        }

        return actuales.estadisticas.map((item, indice) => (
          indice === indiceExistente
            ? {
                ...item,
                fecha: nuevaEstadistica.fecha || item.fecha,
              valor: (Number(item.valor) || 0) + valorNuevo,
            }
          : item
        ))
      })(),
    }))
    reiniciarFormularioEstadistica()
  }

  // Carga un registro existente en el formulario para poder corregirlo.
  const editarEstadistica = (item, indiceOriginal) => {
    setIndiceEdicionEstadistica(indiceOriginal)
    setNuevaEstadistica({
      fecha: item.fecha || new Date().toISOString().slice(0, 10),
      disciplina: limpiarTextoVisual(item.disciplina),
      metrica: limpiarTextoVisual(item.metrica),
      valor: Number(item.valor) || 0,
      competencia: limpiarTextoVisual(item.competencia),
    })
  }

  // Elimina una estadistica puntual del historial del deportista.
  const eliminarEstadistica = async (indiceOriginal) => {
  await guardarCambios((actuales) => ({
    ...actuales,
    estadisticas: actuales.estadisticas.filter((_, indice) => indice !== indiceOriginal),
  }))

  setEstadisticasSeleccionadas((previas) => previas.filter((indice) => indice !== indiceOriginal))

  if (indiceEdicionEstadistica === indiceOriginal) {
    reiniciarFormularioEstadistica()
  }
}

// Borra en bloque las estadisticas seleccionadas para agilizar la limpieza del historial.
const eliminarEstadisticasSeleccionadas = async () => {
  if (!estadisticasSeleccionadas.length) return

  const indicesSeleccionados = new Set(estadisticasSeleccionadas)

  await guardarCambios((actuales) => ({
    ...actuales,
    estadisticas: actuales.estadisticas.filter((_, indice) => !indicesSeleccionados.has(indice)),
  }))

  setEstadisticasSeleccionadas([])

  if (indiceEdicionEstadistica !== null && indicesSeleccionados.has(indiceEdicionEstadistica)) {
    reiniciarFormularioEstadistica()
  }
}

  if (moduloActivo === 'perfil') {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{t('Perfil activo', 'Active profile')}</p>
          <h3 className="mt-2 text-2xl font-semibold">{t('Información deportiva', 'Sports profile information')}</h3>
          <p className={`mt-3 max-w-xl text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-500'}`}>
            {t('Este perfil lo ve usted en su cuenta y ayuda a que los entrenadores lo identifiquen mejor cuando lo vinculan.', 'This profile is visible in your account and helps coaches identify you better when they link you.')}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {metricasPerfil.map((item) => (
              <div
                key={item.etiqueta}
                className={`rounded-2xl border p-4 ${
                  esOscuro
                    ? 'border-white/8 bg-white/5'
                    : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_12px_24px_rgba(14,116,144,0.1)]'
                }`}
              >
                <p className={`text-[11px] uppercase tracking-[0.24em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{item.etiqueta}</p>
                <p className={`mt-3 text-3xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{item.valor}</p>
                <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{item.detalle}</p>
              </div>
            ))}
          </div>
        </div>

        {editandoPerfil || !perfilTieneContenido ? (
          <form
            onSubmit={guardarPerfil}
            className={`grid content-start self-start gap-4 rounded-[28px] border p-5 md:grid-cols-2 ${
              esOscuro
                ? 'border-white/8 bg-white/5'
                : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_18px_34px_rgba(14,116,144,0.1)]'
            }`}
          >
            <Campo label={t('Disciplina', 'Discipline')} value={perfil.disciplina} onChange={(value) => setPerfil({ ...perfil, disciplina: value })} />
            <Campo label={t('Categoría', 'Category')} value={perfil.categoria} onChange={(value) => setPerfil({ ...perfil, categoria: value })} />
            <Campo label={t('Equipo', 'Team')} value={perfil.equipo} onChange={(value) => setPerfil({ ...perfil, equipo: value })} />
            <Campo label={t('Objetivo principal', 'Main goal')} value={perfil.objetivoPrincipal} onChange={(value) => setPerfil({ ...perfil, objetivoPrincipal: value })} />
            <div className="md:col-span-2">
              <SelectorFotoPerfil
                nombreArchivo={nombreFotoPerfil}
                fotoActual={perfil.foto}
                onSeleccionar={cargarFotoPerfil}
                ayuda={t('Puede subir JPG, JPEG, PNG, WEBP, GIF, SVG y cualquier otro formato de imagen compatible.', 'You can upload JPG, JPEG, PNG, WEBP, GIF, SVG and other compatible image formats.')}
              />
            </div>
            <div className="md:col-span-2">
              <Etiqueta>{t('Resumen personal', 'Personal summary')}</Etiqueta>
              <textarea
                value={perfil.bio}
                onChange={(e) => setPerfil({ ...perfil, bio: e.target.value })}
                className={`mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-slate-300 bg-white text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.12)]'
                }`}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="w-full rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">
                {t('Guardar perfil', 'Save profile')}
              </button>
              {perfilTieneContenido && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil(datos.perfil)
                    setEditandoPerfil(false)
                  }}
                  className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                    esOscuro
                      ? 'border-white/15 text-slate-200 hover:bg-white/5'
                      : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'
                  }`}
                >
                  {t('Cancelar edicion', 'Cancel editing')}
                </button>
              )}
            </div>
          </form>
        ) : (
          <TarjetaPerfilGuardado
            etiqueta={t('Perfil guardado', 'Saved profile')}
            titulo={datos.perfil.disciplina || t('Perfil deportivo actualizado', 'Updated sports profile')}
            descripcion={datos.perfil.bio || t('Sin resumen personal registrado.', 'No personal summary saved yet.')}
            foto={datos.perfil.foto}
            campos={[
              { label: t('Disciplina', 'Discipline'), value: datos.perfil.disciplina },
              { label: t('Categoría', 'Category'), value: datos.perfil.categoria },
              { label: t('Equipo', 'Team'), value: datos.perfil.equipo },
              { label: t('Objetivo principal', 'Main goal'), value: datos.perfil.objetivoPrincipal },
            ]}
            accionTexto={t('Editar perfil', 'Edit profile')}
            onAccion={() => setEditandoPerfil(true)}
          />
        )}
      </div>
    )
  }

  if (moduloActivo === 'estadisticas' || moduloActivo === 'estadisticas') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={agregarEstadistica} className={`space-y-4 rounded-[28px] border p-5 ${
          esOscuro
            ? 'border-white/8 bg-white/5'
            : 'border-cyan-200 bg-white shadow-[0_18px_34px_rgba(14,116,144,0.12)]'
        }`}>
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-800'}`}>
              {indiceEdicionEstadistica !== null ? t('Edición de registro', 'Editing entry') : t('Nuevo registro', 'New entry')}
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              {indiceEdicionEstadistica !== null ? t('Editar estadística', 'Edit statistic') : t('Agregar estadística', 'Add statistic')}
            </h3>
            <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('Si la métrica ya existe para la misma disciplina y contexto, el sistema sumará el nuevo valor automáticamente.', 'If the metric already exists for the same discipline and context, the system will automatically add the new value.')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label={t('Fecha', 'Date')} type="date" value={nuevaEstadistica.fecha} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, fecha: value })} />
            <Campo label={t('Valor', 'Value')} type="number" value={nuevaEstadistica.valor} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, valor: value })} />
            <Campo label={t('Disciplina', 'Discipline')} value={nuevaEstadistica.disciplina} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, disciplina: value })} />
            <Campo label={t('Métrica', 'Metric')} value={nuevaEstadistica.metrica} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, metrica: value })} />
            <div className="md:col-span-2">
              <Campo label={t('Competencia o contexto', 'Competition or context')} value={nuevaEstadistica.competencia} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, competencia: value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-4 py-3 font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-110">
              {indiceEdicionEstadistica !== null ? t('Guardar cambios', 'Save changes') : t('Guardar estadística', 'Save statistic')}
            </button>
            {indiceEdicionEstadistica !== null && (
              <button
                type="button"
                onClick={reiniciarFormularioEstadistica}
                className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                  esOscuro
                    ? 'border-white/15 text-slate-200 hover:bg-white/5'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t('Cancelar edición', 'Cancel editing')}
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          <div className={`grid gap-4 rounded-[28px] border p-5 md:grid-cols-4 ${
            esOscuro
              ? 'border-white/8 bg-white/5'
              : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-[0_18px_34px_rgba(14,116,144,0.1)]'
          }`}>
            <div className="md:col-span-2">
              <Etiqueta>{t('Buscar registro', 'Search record')}</Etiqueta>
              <input
                value={busquedaEstadistica}
                onChange={(e) => setBusquedaEstadistica(e.target.value)}
                placeholder={t('Busque por métrica, disciplina, fecha o contexto.', 'Search by metric, discipline, date or context.')}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-cyan-300 bg-white text-slate-900 shadow-[0_12px_24px_rgba(14,116,144,0.12)]'
                }`}
              />
            </div>
            <div>
              <Etiqueta>{t('Filtrar por métrica', 'Filter by metric')}</Etiqueta>
              <select
                value={filtroMetrica}
                onChange={(e) => setFiltroMetrica(e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-cyan-300 bg-white text-slate-900 shadow-[0_12px_24px_rgba(14,116,144,0.12)]'
                }`}
              >
                <option value="">{t('Todas', 'All')}</option>
                {metricasDisponibles.map((metrica) => (
                  <option key={metrica} value={metrica}>{metrica}</option>
                ))}
              </select>
            </div>
            <div>
              <Etiqueta>{t('Filtrar por disciplina', 'Filter by discipline')}</Etiqueta>
              <select
                value={filtroDisciplinaEstadistica}
                onChange={(e) => setFiltroDisciplinaEstadistica(e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-cyan-300 bg-white text-slate-900 shadow-[0_12px_24px_rgba(14,116,144,0.12)]'
                }`}
              >
                <option value="">{t('Todas', 'All')}</option>
                {disciplinasDisponiblesEstadisticas.map((disciplina) => (
                  <option key={disciplina} value={disciplina}>{disciplina}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex items-end">
              <div className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                esOscuro
                  ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'
                  : 'border-cyan-200 bg-cyan-50 text-cyan-900'
              }`}>
                {t('Resultados visibles', 'Visible results')}: <span className="font-semibold">{estadisticasFiltradas.length}</span>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusquedaEstadistica('')
                  setFiltroMetrica('')
                  setFiltroDisciplinaEstadistica('')
                }}
                className={`w-full rounded-2xl border px-4 py-3 font-semibold transition ${
                  esOscuro
                    ? 'border-white/15 text-slate-200 hover:bg-white/5'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t('Limpiar filtros', 'Clear filters')}
              </button>
            </div>
          </div>
          <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_auto_auto_1fr] ${
            esOscuro
              ? 'border-white/8 bg-white/5'
              : 'border-slate-200 bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.08)]'
          }`}>
            <button
              type="button"
              onClick={seleccionarEstadisticasVisibles}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                esOscuro
                  ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18'
                  : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_24px_rgba(34,211,238,0.14)] hover:bg-cyan-50'
              }`}
            >
              {t('Seleccionar todas', 'Select all')}
            </button>
            <button
              type="button"
              onClick={deseleccionarEstadisticasVisibles}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                esOscuro
                  ? 'border-white/15 text-slate-200 hover:bg-white/5'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t('Deseleccionar todas', 'Deselect all')}
            </button>
            <button
              type="button"
              onClick={eliminarEstadisticasSeleccionadas}
              disabled={!estadisticasSeleccionadas.length}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${estadisticasSeleccionadas.length
                ? (esOscuro
                    ? 'border border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22'
                    : 'border border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110')
                : (esOscuro
                    ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                    : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}
            >
              {t('Borrar seleccionadas', 'Delete selected')}
            </button>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              esOscuro
                ? 'border-white/10 bg-slate-950/60 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              {t('Seleccionadas', 'Selected')}: <span className="font-semibold">{estadisticasSeleccionadas.length}</span>
            </div>
          </div>
          {datos.estadisticas.length === 0 ? (
            <EstadoVacio mensaje={t('Todavía no has registrado estadisticas personales.', 'You have not recorded personal statistics yet.')} />
          ) : estadisticasFiltradas.length === 0 ? (
            <EstadoVacio mensaje={t('No hay estadísticas que coincidan con los filtros seleccionados.', 'There are no statistics that match the selected filters.')} />
          ) : (
            estadisticasFiltradas.map((item) => {
              const indiceOriginal = datos.estadisticas.indexOf(item)
              const metricaVisible = limpiarTextoVisual(item.metrica) || t('Métrica sin nombre', 'Unnamed metric')
              const disciplinaVisible = limpiarTextoVisual(item.disciplina)
              const contextoVisible = limpiarTextoVisual(item.competencia)
              const fechaVisible = limpiarTextoVisual(item.fecha)
              const resumenContexto = [disciplinaVisible, contextoVisible].filter(Boolean)

              return (
                <div
                  key={item.id || `${item.metrica}-${item.disciplina}-${item.competencia}-${item.fecha}-${indiceOriginal}`}
                  className={`rounded-[26px] border p-5 ${estadisticasSeleccionadas.includes(indiceOriginal)
                    ? (esOscuro ? 'border-cyan-400/35 bg-cyan-400/10' : 'border-cyan-300 bg-cyan-50/80')
                    : (esOscuro
                      ? 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.64))] shadow-[0_18px_30px_rgba(2,6,23,0.2)]'
                      : 'border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(240,249,255,0.94))] shadow-[0_18px_34px_rgba(14,116,144,0.12)]')
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={estadisticasSeleccionadas.includes(indiceOriginal)}
                        onChange={() => toggleSeleccionEstadistica(indiceOriginal)}
                        className="mt-1"
                      />
                    </label>
                    <div className="space-y-3">
                      <div>
                        <h4 className={`text-xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{metricaVisible}</h4>
                        <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                          {resumenContexto.join(' · ') || t('Sin contexto adicional', 'No extra context')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {disciplinaVisible && (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            esOscuro
                              ? 'bg-cyan-400/12 text-cyan-200'
                              : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'
                          }`}>
                            {disciplinaVisible}
                          </span>
                        )}
                        {contextoVisible && (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            esOscuro
                              ? 'bg-amber-400/12 text-amber-200'
                              : 'border border-amber-300 bg-white text-amber-800 shadow-[0_8px_18px_rgba(245,158,11,0.14)]'
                          }`}>
                            {contextoVisible}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex min-w-[5rem] justify-center rounded-2xl px-4 py-3 text-2xl font-black ${
                        esOscuro
                          ? 'bg-cyan-400/10 text-cyan-300'
                          : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_22px_rgba(34,211,238,0.16)]'
                      }`}>
                        {item.valor}
                      </div>
                      <p className={`mt-3 text-xs uppercase tracking-[0.24em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        {fechaVisible || t('Sin fecha', 'No date')}
                      </p>
                    </div>
                  </div>
                  <div className={`mt-4 flex flex-wrap gap-3 border-t pt-4 ${
                    esOscuro ? 'border-white/8' : 'border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => editarEstadistica(item, indiceOriginal)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                        esOscuro
                          ? 'border border-cyan-400/30 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/22'
                          : 'border border-cyan-300 bg-cyan-600 text-white shadow-[0_10px_22px_rgba(8,145,178,0.24)] hover:brightness-110'
                      }`}
                    >
                      {t('Editar', 'Edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarEstadistica(indiceOriginal)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                        esOscuro
                          ? 'border border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22'
                          : 'border border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110'
                      }`}
                    >
                      {t('Eliminar', 'Delete')}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  if (moduloActivo === 'sesiones') {
    return (
      <ListadoAsignaciones
        titulo={t('Sesiones y entrenamientos asignados', 'Assigned sessions and training')}
        vacio={t('Todavía no tienes sesiones asignadas por un entrenador.', 'You do not have sessions assigned by a coach yet.')}
        items={datos.sesiones}
        renderItem={(sesion) => (
          <>
            <div>
              <h4 className="font-semibold">{sesion.tipo}</h4>
              <p className="mt-1 text-sm text-slate-300">{sesion.descripcion || t('Sin descripci?n adicional.', 'No additional description.')}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{sesion.entrenadorNombre}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{sesion.estado}</span>
              <p className="mt-3 text-sm text-slate-400">{sesion.fecha}</p>
            </div>
          </>
        )}
      />
    )
  }

  if (moduloActivo === 'metas') {
    return (
      <ListadoAsignaciones
        titulo={t('Metas asignadas', 'Assigned goals')}
        vacio={t('Todavía no tienes metas asignadas por un entrenador.', 'You do not have goals assigned by a coach yet.')}
        items={metasLocales}
        renderItem={(meta) => (
          <div className="w-full">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{meta.titulo}</h4>
                <p className="mt-1 text-sm text-slate-300">{meta.descripcion || t('Sin descripci?n adicional.', 'No additional description.')}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{meta.entrenadorNombre}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">{meta.progreso} / {meta.objetivo}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{meta.fechaLimite || t('Sin fecha limite', 'No deadline')}</p>
              </div>
            </div>
            <div className="mt-4 h-3 rounded-full bg-slate-800">
              <div
                className="h-3 rounded-full bg-cyan-400"
                style={{ width: `${Math.min((meta.progreso / (meta.objetivo || 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Campo
                label={t('Progreso actual', 'Current progress')}
                type="number"
                value={meta.progreso}
                onChange={(value) =>
                  setMetasLocales((previas) =>
                    previas.map((item) =>
                      item.id === meta.id
                        ? {
                            ...item,
                            progreso: Number(value) || 0,
                            estado:
                              (Number(value) || 0) >= item.objetivo && item.objetivo > 0
                                ? 'completada'
                                : 'en progreso',
                          }
                        : item
                    )
                  )
                }
              />
              <div>
                <Etiqueta>{t('Estado', 'Status')}</Etiqueta>
                <select
                  value={meta.estado}
                  onChange={(e) =>
                    setMetasLocales((previas) =>
                      previas.map((item) =>
                        item.id === meta.id
                          ? { ...item, estado: e.target.value }
                          : item
                      )
                    )
                  }
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/70 text-white'
                : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
            }`}
                >
                  <option value="en progreso">{t('En progreso', 'In progress')}</option>
                  <option value="completada">{t('Completada', 'Completed')}</option>
                  <option value="pausada">{t('Pausada', 'Paused')}</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={async () => {
                    await guardarCambios((actuales) => ({
                      ...actuales,
                      metas: metasLocales,
                    }))
                  }}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {t('Guardar progreso', 'Save progress')}
                </button>
              </div>
            </div>
          </div>
        )}
      />
    )
  }

  if (moduloActivo === 'competencias') {
    return (
      <ListadoAsignaciones
        titulo={t('Competencias asignadas', 'Assigned competitions')}
        vacio={t('Todavía no tienes competencias asignadas.', 'You do not have competitions assigned yet.')}
        items={datos.competencias}
        renderItem={(competencia) => (
          <>
            <div>
              <h4 className="font-semibold">{competencia.nombre}</h4>
              <p className="mt-1 text-sm text-slate-300">{competencia.ubicacion || t('Ubicación por definir', 'Location to be defined')}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{competencia.entrenadorNombre}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{competencia.estado || competencia.resultado || t('Asignada', 'Assigned')}</span>
              <p className="mt-3 text-sm text-slate-400">{competencia.fecha}</p>
            </div>
          </>
        )}
      />
    )
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Reconocimientos', 'Recognitions')}</p>
      <h3 className="mt-2 text-2xl font-semibold">{t('Logros del deportista', 'Athlete achievements')}</h3>
      {datos.logros.length === 0 && ranking.length === 0 ? (
        <div className="mt-6">
          <EstadoVacio mensaje={t('Tus logros aparecerán aquí cuando completes metas o acumules avances relevantes.', 'Your achievements will appear here when you complete goals or accumulate meaningful progress.')} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {datos.logros.map((logro) => {
            const badge = obtenerBadgeLogro(logro, t)
            const porcentajeLogro = Number(logro.porcentaje) || 0
            const porcentajeVisible = Math.max(0, Math.min(200, porcentajeLogro))

            return (
              <div
                key={logro.id}
                className={`relative overflow-hidden rounded-[28px] border p-5 ${esOscuro
                  ? 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.7))] shadow-[0_24px_48px_rgba(2,6,23,0.34)]'
                  : 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,251,235,0.96))] shadow-[0_18px_34px_rgba(245,158,11,0.14)]'}`}
              >
                <div className={`pointer-events-none absolute inset-x-5 top-0 h-1 rounded-full ${badge.brillo}`} />
                <div className="flex items-start gap-4">
                  <div className={`flex h-18 w-18 shrink-0 items-center justify-center rounded-[22px] border text-4xl shadow-[0_16px_28px_rgba(15,23,42,0.18)] ${badge.fondo} ${badge.borde}`}>
                    <span aria-hidden="true">{badge.icono}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${badge.etiqueta}`}>
                        {badge.nombre}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${esOscuro ? 'bg-cyan-400/12 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'}`}>
                        {limpiarTextoVisual(logro.nivel || t('Logro', 'Achievement'))}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${esOscuro ? 'bg-amber-400/12 text-amber-200' : 'border border-amber-300 bg-white text-amber-700 shadow-[0_8px_18px_rgba(245,158,11,0.16)]'}`}>
                        {porcentajeLogro}% {t('cumplido', 'completed')}
                      </span>
                    </div>
                    <h4 className="mt-3 text-xl font-semibold">{logro.titulo}</h4>
                    <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{logro.descripcion}</p>
                    <p className={`mt-3 text-xs font-medium uppercase tracking-[0.22em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                      {badge.descripcion}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em]">
                    <span className={esOscuro ? 'text-slate-400' : 'text-slate-500'}>{t('Avance del badge', 'Badge progress')}</span>
                    <span className={esOscuro ? 'text-white' : 'text-slate-900'}>{porcentajeLogro}%</span>
                  </div>
                  <div className={`h-3 overflow-hidden rounded-full ${esOscuro ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${badge.brillo}`}
                      style={{ width: `${Math.min(100, porcentajeVisible)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ModuloAdministrador({ datos, moduloActivo, guardarCambios, cambiarEstadoUsuario }) {
  const [perfil, setPerfil] = useState(datos.perfil)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nombreFotoPerfil, setNombreFotoPerfil] = useState('')
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [filtroRolAdmin, setFiltroRolAdmin] = useState('')
  const [filtroEstadoAdmin, setFiltroEstadoAdmin] = useState('')
  const { esOscuro, t } = useUI()

  const perfilRef = useRef(JSON.stringify(datos.perfil))

  useEffect(() => {
    const perfilStr = JSON.stringify(datos.perfil)
    if (perfilRef.current !== perfilStr) {
      perfilRef.current = perfilStr
      setPerfil(datos.perfil)
      setNombreFotoPerfil('')
    }
  }, [datos.perfil])

  const usuariosAdminVisibles = useMemo(() => (
    (datos.usuarios || []).filter((item) => obtenerRolSeguro(item.rol) !== 'administrador')
  ), [datos.usuarios])
  const usuariosFiltrados = useMemo(() => (
    usuariosAdminVisibles.filter((item) => {
      const coincideRol = !filtroRolAdmin || item.rol === filtroRolAdmin
      const coincideEstado = !filtroEstadoAdmin || item.estado === filtroEstadoAdmin
      const coincideBusqueda =
        !busquedaUsuarios.trim() ||
        [item.nombreCompleto, item.correo, item.rol, item.estado, item.perfil?.disciplina, item.perfil?.especialidad]
          .some((fragmento) => textoIncluye(fragmento, busquedaUsuarios))

      return coincideRol && coincideEstado && coincideBusqueda
    })
  ), [busquedaUsuarios, filtroEstadoAdmin, filtroRolAdmin, usuariosAdminVisibles])

  const resumenAdmin = datos.resumenAdmin || {}
  const actividadDestacada = (datos.actividadAdmin || [])
    .filter((item) => obtenerRolSeguro(item.rol) !== 'administrador')
    .slice(0, 6)
  const usuariosRecientes = [...usuariosAdminVisibles]
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0))
    .slice(0, 5)
  const distribucionRoles = [
    { id: 'deportista', nombre: t('Deportistas', 'Athletes'), valor: resumenAdmin.deportistas || 0, tono: esOscuro ? 'bg-cyan-400/15 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800' },
    { id: 'entrenador', nombre: t('Entrenadores', 'Coaches'), valor: resumenAdmin.entrenadores || 0, tono: esOscuro ? 'bg-violet-400/15 text-violet-200' : 'border border-violet-300 bg-white text-violet-800' },
  ]
  const totalRoles = distribucionRoles.reduce((acum, item) => acum + item.valor, 0)
  const tasaActivos = resumenAdmin.usuarios ? Math.round(((resumenAdmin.activos || 0) / resumenAdmin.usuarios) * 100) : 0

  // Reutiliza el guardado base64 para que el admin tambien pueda identificarse visualmente.
  const cargarFotoPerfil = (archivo) => {
    if (!archivo || !archivo.type?.startsWith('image/')) return
    setNombreFotoPerfil(archivo.name)
    const lector = new FileReader()
    lector.onload = () => {
      setPerfil((previo) => ({ ...previo, foto: lector.result }))
    }
    lector.readAsDataURL(archivo)
  }

  if (moduloActivo === 'perfil') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{t('Perfil institucional', 'Institutional profile')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{t('Administración general', 'General administration')}</h3>
            <p className={`mt-3 max-w-xl text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('Este perfil identifica a la persona responsable de supervisar usuarios, actividad y comportamiento global de la plataforma.', 'This profile identifies the person responsible for supervising users, activity, and the overall behavior of the platform.')}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ResumenAsignadoSimple
              titulo={t('Usuarios activos', 'Active users')}
              vacio={t('Aún no hay usuarios activos para mostrar.', 'There are no active users to show yet.')}
              items={usuariosAdminVisibles.filter((item) => item.estado === 'activo').slice(0, 4)}
              render={(item) => `${item.nombreCompleto} · ${etiquetaRolVisible(item.rol, t)}`}
            />
            <ResumenAsignadoSimple
              titulo={t('Actividad reciente', 'Recent activity')}
              vacio={t('Aún no hay actividad suficiente para mostrar.', 'There is not enough activity to show yet.')}
              items={actividadDestacada.slice(0, 4)}
              render={(item) => `${item.nombreCompleto} · ${item.resumen?.estadisticas || 0} stats`}
            />
          </div>
        </div>

        {editandoPerfil ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const guardado = await guardarCambios((actuales) => ({ ...actuales, perfil }))
              if (guardado) {
                setEditandoPerfil(false)
                setNombreFotoPerfil('')
              }
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Campo label={t('Cargo', 'Role title')} value={perfil.cargo} onChange={(value) => setPerfil({ ...perfil, cargo: value })} />
            <Campo label={t('Área', 'Area')} value={perfil.area} onChange={(value) => setPerfil({ ...perfil, area: value })} />
            <div className="md:col-span-2">
              <SelectorFotoPerfil
                nombreArchivo={nombreFotoPerfil}
                fotoActual={perfil.foto}
                onSeleccionar={cargarFotoPerfil}
              />
            </div>
            <div className="md:col-span-2">
              <Etiqueta>{t('Resumen ejecutivo', 'Executive summary')}</Etiqueta>
              <textarea
                value={perfil.bio}
                onChange={(e) => setPerfil({ ...perfil, bio: e.target.value })}
                className={`mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-cyan-300 bg-white text-slate-900 shadow-[0_12px_28px_rgba(14,116,144,0.14)]'
                }`}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">
                {t('Guardar perfil', 'Save profile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPerfil(datos.perfil)
                  setEditandoPerfil(false)
                }}
                className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                  esOscuro
                    ? 'border-white/15 text-slate-200 hover:bg-white/5'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {t('Cancelar', 'Cancel')}
              </button>
            </div>
          </form>
        ) : (
          <TarjetaPerfilGuardado
            etiqueta={t('Perfil guardado', 'Saved profile')}
            titulo={datos.perfil.cargo || t('Administrador de plataforma', 'Platform administrator')}
            descripcion={datos.perfil.bio || t('Sin resumen ejecutivo registrado.', 'No executive summary saved yet.')}
            foto={datos.perfil.foto}
            campos={[
              { label: t('Cargo', 'Role title'), value: datos.perfil.cargo },
              { label: t('Área', 'Area'), value: datos.perfil.area },
            ]}
            accionTexto={t('Editar perfil', 'Edit profile')}
            onAccion={() => setEditandoPerfil(true)}
          />
        )}
      </div>
    )
  }

  if (moduloActivo === 'usuarios') {
    return (
      <div className="space-y-6">
        <div className={`grid gap-4 rounded-[28px] border p-5 md:grid-cols-4 ${
          esOscuro
            ? 'border-white/8 bg-white/5'
            : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-[0_18px_34px_rgba(14,116,144,0.1)]'
        }`}>
          <div className="md:col-span-2">
            <Etiqueta>{t('Buscar usuario', 'Search user')}</Etiqueta>
            <input
              value={busquedaUsuarios}
              onChange={(e) => setBusquedaUsuarios(e.target.value)}
              placeholder={t('Busque por nombre, correo, rol o especialidad.', 'Search by name, email, role, or specialty.')}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro
                  ? 'border-white/10 bg-slate-950/70 text-white'
                  : 'border-cyan-300 bg-white text-slate-900 shadow-[0_12px_24px_rgba(14,116,144,0.12)]'
              }`}
            />
          </div>
          <div>
            <Etiqueta>{t('Filtrar por rol', 'Filter by role')}</Etiqueta>
            <select
              value={filtroRolAdmin}
              onChange={(e) => setFiltroRolAdmin(e.target.value)}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro ? 'border-white/10 bg-slate-950/70 text-white' : 'border-cyan-300 bg-white text-slate-900'
              }`}
            >
              <option value="">{t('Todos', 'All')}</option>
              <option value="deportista">{t('Deportista', 'Athlete')}</option>
              <option value="entrenador">{t('Entrenador', 'Coach')}</option>
            </select>
          </div>
          <div>
            <Etiqueta>{t('Filtrar por estado', 'Filter by status')}</Etiqueta>
            <select
              value={filtroEstadoAdmin}
              onChange={(e) => setFiltroEstadoAdmin(e.target.value)}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro ? 'border-white/10 bg-slate-950/70 text-white' : 'border-cyan-300 bg-white text-slate-900'
              }`}
            >
              <option value="">{t('Todos', 'All')}</option>
              <option value="activo">{t('Activo', 'Active')}</option>
              <option value="inactivo">{t('Inactivo', 'Inactive')}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {usuariosFiltrados.length === 0 ? (
            <EstadoVacio mensaje={t('No hay usuarios que coincidan con los filtros seleccionados.', 'There are no users that match the selected filters.')} />
          ) : (
            usuariosFiltrados.map((item) => (
              <div
                key={item.id}
                className={`rounded-[26px] border p-5 ${
                  esOscuro
                    ? 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.64))]'
                    : 'border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(240,249,255,0.94))] shadow-[0_18px_34px_rgba(14,116,144,0.12)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold">{formatearNombreVisible(item.nombreCompleto)}</h4>
                    <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{item.correo}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${esOscuro ? 'bg-cyan-400/12 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'}`}>
                        {etiquetaRolVisible(item.rol, t)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.estado === 'activo'
                          ? (esOscuro ? 'bg-emerald-400/12 text-emerald-200' : 'bg-emerald-100 text-emerald-900')
                          : (esOscuro ? 'bg-amber-400/12 text-amber-200' : 'bg-amber-100 text-amber-900')
                      }`}>
                        {etiquetaEstadoVisible(item.estado, t)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs uppercase tracking-[0.24em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{t('Registrado', 'Registered')}</p>
                    <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-200' : 'text-slate-700'}`}>
                      {item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleDateString('es-CR') : t('Sin fecha', 'No date')}
                    </p>
                  </div>
                </div>
                <div className={`mt-4 grid gap-3 border-t pt-4 md:grid-cols-4 ${esOscuro ? 'border-white/8' : 'border-slate-200'}`}>
                  <MiniDatoAdmin titulo={t('Estadísticas', 'Statistics')} valor={item.resumen?.estadisticas || 0} />
                  <MiniDatoAdmin titulo={t('Metas', 'Goals')} valor={item.resumen?.metas || 0} />
                  <MiniDatoAdmin titulo={t('Sesiones', 'Sessions')} valor={item.resumen?.sesiones || 0} />
                  <MiniDatoAdmin titulo={t('Competencias', 'Competitions')} valor={item.resumen?.competencias || 0} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => cambiarEstadoUsuario(item.id, item.estado === 'activo' ? 'inactivo' : 'activo')}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      item.estado === 'activo'
                        ? (esOscuro
                            ? 'border border-amber-400/30 bg-amber-400/12 text-amber-100 hover:bg-amber-400/22'
                            : 'border border-amber-300 bg-amber-500 text-white hover:brightness-110')
                        : (esOscuro
                            ? 'border border-emerald-400/30 bg-emerald-400/12 text-emerald-100 hover:bg-emerald-400/22'
                            : 'border border-emerald-300 bg-emerald-600 text-white hover:brightness-110')
                    }`}
                  >
                    {item.estado === 'activo' ? t('Desactivar usuario', 'Deactivate user') : t('Activar usuario', 'Activate user')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={`rounded-[28px] border p-5 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-cyan-200 bg-white shadow-[0_18px_34px_rgba(14,116,144,0.12)]'}`}>
        <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-800'}`}>{t('Actividad destacada', 'Highlighted activity')}</p>
        <div className="mt-4 space-y-3">
          {actividadDestacada.length === 0 ? (
            <EstadoVacio mensaje={t('Aún no hay actividad suficiente para construir esta vista.', 'There is not enough activity to build this view yet.')} />
          ) : (
            actividadDestacada.map((item) => (
              <div key={item.id} className={`rounded-2xl border px-4 py-3 ${esOscuro ? 'border-white/8 bg-slate-950/45' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatearNombreVisible(item.nombreCompleto)}</p>
                    <p className={`text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{item.correo}</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${esOscuro ? 'bg-cyan-400/12 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'}`}>
                    {etiquetaRolVisible(item.rol, t)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`rounded-[28px] border p-5 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-cyan-200 bg-white shadow-[0_18px_34px_rgba(14,116,144,0.12)]'}`}>
        <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-amber-300' : 'text-amber-700'}`}>{t('Volumen general', 'General volume')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MiniDatoAdmin titulo={t('Estadísticas globales', 'Global statistics')} valor={datos.resumenAdmin?.estadisticas || 0} amplio />
          <MiniDatoAdmin titulo={t('Metas globales', 'Global goals')} valor={datos.resumenAdmin?.metas || 0} amplio />
          <MiniDatoAdmin titulo={t('Sesiones globales', 'Global sessions')} valor={datos.resumenAdmin?.sesiones || 0} amplio />
          <MiniDatoAdmin titulo={t('Competencias globales', 'Global competitions')} valor={datos.resumenAdmin?.competencias || 0} amplio />
        </div>
      </div>
    </div>
  )
}

function ModuloEntrenador({ datos, moduloActivo, guardarCambios, vincularDeportista }) {
  const [perfil, setPerfil] = useState(datos.perfil)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nombreFotoPerfil, setNombreFotoPerfil] = useState('')
  const [deportistasSeleccionados, setDeportistasSeleccionados] = useState([])
  const [sesionesSeleccionadas, setSesionesSeleccionadas] = useState([])
  const [metasSeleccionadas, setMetasSeleccionadas] = useState([])
  const [competenciasSeleccionadas, setCompetenciasSeleccionadas] = useState([])
  const [observacionesSeleccionadas, setObservacionesSeleccionadas] = useState([])
  const [correoDeportista, setCorreoDeportista] = useState('')
  const [edicionSesionId, setEdicionSesionId] = useState('')
  const [edicionMetaId, setEdicionMetaId] = useState('')
  const [edicionCompetenciaId, setEdicionCompetenciaId] = useState('')
  const [edicionObservacionId, setEdicionObservacionId] = useState('')
  const [filtroDeportistaId, setFiltroDeportistaId] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [busquedaLista, setBusquedaLista] = useState('')
  const [busquedaSelector, setBusquedaSelector] = useState('')
  const [nuevaSesion, setNuevaSesion] = useState({
    fecha: '2026-05-10',
    tipo: '',
    descripcion: '',
    estado: 'pendiente',
    asignados: [],
  })
  const [nuevaMeta, setNuevaMeta] = useState({
    titulo: '',
    descripcion: '',
    objetivo: 1,
    progreso: 0,
    estado: 'en progreso',
    fechaLimite: '',
    asignados: [],
    asignaciones: [],
  })
  const [nuevaCompetencia, setNuevaCompetencia] = useState({
    nombre: '',
    fecha: '2026-05-18',
    estado: 'Programada',
    ubicacion: '',
    resultado: '',
    inscritos: 0,
    asignados: [],
  })
  const [nuevaObservacion, setNuevaObservacion] = useState({
    deportistaId: '',
    deportista: '',
    nota: '',
    prioridad: 'media',
  })
  const { esOscuro, t } = useUI()

  const opcionesDeportistas = useMemo(() => obtenerOpcionesDeportistas(datos), [datos])
  const perfilTieneContenido = perfilEntrenadorTieneContenido(datos.perfil)
  const disciplinas = useMemo(
    () => [...new Set((datos.deportistas || []).map((item) => item.disciplina).filter(Boolean))],
    [datos.deportistas]
  )
  const busquedaListaNormalizada = normalizarTexto(busquedaLista)
  const busquedaSelectorNormalizada = normalizarTexto(busquedaSelector)

  const toggleAsignado = (ids, setter, deportistaId) => {
    setter((previo) => ({
      ...previo,
      asignados: previo.asignados.includes(deportistaId)
        ? previo.asignados.filter((id) => id !== deportistaId)
        : [...previo.asignados, deportistaId],
    }))
  }

  const resolverNombresAsignados = (ids) =>
    opcionesDeportistas
      .filter((deportista) => ids.includes(deportista.id))
      .map((deportista) => deportista.nombre)

  const construirAsignacionesMeta = (seleccionados, objetivoBase, previas = []) =>
    seleccionados.map((deportistaId) => {
      const previa = previas.find((item) => item.deportistaId === deportistaId)
      const deportista = opcionesDeportistas.find((item) => item.id === deportistaId)
      const objetivo = Number(previa?.objetivo ?? objetivoBase) || 0
      const progreso = Number(previa?.progreso) || 0
      return {
        deportistaId,
        nombre: deportista?.nombre || previa?.nombre || '',
        progreso,
        objetivo,
        estado: previa?.estado || (progreso >= objetivo && objetivo > 0 ? 'completada' : 'en progreso'),
      }
    })

  const resetSesion = () => {
    setEdicionSesionId('')
    setNuevaSesion({ fecha: '2026-05-10', tipo: '', descripcion: '', estado: 'pendiente', asignados: [] })
  }

  const resetMeta = () => {
    setEdicionMetaId('')
    setNuevaMeta({
      titulo: '',
      descripcion: '',
      objetivo: 1,
      progreso: 0,
      estado: 'en progreso',
      fechaLimite: '',
      asignados: [],
      asignaciones: [],
    })
  }

  const resetCompetencia = () => {
    setEdicionCompetenciaId('')
    setNuevaCompetencia({
      nombre: '',
      fecha: '2026-05-18',
      estado: 'Programada',
      ubicacion: '',
      resultado: '',
      inscritos: 0,
      asignados: [],
    })
  }

  const resetObservacion = () => {
    setEdicionObservacionId('')
    setNuevaObservacion({ deportistaId: '', deportista: '', nota: '', prioridad: 'media' })
  }

  // Convierte la imagen seleccionada a base64 para guardarla dentro del perfil del entrenador.
  const cargarFotoPerfil = (archivo) => {
    if (!archivo) return
    if (!archivo.type?.startsWith('image/')) return

    setNombreFotoPerfil(archivo.name)
    const lector = new FileReader()
    lector.onload = () => {
      setPerfil((previo) => ({ ...previo, foto: lector.result }))
    }
    lector.readAsDataURL(archivo)
  }

  const coincideFiltroDeportista = (item) => {
    if (!filtroDeportistaId) return true
    const ids = item.asignados || []
    if (item.deportistaId) return item.deportistaId === filtroDeportistaId
    return ids.includes(filtroDeportistaId)
  }

  const coincideFiltroDisciplina = (item) => {
    if (!filtroDisciplina) return true
    if (item.disciplina) return item.disciplina === filtroDisciplina
    const ids = item.asignados || (item.deportistaId ? [item.deportistaId] : [])
    return ids.some((id) => datos.deportistas.some((dep) => dep.id === id && dep.disciplina === filtroDisciplina))
  }

  // Ejecuta la busqueda dinamica sobre el texto relevante de cada modulo.
  const coincideBusqueda = (item) => {
    if (!busquedaListaNormalizada) return true

    const fragmentos = [
      item.nombre,
      item.correo,
      item.disciplina,
      item.tipo,
      item.titulo,
      item.descripcion,
      item.estado,
      item.ubicacion,
      item.resultado,
      item.fecha,
      item.nota,
      item.prioridad,
      item.deportista,
      ...(item.asignadoNombres || []),
      ...(item.asignaciones || []).flatMap((asignacion) => [
        asignacion.nombre,
        asignacion.estado,
        asignacion.objetivo,
        asignacion.progreso,
      ]),
    ]

    return fragmentos.some((fragmento) => textoIncluye(fragmento, busquedaListaNormalizada))
  }

  const deportistasFiltrados = datos.deportistas.filter((deportista) => {
    const coincideId = !filtroDeportistaId || deportista.id === filtroDeportistaId
    const coincideDisciplina = !filtroDisciplina || deportista.disciplina === filtroDisciplina
    return coincideId && coincideDisciplina && coincideBusqueda(deportista)
  })

  const sesionesFiltradas = datos.sesiones.filter((sesion) => coincideFiltroDeportista(sesion) && coincideFiltroDisciplina(sesion) && coincideBusqueda(sesion))
  const metasFiltradas = datos.metas.filter((meta) => coincideFiltroDeportista(meta) && coincideFiltroDisciplina(meta) && coincideBusqueda(meta))
  const competenciasFiltradas = datos.competencias.filter((competencia) => coincideFiltroDeportista(competencia) && coincideFiltroDisciplina(competencia) && coincideBusqueda(competencia))
  const observacionesFiltradas = datos.observaciones.filter((observacion) => coincideFiltroDeportista(observacion) && coincideFiltroDisciplina(observacion) && coincideBusqueda(observacion))

  // Filtra deportistas dentro del selector multiple para no saturar la asignacion.
  const deportistasSelectorFiltrados = opcionesDeportistas.filter((deportista) => {
    const coincideTexto =
      !busquedaSelectorNormalizada ||
      textoIncluye(
        [deportista.nombre, deportista.descripcion].filter(Boolean).join(' '),
        busquedaSelectorNormalizada,
      )
    const coincideDisciplina = !filtroDisciplina || deportista.descripcion.includes(filtroDisciplina)
    return coincideTexto && coincideDisciplina
  })

  const seleccionarTodosVisibles = (setter) => {
    const idsVisibles = deportistasSelectorFiltrados.map((deportista) => deportista.id)
    setter((previo) => ({
      ...previo,
      asignados: Array.from(new Set([...(previo.asignados || []), ...idsVisibles])),
    }))
  }

  const deseleccionarTodosVisibles = (setter) => {
    const idsVisibles = new Set(deportistasSelectorFiltrados.map((deportista) => deportista.id))
    setter((previo) => ({
      ...previo,
      asignados: (previo.asignados || []).filter((id) => !idsVisibles.has(id)),
    }))
  }

  const totalResultadosVisibles =
    moduloActivo === 'deportistas'
      ? deportistasFiltrados.length
      : moduloActivo === 'sesiones'
        ? sesionesFiltradas.length
        : moduloActivo === 'metas'
          ? metasFiltradas.length
          : moduloActivo === 'competencias'
            ? competenciasFiltradas.length
            : observacionesFiltradas.length

  const toggleSeleccionLista = (setter, id) => {
    setter((previas) => (
      previas.includes(id)
        ? previas.filter((item) => item !== id)
        : [...previas, id]
    ))
  }

  const seleccionarIdsVisibles = (setter, ids) => {
    setter((previas) => Array.from(new Set([...(previas || []), ...ids])))
  }

  const deseleccionarIdsVisibles = (setter, ids) => {
    setter((previas) => (previas || []).filter((id) => !ids.includes(id)))
  }

  const idsDeportistasVisibles = deportistasFiltrados.map((item) => item.id)
  const idsSesionesVisibles = sesionesFiltradas.map((item) => item.id)
  const idsMetasVisibles = metasFiltradas.map((item) => item.id)
  const idsCompetenciasVisibles = competenciasFiltradas.map((item) => item.id)
  const idsObservacionesVisibles = observacionesFiltradas.map((item) => item.id)

  const desvincularDeportistasSeleccionados = async () => {
    if (!deportistasSeleccionados.length) return

    const idsSeleccionados = new Set(deportistasSeleccionados)
    const nombresSeleccionados = new Set(
      datos.deportistas
        .filter((deportista) => idsSeleccionados.has(deportista.id))
        .map((deportista) => deportista.nombre)
    )

    await guardarCambios((actuales) => ({
      ...actuales,
      deportistas: actuales.deportistas.filter((item) => !idsSeleccionados.has(item.id)),
      sesiones: actuales.sesiones
        .map((sesion) => ({
          ...sesion,
          asignados: (sesion.asignados || []).filter((id) => !idsSeleccionados.has(id)),
          asignadoNombres: (sesion.asignadoNombres || []).filter((nombre) => !nombresSeleccionados.has(nombre)),
        }))
        .filter((sesion) => (sesion.asignados || []).length > 0),
      metas: actuales.metas
        .map((meta) => ({
          ...meta,
          asignados: (meta.asignados || []).filter((id) => !idsSeleccionados.has(id)),
          asignadoNombres: (meta.asignadoNombres || []).filter((nombre) => !nombresSeleccionados.has(nombre)),
          asignaciones: (meta.asignaciones || []).filter((item) => !idsSeleccionados.has(item.deportistaId)),
        }))
        .filter((meta) => (meta.asignados || []).length > 0),
      competencias: actuales.competencias
        .map((competencia) => {
          const asignadosActualizados = (competencia.asignados || []).filter((id) => !idsSeleccionados.has(id))
          return {
            ...competencia,
            asignados: asignadosActualizados,
            asignadoNombres: (competencia.asignadoNombres || []).filter((nombre) => !nombresSeleccionados.has(nombre)),
            inscritos: asignadosActualizados.length,
          }
        })
        .filter((competencia) => (competencia.asignados || []).length > 0),
      observaciones: actuales.observaciones.filter((item) => !idsSeleccionados.has(item.deportistaId)),
    }))

    if (filtroDeportistaId && idsSeleccionados.has(filtroDeportistaId)) {
      setFiltroDeportistaId('')
    }

    setDeportistasSeleccionados([])
  }

  const eliminarSesionesSeleccionadas = async () => {
    if (!sesionesSeleccionadas.length) return
    const idsSeleccionados = new Set(sesionesSeleccionadas)
    await guardarCambios((actuales) => ({
      ...actuales,
      sesiones: actuales.sesiones.filter((item) => !idsSeleccionados.has(item.id)),
    }))
    if (edicionSesionId && idsSeleccionados.has(edicionSesionId)) resetSesion()
    setSesionesSeleccionadas([])
  }

  const eliminarMetasSeleccionadas = async () => {
    if (!metasSeleccionadas.length) return
    const idsSeleccionados = new Set(metasSeleccionadas)
    await guardarCambios((actuales) => ({
      ...actuales,
      metas: actuales.metas.filter((item) => !idsSeleccionados.has(item.id)),
    }))
    if (edicionMetaId && idsSeleccionados.has(edicionMetaId)) resetMeta()
    setMetasSeleccionadas([])
  }

  const eliminarCompetenciasSeleccionadas = async () => {
    if (!competenciasSeleccionadas.length) return
    const idsSeleccionados = new Set(competenciasSeleccionadas)
    await guardarCambios((actuales) => ({
      ...actuales,
      competencias: actuales.competencias.filter((item) => !idsSeleccionados.has(item.id)),
    }))
    if (edicionCompetenciaId && idsSeleccionados.has(edicionCompetenciaId)) resetCompetencia()
    setCompetenciasSeleccionadas([])
  }

  const eliminarObservacionesSeleccionadas = async () => {
    if (!observacionesSeleccionadas.length) return
    const idsSeleccionados = new Set(observacionesSeleccionadas)
    await guardarCambios((actuales) => ({
      ...actuales,
      observaciones: actuales.observaciones.filter((item) => !idsSeleccionados.has(item.id)),
    }))
    if (edicionObservacionId && idsSeleccionados.has(edicionObservacionId)) resetObservacion()
    setObservacionesSeleccionadas([])
  }

  const FiltrosEntrenador = (
    <div className={`mb-6 grid gap-4 rounded-2xl border p-4 md:grid-cols-4 ${
      esOscuro
        ? 'border-white/8 bg-white/5'
        : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_16px_30px_rgba(14,116,144,0.1)]'
    }`}>
      <div className="md:col-span-4">
        <Etiqueta>{t('Búsqueda dinámica', 'Dynamic search')}</Etiqueta>
        <input
          value={busquedaLista}
          onChange={(e) => setBusquedaLista(e.target.value)}
          placeholder={t('Busque por nombre, correo, disciplina, título o descripción.', 'Search by name, email, discipline, title or description.')}
          className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
            esOscuro
              ? 'border-white/10 bg-slate-950/70 text-white placeholder:text-slate-400'
              : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
          }`}
        />
      </div>
      <div>
        <Etiqueta>{t('Filtrar por deportista', 'Filter by athlete')}</Etiqueta>
        <select
          value={filtroDeportistaId}
          onChange={(e) => setFiltroDeportistaId(e.target.value)}
          className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
            esOscuro
              ? 'border-white/10 bg-slate-950/70 text-white'
              : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
          }`}
        >
          <option value="">{t('Todos', 'All')}</option>
          {opcionesDeportistas.map((deportista) => (
            <option key={deportista.id} value={deportista.id}>{deportista.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <Etiqueta>{t('Filtrar por disciplina', 'Filter by discipline')}</Etiqueta>
        <select
          value={filtroDisciplina}
          onChange={(e) => setFiltroDisciplina(e.target.value)}
          className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
            esOscuro
              ? 'border-white/10 bg-slate-950/70 text-white'
              : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
          }`}
        >
          <option value="">{t('Todas', 'All')}</option>
          {disciplinas.map((disciplina) => (
            <option key={disciplina} value={disciplina}>{disciplina}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={() => {
            setFiltroDeportistaId('')
            setFiltroDisciplina('')
            setBusquedaLista('')
          }}
          className={`w-full rounded-2xl border px-4 py-3 font-semibold transition ${
            esOscuro
              ? 'border-white/15 text-slate-200 hover:bg-white/5'
              : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'
          }`}
        >
          {t('Limpiar filtros', 'Clear filters')}
        </button>
      </div>
      <div className="flex items-end">
        <div className={`w-full rounded-2xl border px-4 py-3 text-sm ${
          esOscuro
            ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'
            : 'border-cyan-300/80 bg-cyan-50 text-cyan-900'
        }`}>
          {t('Resultados visibles', 'Visible results')}: <span className="font-semibold">{totalResultadosVisibles}</span>
        </div>
      </div>
    </div>
  )

  if (moduloActivo === 'perfil') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{t('Perfil profesional', 'Professional profile')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{t('Configuración del entrenador', 'Coach settings')}</h3>
            <p className={`mt-3 max-w-xl text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('Esta ficha resume su enfoque de trabajo y mantiene el perfil alineado con el estilo visual del tablero.', 'This card summarizes your coaching focus and keeps your profile aligned with the dashboard visual style.')}
            </p>
          </div>
          {!perfilTieneContenido && (
            <EstadoVacio mensaje={t('Todavía no ha guardado su perfil profesional.', 'You have not saved your professional profile yet.')} />
          )}
        </div>

        {editandoPerfil || !perfilTieneContenido ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await guardarCambios((actuales) => ({ ...actuales, perfil }))
              setEditandoPerfil(false)
            }}
            className={`grid content-start gap-4 rounded-[28px] border p-5 md:grid-cols-2 ${
              esOscuro
                ? 'border-white/8 bg-white/5'
                : 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-[0_18px_34px_rgba(14,116,144,0.1)]'
            }`}
          >
            <Campo label="Especialidad" value={perfil.especialidad} onChange={(value) => setPerfil({ ...perfil, especialidad: value })} />
            <Campo label={t('Categoría', 'Category')} value={perfil.categoria} onChange={(value) => setPerfil({ ...perfil, categoria: value })} />
            <Campo label="Equipo" value={perfil.equipo} onChange={(value) => setPerfil({ ...perfil, equipo: value })} />
            <div className="md:col-span-2">
              <SelectorFotoPerfil
                nombreArchivo={nombreFotoPerfil}
                fotoActual={perfil.foto}
                onSeleccionar={cargarFotoPerfil}
                ayuda={t('Puede subir JPG, JPEG, PNG, WEBP, GIF, SVG y cualquier otro formato de imagen compatible.', 'You can upload JPG, JPEG, PNG, WEBP, GIF, SVG and other compatible image formats.')}
              />
            </div>
            <div className="md:col-span-2">
              <Etiqueta>{t('Metodologia', 'Methodology')}</Etiqueta>
              <textarea
                value={perfil.metodologia}
                onChange={(e) => setPerfil({ ...perfil, metodologia: e.target.value })}
                className={`mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                  esOscuro
                    ? 'border-white/10 bg-slate-950/70 text-white'
                    : 'border-slate-300 bg-white text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.12)]'
                }`}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">
                {t('Guardar perfil', 'Save profile')}
              </button>
              {perfilTieneContenido && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil(datos.perfil)
                    setEditandoPerfil(false)
                  }}
                  className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                    esOscuro
                      ? 'border-white/15 text-slate-200 hover:bg-white/5'
                      : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'
                  }`}
                >
                  {t('Cancelar edicion', 'Cancel editing')}
                </button>
              )}
            </div>
          </form>
        ) : (
          <TarjetaPerfilGuardado
            etiqueta={t('Perfil guardado', 'Saved profile')}
            titulo={datos.perfil.especialidad || t('Entrenador registrado', 'Registered coach')}
            descripcion={datos.perfil.metodologia || t('Sin metodologia registrada.', 'No methodology saved yet.')}
            foto={datos.perfil.foto}
            campos={[
              { label: t('Especialidad', 'Specialty'), value: datos.perfil.especialidad },
              { label: t('Categoría', 'Category'), value: datos.perfil.categoria },
              { label: t('Equipo', 'Team'), value: datos.perfil.equipo },
            ]}
            accionTexto={t('Editar perfil', 'Edit profile')}
            onAccion={() => setEditandoPerfil(true)}
          />
        )}
      </div>
    )
  }

  if (moduloActivo === 'deportistas') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!correoDeportista.trim()) return
            const resultado = await vincularDeportista(correoDeportista.trim())
            if (resultado.ok) {
              setCorreoDeportista('')
            }
          }}
          className="space-y-4"
        >
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{t('Vinculación real', 'Real linking')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{t('Agregar deportista por correo', 'Add athlete by email')}</h3>
            <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('El deportista debe existir como usuario registrado con rol de deportista.', 'The athlete must already exist as a registered user with the athlete role.')}
            </p>
          </div>
          <Campo label={t('Correo del deportista', 'Athlete email')} type="email" value={correoDeportista} onChange={setCorreoDeportista} />
          <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            {t('Vincular deportista', 'Link athlete')}
          </button>
        </form>

        <div className="space-y-4">
          {FiltrosEntrenador}
          {deportistasFiltrados.length > 0 && (
            <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_auto_1fr] ${
              esOscuro
                ? 'border-white/8 bg-white/5'
                : 'border-slate-200 bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.08)]'
            }`}>
              <button type="button" onClick={() => seleccionarIdsVisibles(setDeportistasSeleccionados, idsDeportistasVisibles)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${esOscuro ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18' : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'}`}>{t('Seleccionar visibles', 'Select visible')}</button>
              <button type="button" onClick={() => deseleccionarIdsVisibles(setDeportistasSeleccionados, idsDeportistasVisibles)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${esOscuro ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{t('Deseleccionar visibles', 'Deselect visible')}</button>
              <button type="button" disabled={!deportistasSeleccionados.length} onClick={desvincularDeportistasSeleccionados} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${deportistasSeleccionados.length ? (esOscuro ? 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22' : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110') : (esOscuro ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}>{t('Desvincular seleccionados', 'Unlink selected')}</button>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${esOscuro ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                {t('Seleccionados', 'Selected')}: <span className="font-semibold">{deportistasSeleccionados.length}</span>
              </div>
            </div>
          )}
          {deportistasFiltrados.length === 0 ? (
            <EstadoVacio mensaje={t('Aún no tienes deportistas vinculados. Registre primero sus cuentas y luego agréguelos por correo.', 'You do not have linked athletes yet. Register their accounts first and then add them by email.')} />
          ) : (
            deportistasFiltrados.map((deportista) => (
              <div
                key={deportista.id}
                className={`rounded-2xl border p-4 ${deportistasSeleccionados.includes(deportista.id)
                  ? (esOscuro ? 'border-cyan-400/35 bg-cyan-400/10' : 'border-cyan-300 bg-cyan-50/80')
                  : (esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200/80 bg-white shadow-[0_12px_24px_rgba(148,163,184,0.1)]')
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={deportistasSeleccionados.includes(deportista.id)}
                      onChange={() => toggleSeleccionLista(setDeportistasSeleccionados, deportista.id)}
                      className="mt-1"
                    />
                  </label>
                  <div>
                    <h4 className="font-semibold">{deportista.nombre}</h4>
                    <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{deportista.correo}</p>
                    <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{deportista.disciplina || t('Disciplina pendiente', 'Discipline pending')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-3 py-1 text-sm ${
                      esOscuro
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : 'bg-cyan-100 text-cyan-800'
                    }`}>{deportista.progreso}%</span>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          await guardarCambios((actuales) => ({
                            ...actuales,
                            deportistas: actuales.deportistas.filter((item) => item.id !== deportista.id),
                            sesiones: actuales.sesiones
                              .map((sesion) => ({
                                ...sesion,
                                asignados: (sesion.asignados || []).filter((id) => id !== deportista.id),
                                asignadoNombres: (sesion.asignadoNombres || []).filter((nombre) => nombre !== deportista.nombre),
                              }))
                              .filter((sesion) => (sesion.asignados || []).length > 0),
                            metas: actuales.metas
                              .map((meta) => ({
                                ...meta,
                                asignados: (meta.asignados || []).filter((id) => id !== deportista.id),
                                asignadoNombres: (meta.asignadoNombres || []).filter((nombre) => nombre !== deportista.nombre),
                                asignaciones: (meta.asignaciones || []).filter((item) => item.deportistaId !== deportista.id),
                              }))
                              .filter((meta) => (meta.asignados || []).length > 0),
                            competencias: actuales.competencias
                              .map((competencia) => ({
                                ...competencia,
                                asignados: (competencia.asignados || []).filter((id) => id !== deportista.id),
                                asignadoNombres: (competencia.asignadoNombres || []).filter((nombre) => nombre !== deportista.nombre),
                                inscritos: Math.max(((competencia.asignados || []).filter((id) => id !== deportista.id)).length, 0),
                              }))
                              .filter((competencia) => (competencia.asignados || []).length > 0),
                            observaciones: actuales.observaciones.filter((item) => item.deportistaId !== deportista.id),
                          }))
                          if (filtroDeportistaId === deportista.id) setFiltroDeportistaId('')
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      esOscuro
                        ? 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10'
                        : 'border-rose-300 bg-white text-rose-700 shadow-[0_10px_20px_rgba(251,113,133,0.14)] hover:bg-rose-50'
                    }`}
                      >
                        {t('Desvincular', 'Unlink')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (moduloActivo === 'sesiones') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!nuevaSesion.tipo.trim() || nuevaSesion.asignados.length === 0) return
            await guardarCambios((actuales) => ({
              ...actuales,
              sesiones: edicionSesionId
                ? actuales.sesiones.map((sesion) => (
                    sesion.id === edicionSesionId
                      ? {
                          ...sesion,
                          ...nuevaSesion,
                          tipo: nuevaSesion.tipo.trim(),
                          descripcion: nuevaSesion.descripcion.trim(),
                          asignadoNombres: resolverNombresAsignados(nuevaSesion.asignados),
                        }
                      : sesion
                  ))
                : [
                    {
                      ...nuevaSesion,
                      tipo: nuevaSesion.tipo.trim(),
                      descripcion: nuevaSesion.descripcion.trim(),
                      asignadoNombres: resolverNombresAsignados(nuevaSesion.asignados),
                    },
                    ...actuales.sesiones,
                  ],
            }))
            resetSesion()
          }}
          className="space-y-4"
        >
          <div>
            <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{t('Asignación múltiple', 'Multi assignment')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionSesionId ? t('Editar sesión', 'Edit session') : t('Crear sesión', 'Create session')}</h3>
          </div>
          <Campo label="Fecha" type="date" value={nuevaSesion.fecha} onChange={(value) => setNuevaSesion({ ...nuevaSesion, fecha: value })} />
          <Campo label={t('Tipo de sesión', 'Session type')} value={nuevaSesion.tipo} onChange={(value) => setNuevaSesion({ ...nuevaSesion, tipo: value })} />
          <div>
            <Etiqueta>{t('Descripción', 'Description')}</Etiqueta>
            <textarea
              value={nuevaSesion.descripcion}
              onChange={(e) => setNuevaSesion({ ...nuevaSesion, descripcion: e.target.value })}
              className={`mt-2 min-h-24 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro
                  ? 'border-white/10 bg-slate-950/70 text-white'
                  : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
              }`}
            />
          </div>
          <div>
            <Etiqueta>{t('Estado', 'Status')}</Etiqueta>
            <select
              value={nuevaSesion.estado}
              onChange={(e) => setNuevaSesion({ ...nuevaSesion, estado: e.target.value })}
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro
                  ? 'border-white/10 bg-slate-950/70 text-white'
                  : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
              }`}
            >
              <option value="pendiente">{t('Pendiente', 'Pending')}</option>
              <option value="finalizada">{t('Finalizada', 'Completed')}</option>
            </select>
          </div>
          <SelectorDeportistas
            deportistas={deportistasSelectorFiltrados}
            seleccionados={nuevaSesion.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaSesion.asignados, setNuevaSesion, deportistaId)}
            busqueda={busquedaSelector}
            onBusquedaChange={setBusquedaSelector}
            onSeleccionarTodos={() => seleccionarTodosVisibles(setNuevaSesion)}
            onDeseleccionarTodos={() => deseleccionarTodosVisibles(setNuevaSesion)}
          />
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionSesionId ? t('Actualizar sesión', 'Update session') : t('Guardar sesión', 'Save session')}
            </button>
            {edicionSesionId && (
              <button
                type="button"
                onClick={resetSesion}
                className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                  esOscuro
                    ? 'border-white/15 text-slate-200 hover:bg-white/5'
                    : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'
                }`}
              >
                {t('Cancelar', 'Cancel')}
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          seleccionados={sesionesSeleccionadas}
          onToggleSeleccion={(id) => toggleSeleccionLista(setSesionesSeleccionadas, id)}
          onSeleccionarTodos={() => seleccionarIdsVisibles(setSesionesSeleccionadas, idsSesionesVisibles)}
          onDeseleccionarTodos={() => deseleccionarIdsVisibles(setSesionesSeleccionadas, idsSesionesVisibles)}
          accionMasiva={<button type="button" disabled={!sesionesSeleccionadas.length} onClick={eliminarSesionesSeleccionadas} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${sesionesSeleccionadas.length ? (esOscuro ? 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22' : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110') : (esOscuro ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}>{t('Eliminar seleccionadas', 'Delete selected')}</button>}
          titulo={t('Sesiones creadas', 'Created sessions')}
          vacio={t('No hay sesiones creadas todavía.', 'There are no created sessions yet.')}
          items={sesionesFiltradas}
          renderItem={(sesion) => (
            <div className="flex w-full flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{sesion.tipo}</h4>
                <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{sesion.descripcion || t('Sin descripci?n adicional.', 'No additional description.')}</p>
                <p className={`mt-2 text-sm font-medium ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{(sesion.asignadoNombres || []).join(', ')}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${esOscuro ? 'bg-cyan-500/15 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'}`}>{sesion.estado}</span>
                <p className={`mt-3 text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{sesion.fecha}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEdicionSesionId(sesion.id)
                      setNuevaSesion({
                        fecha: sesion.fecha || '2026-05-10',
                        tipo: sesion.tipo || '',
                        descripcion: sesion.descripcion || '',
                        estado: sesion.estado || 'pendiente',
                        asignados: sesion.asignados || [],
                      })
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      esOscuro
                        ? 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10'
                        : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_20px_rgba(34,211,238,0.14)] hover:bg-cyan-50'
                    }`}
                  >
                    {t('Editar', 'Edit')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await guardarCambios((actuales) => ({
                        ...actuales,
                        sesiones: actuales.sesiones.filter((item) => item.id !== sesion.id),
                      }))
                      if (edicionSesionId === sesion.id) resetSesion()
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      esOscuro
                        ? 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10'
                        : 'border-rose-300 bg-white text-rose-700 shadow-[0_10px_20px_rgba(251,113,133,0.14)] hover:bg-rose-50'
                    }`}
                  >
                    {t('Eliminar', 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
          />
        </div>
      </div>
    )
  }

  if (moduloActivo === 'metas') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!nuevaMeta.titulo.trim() || nuevaMeta.asignados.length === 0) return
            const asignaciones = construirAsignacionesMeta(
              nuevaMeta.asignados,
              nuevaMeta.objetivo,
              nuevaMeta.asignaciones || []
            )
            await guardarCambios((actuales) => ({
              ...actuales,
              metas: edicionMetaId
                ? actuales.metas.map((meta) => (
                    meta.id === edicionMetaId
                      ? {
                          ...meta,
                          ...nuevaMeta,
                          titulo: nuevaMeta.titulo.trim(),
                          descripcion: nuevaMeta.descripcion.trim(),
                          objetivo: Number(nuevaMeta.objetivo),
                          asignadoNombres: resolverNombresAsignados(nuevaMeta.asignados),
                          asignaciones,
                          estado: asignaciones.every((item) => item.estado === 'completada') ? 'completada' : 'en progreso',
                        }
                      : meta
                  ))
                : [
                    {
                      ...nuevaMeta,
                      titulo: nuevaMeta.titulo.trim(),
                      descripcion: nuevaMeta.descripcion.trim(),
                      objetivo: Number(nuevaMeta.objetivo),
                      asignadoNombres: resolverNombresAsignados(nuevaMeta.asignados),
                      asignaciones,
                      estado: asignaciones.every((item) => item.estado === 'completada') ? 'completada' : 'en progreso',
                    },
                    ...actuales.metas,
                  ],
            }))
            resetMeta()
          }}
          className="space-y-4"
        >
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Objetivos asignados', 'Assigned goals')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionMetaId ? t('Editar meta', 'Edit goal') : t('Crear meta', 'Create goal')}</h3>
          </div>
          <Campo label={t('Título', 'Title')} value={nuevaMeta.titulo} onChange={(value) => setNuevaMeta({ ...nuevaMeta, titulo: value })} />
          <div>
            <Etiqueta>{t('Descripción', 'Description')}</Etiqueta>
            <textarea
              value={nuevaMeta.descripcion}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, descripcion: e.target.value })}
              className={`mt-2 min-h-24 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                esOscuro
                  ? 'border-white/10 bg-slate-950/70 text-white'
                  : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
              }`}
            />
          </div>
          <Campo label={t('Objetivo numérico', 'Numeric goal')} type="number" value={nuevaMeta.objetivo} onChange={(value) => setNuevaMeta({ ...nuevaMeta, objetivo: value })} />
          <Campo label={t('Fecha límite', 'Deadline')} type="date" value={nuevaMeta.fechaLimite} onChange={(value) => setNuevaMeta({ ...nuevaMeta, fechaLimite: value })} />
          <SelectorDeportistas
            deportistas={deportistasSelectorFiltrados}
            seleccionados={nuevaMeta.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaMeta.asignados, setNuevaMeta, deportistaId)}
            busqueda={busquedaSelector}
            onBusquedaChange={setBusquedaSelector}
            onSeleccionarTodos={() => seleccionarTodosVisibles(setNuevaMeta)}
            onDeseleccionarTodos={() => deseleccionarTodosVisibles(setNuevaMeta)}
          />
          {nuevaMeta.asignados.length > 0 && (
            <div className={`space-y-3 rounded-2xl border p-4 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/60'
                : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] shadow-[0_10px_22px_rgba(148,163,184,0.12)]'
            }`}>
              <p className={`text-sm font-medium ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{t('Progreso individual por deportista', 'Individual progress by athlete')}</p>
              {nuevaMeta.asignados.map((deportistaId) => {
                const asignacion = (nuevaMeta.asignaciones || []).find((item) => item.deportistaId === deportistaId)
                const deportista = opcionesDeportistas.find((item) => item.id === deportistaId)
                return (
                  <div
                    key={deportistaId}
                    className={`grid gap-3 rounded-xl border p-3 md:grid-cols-3 ${
                      esOscuro
                        ? 'border-white/8 bg-white/5'
                        : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] shadow-[0_10px_22px_rgba(148,163,184,0.12)]'
                    }`}
                  >
                    <div className="md:col-span-3">
                      <p className="font-medium">{deportista?.nombre || asignacion?.nombre}</p>
                    </div>
                    <Campo
                      label="Progreso"
                      type="number"
                      value={asignacion ? asignacion.progreso : 0}
                      onChange={(value) =>
                        setNuevaMeta((previo) => ({
                          ...previo,
                          asignaciones: construirAsignacionesMeta(previo.asignados, previo.objetivo, previo.asignaciones).map((item) =>
                            item.deportistaId === deportistaId
                              ? {
                                  ...item,
                                  progreso: Number(value) || 0,
                                  estado: (Number(value) || 0) >= item.objetivo ? 'completada' : 'en progreso',
                                }
                              : item
                          ),
                        }))
                      }
                    />
                    <Campo
                      label={t('Objetivo', 'Goal')}
                      type="number"
                      value={asignacion ? asignacion.objetivo : nuevaMeta.objetivo}
                      onChange={(value) =>
                        setNuevaMeta((previo) => ({
                          ...previo,
                          asignaciones: construirAsignacionesMeta(previo.asignados, previo.objetivo, previo.asignaciones).map((item) =>
                            item.deportistaId === deportistaId
                              ? {
                                  ...item,
                                  objetivo: Number(value) || 0,
                                  estado: item.progreso >= (Number(value) || 0) && (Number(value) || 0) > 0 ? 'completada' : 'en progreso',
                                }
                              : item
                          ),
                        }))
                      }
                    />
                    <div>
                      <Etiqueta>{t('Estado', 'Status')}</Etiqueta>
                      <select
                        value={asignacion ? asignacion.estado : 'en progreso'}
                        onChange={(e) =>
                          setNuevaMeta((previo) => ({
                            ...previo,
                            asignaciones: construirAsignacionesMeta(previo.asignados, previo.objetivo, previo.asignaciones).map((item) =>
                              item.deportistaId === deportistaId
                                ? { ...item, estado: e.target.value }
                                : item
                            ),
                          }))
                        }
                        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
                          esOscuro
                            ? 'border-white/10 bg-slate-950/70 text-white'
                            : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
                        }`}
                      >
                        <option value="en progreso">{t('En progreso', 'In progress')}</option>
                        <option value="completada">{t('Completada', 'Completed')}</option>
                        <option value="pausada">{t('Pausada', 'Paused')}</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionMetaId ? t('Actualizar meta', 'Update goal') : t('Guardar meta', 'Save goal')}
            </button>
            {edicionMetaId && (
              <button
                type="button"
                onClick={resetMeta}
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                {t('Cancelar', 'Cancel')}
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          seleccionados={metasSeleccionadas}
          onToggleSeleccion={(id) => toggleSeleccionLista(setMetasSeleccionadas, id)}
          onSeleccionarTodos={() => seleccionarIdsVisibles(setMetasSeleccionadas, idsMetasVisibles)}
          onDeseleccionarTodos={() => deseleccionarIdsVisibles(setMetasSeleccionadas, idsMetasVisibles)}
          accionMasiva={<button type="button" disabled={!metasSeleccionadas.length} onClick={eliminarMetasSeleccionadas} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${metasSeleccionadas.length ? (esOscuro ? 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22' : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110') : (esOscuro ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}>{t('Eliminar seleccionadas', 'Delete selected')}</button>}
          titulo="Metas creadas"
          vacio={t('No hay metas asignadas todavía.', 'There are no assigned goals yet.')}
          items={metasFiltradas}
          renderItem={(meta) => (
            <div className="w-full">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold">{meta.titulo}</h4>
                  <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{meta.descripcion || t('Sin descripci?n adicional.', 'No additional description.')}</p>
                  <p className={`mt-2 text-sm font-medium ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{(meta.asignadoNombres || []).join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{meta.estado}</p>
                  <p className={`mt-1 text-xs uppercase tracking-[0.2em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{meta.fechaLimite || t('Sin fecha limite', 'No deadline')}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(meta.asignaciones || []).map((asignacion) => (
                  <div
                    key={asignacion.deportistaId}
                    className={`rounded-xl border p-3 ${
                      esOscuro
                        ? 'border-white/8 bg-slate-950/45'
                        : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] shadow-[0_10px_22px_rgba(148,163,184,0.12)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{asignacion.nombre}</p>
                      <p className={`text-xs font-semibold ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{asignacion.progreso} / {asignacion.objetivo}</p>
                    </div>
                    <div className={`mt-2 h-2 rounded-full ${esOscuro ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div
                        className="h-2 rounded-full bg-cyan-400"
                        style={{ width: `${Math.min((asignacion.progreso / (asignacion.objetivo || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEdicionMetaId(meta.id)
                    setNuevaMeta({
                      titulo: meta.titulo || '',
                      descripcion: meta.descripcion || '',
                      objetivo: meta.objetivo || 1,
                      progreso: 0,
                      estado: meta.estado || 'en progreso',
                      fechaLimite: meta.fechaLimite || '',
                      asignados: meta.asignados || [],
                      asignaciones: (meta.asignaciones || []).map((item) => ({
                        deportistaId: item.deportistaId,
                        nombre: item.nombre,
                        progreso: item.progreso,
                        objetivo: item.objetivo,
                        estado: item.estado,
                      })),
                    })
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  esOscuro
                    ? 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10'
                    : 'border-cyan-300 bg-cyan-600 text-white shadow-[0_10px_22px_rgba(8,145,178,0.22)] hover:brightness-110'
                }`}
                >
                  {t('Editar', 'Edit')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await guardarCambios((actuales) => ({
                      ...actuales,
                      metas: actuales.metas.filter((item) => item.id !== meta.id),
                    }))
                    if (edicionMetaId === meta.id) resetMeta()
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  esOscuro
                    ? 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10'
                    : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110'
                }`}
                >
                  {t('Eliminar', 'Delete')}
                </button>
              </div>
            </div>
          )}
          />
        </div>
      </div>
    )
  }

  if (moduloActivo === 'competencias') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!nuevaCompetencia.nombre.trim() || nuevaCompetencia.asignados.length === 0) return
            await guardarCambios((actuales) => ({
              ...actuales,
              competencias: edicionCompetenciaId
                ? actuales.competencias.map((competencia) => (
                    competencia.id === edicionCompetenciaId
                      ? {
                          ...competencia,
                          ...nuevaCompetencia,
                          nombre: nuevaCompetencia.nombre.trim(),
                          inscritos: nuevaCompetencia.asignados.length,
                          asignadoNombres: resolverNombresAsignados(nuevaCompetencia.asignados),
                        }
                      : competencia
                  ))
                : [
                    {
                      ...nuevaCompetencia,
                      nombre: nuevaCompetencia.nombre.trim(),
                      inscritos: nuevaCompetencia.asignados.length,
                      asignadoNombres: resolverNombresAsignados(nuevaCompetencia.asignados),
                    },
                    ...actuales.competencias,
                  ],
            }))
            resetCompetencia()
          }}
          className="space-y-4"
        >
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Eventos compartidos', 'Shared events')}</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionCompetenciaId ? t('Editar competencia', 'Edit competition') : t('Crear competencia', 'Create competition')}</h3>
          </div>
          <Campo label="Nombre" value={nuevaCompetencia.nombre} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, nombre: value })} />
          <Campo label="Fecha" type="date" value={nuevaCompetencia.fecha} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, fecha: value })} />
          <Campo label={t('Ubicación', 'Location')} value={nuevaCompetencia.ubicacion} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, ubicacion: value })} />
          <Campo label={t('Estado', 'Status')} value={nuevaCompetencia.estado} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, estado: value })} />
          <Campo label={t('Resultado esperado o nota', 'Expected result or note')} value={nuevaCompetencia.resultado} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, resultado: value })} />
          <SelectorDeportistas
            deportistas={deportistasSelectorFiltrados}
            seleccionados={nuevaCompetencia.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaCompetencia.asignados, setNuevaCompetencia, deportistaId)}
            busqueda={busquedaSelector}
            onBusquedaChange={setBusquedaSelector}
            onSeleccionarTodos={() => seleccionarTodosVisibles(setNuevaCompetencia)}
            onDeseleccionarTodos={() => deseleccionarTodosVisibles(setNuevaCompetencia)}
          />
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionCompetenciaId ? t('Actualizar competencia', 'Update competition') : t('Guardar competencia', 'Save competition')}
            </button>
            {edicionCompetenciaId && (
              <button
                type="button"
                onClick={resetCompetencia}
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                {t('Cancelar', 'Cancel')}
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          seleccionados={competenciasSeleccionadas}
          onToggleSeleccion={(id) => toggleSeleccionLista(setCompetenciasSeleccionadas, id)}
          onSeleccionarTodos={() => seleccionarIdsVisibles(setCompetenciasSeleccionadas, idsCompetenciasVisibles)}
          onDeseleccionarTodos={() => deseleccionarIdsVisibles(setCompetenciasSeleccionadas, idsCompetenciasVisibles)}
          accionMasiva={<button type="button" disabled={!competenciasSeleccionadas.length} onClick={eliminarCompetenciasSeleccionadas} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${competenciasSeleccionadas.length ? (esOscuro ? 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22' : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110') : (esOscuro ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}>{t('Eliminar seleccionadas', 'Delete selected')}</button>}
          titulo={t('Competencias creadas', 'Created competitions')}
          vacio={t('No hay competencias creadas todavía.', 'There are no created competitions yet.')}
          items={competenciasFiltradas}
          renderItem={(competencia) => (
            <div className="flex w-full flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{competencia.nombre}</h4>
                <p className={`mt-1 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{competencia.ubicacion || t('Ubicación por definir', 'Location to be defined')}</p>
                <p className={`mt-2 text-sm font-medium ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{(competencia.asignadoNombres || []).join(', ')}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${esOscuro ? 'bg-cyan-500/15 text-cyan-200' : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.14)]'}`}>{competencia.estado || competencia.resultado || t('Asignada', 'Assigned')}</span>
                <p className={`mt-3 text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{competencia.fecha}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEdicionCompetenciaId(competencia.id)
                      setNuevaCompetencia({
                        nombre: competencia.nombre || '',
                        fecha: competencia.fecha || '2026-05-18',
                        estado: competencia.estado || 'Programada',
                        ubicacion: competencia.ubicacion || '',
                        resultado: competencia.resultado || '',
                        inscritos: competencia.inscritos || 0,
                        asignados: competencia.asignados || [],
                      })
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      esOscuro
                        ? 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10'
                        : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_20px_rgba(34,211,238,0.14)] hover:bg-cyan-50'
                    }`}
                  >
                    {t('Editar', 'Edit')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await guardarCambios((actuales) => ({
                        ...actuales,
                        competencias: actuales.competencias.filter((item) => item.id !== competencia.id),
                      }))
                      if (edicionCompetenciaId === competencia.id) resetCompetencia()
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      esOscuro
                        ? 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10'
                        : 'border-rose-300 bg-white text-rose-700 shadow-[0_10px_20px_rgba(251,113,133,0.14)] hover:bg-rose-50'
                    }`}
                  >
                    {t('Eliminar', 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!nuevaObservacion.deportistaId || !nuevaObservacion.nota.trim()) return
          await guardarCambios((actuales) => ({
            ...actuales,
            observaciones: edicionObservacionId
              ? actuales.observaciones.map((observacion) => (
                  observacion.id === edicionObservacionId
                    ? {
                        ...observacion,
                        deportistaId: nuevaObservacion.deportistaId,
                        deportista: nuevaObservacion.deportista,
                        nota: nuevaObservacion.nota.trim(),
                        prioridad: nuevaObservacion.prioridad,
                      }
                    : observacion
                ))
              : [
                  {
                    deportistaId: nuevaObservacion.deportistaId,
                    deportista: nuevaObservacion.deportista,
                    nota: nuevaObservacion.nota.trim(),
                    prioridad: nuevaObservacion.prioridad,
                  },
                  ...actuales.observaciones,
                ],
          }))
          resetObservacion()
        }}
        className="space-y-4"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Seguimiento individual', 'Individual tracking')}</p>
          <h3 className="mt-2 text-2xl font-semibold">{edicionObservacionId ? t('Editar observacion', 'Edit observation') : t('Registrar observacion', 'Register observation')}</h3>
        </div>
        <div>
          <Etiqueta>{t('Deportista', 'Athlete')}</Etiqueta>
          <select
            value={nuevaObservacion.deportistaId}
            onChange={(e) => {
              const deportista = opcionesDeportistas.find((item) => item.id === e.target.value)
              setNuevaObservacion({
                ...nuevaObservacion,
                deportistaId: e.target.value,
                deportista: deportista?.nombre || '',
              })
            }}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/70 text-white'
                : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
            }`}
          >
            <option value="">{t('Seleccione un deportista', 'Select an athlete')}</option>
            {opcionesDeportistas.map((deportista) => (
              <option key={deportista.id} value={deportista.id}>{deportista.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <Etiqueta>{t('Nota técnica', 'Technical note')}</Etiqueta>
          <textarea
            value={nuevaObservacion.nota}
            onChange={(e) => setNuevaObservacion({ ...nuevaObservacion, nota: e.target.value })}
            className={`mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/70 text-white'
                : 'border-slate-300 bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
            }`}
          />
        </div>
        <Campo label={t('Prioridad', 'Priority')} value={nuevaObservacion.prioridad} onChange={(value) => setNuevaObservacion({ ...nuevaObservacion, prioridad: value })} />
        <div className="flex gap-3">
          <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            {edicionObservacionId ? t('Actualizar observacion', 'Update observation') : t('Guardar observacion', 'Save observation')}
          </button>
          {edicionObservacionId && (
            <button
              type="button"
              onClick={resetObservacion}
              className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
            >
              {t('Cancelar', 'Cancel')}
            </button>
          )}
        </div>
      </form>

      <div>
        {FiltrosEntrenador}
        <ListaEntrenadorAsignaciones
        seleccionados={observacionesSeleccionadas}
        onToggleSeleccion={(id) => toggleSeleccionLista(setObservacionesSeleccionadas, id)}
        onSeleccionarTodos={() => seleccionarIdsVisibles(setObservacionesSeleccionadas, idsObservacionesVisibles)}
        onDeseleccionarTodos={() => deseleccionarIdsVisibles(setObservacionesSeleccionadas, idsObservacionesVisibles)}
        accionMasiva={<button type="button" disabled={!observacionesSeleccionadas.length} onClick={eliminarObservacionesSeleccionadas} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${observacionesSeleccionadas.length ? (esOscuro ? 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/22' : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110') : (esOscuro ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400')}`}>{t('Eliminar seleccionadas', 'Delete selected')}</button>}
        titulo={t('Observaciones registradas', 'Saved observations')}
        vacio={t('No hay observaciones registradas todavía.', 'There are no saved observations yet.')}
        items={observacionesFiltradas}
        renderItem={(observacion) => (
          <div className="w-full">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-semibold">{observacion.deportista}</h4>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${esOscuro ? 'bg-rose-400/15 text-rose-200' : 'border border-rose-300 bg-white text-rose-700 shadow-[0_8px_18px_rgba(251,113,133,0.14)]'}`}>{observacion.prioridad}</span>
            </div>
            <p className={`mt-3 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{observacion.nota}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEdicionObservacionId(observacion.id)
                  setNuevaObservacion({
                    deportistaId: observacion.deportistaId || '',
                    deportista: observacion.deportista || '',
                    nota: observacion.nota || '',
                    prioridad: observacion.prioridad || 'media',
                  })
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  esOscuro
                    ? 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10'
                    : 'border-cyan-300 bg-cyan-600 text-white shadow-[0_10px_22px_rgba(8,145,178,0.22)] hover:brightness-110'
                }`}
              >
                {t('Editar', 'Edit')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await guardarCambios((actuales) => ({
                    ...actuales,
                    observaciones: actuales.observaciones.filter((item) => item.id !== observacion.id),
                  }))
                  if (edicionObservacionId === observacion.id) resetObservacion()
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  esOscuro
                    ? 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10'
                    : 'border-rose-300 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.22)] hover:brightness-110'
                }`}
              >
                {t('Eliminar', 'Delete')}
              </button>
            </div>
          </div>
        )}
        />
      </div>
    </div>
  )
}

function ResumenCard({ titulo, valor, detalle }) {
  const { esOscuro } = useUI()

  return (
    <article className={`rounded-[1.75rem] border p-5 shadow-xl backdrop-blur sm:rounded-3xl sm:p-6 ${
      esOscuro
        ? 'border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(15,23,42,0.55))] shadow-slate-950/20'
        : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,249,255,0.92))] shadow-cyan-950/8'
    }`}>
      <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{titulo}</p>
      <p className={`mt-4 text-3xl font-semibold sm:text-4xl ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
      <p className={`mt-3 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{detalle}</p>
    </article>
  )
}

function MiniDatoAdmin({ titulo, valor, amplio = false }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-2xl border px-4 py-3 ${
      esOscuro
        ? 'border-white/8 bg-slate-950/45'
        : 'border-slate-200 bg-slate-50'
    } ${amplio ? 'min-h-[6.5rem]' : ''}`}>
      <p className={`text-[11px] uppercase tracking-[0.22em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{titulo}</p>
      <p className={`mt-3 text-2xl font-bold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
    </div>
  )
}

function Panel({ children, className = '' }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-[24px] border p-4 shadow-2xl backdrop-blur sm:rounded-[28px] sm:p-6 ${esOscuro ? 'border-white/8 bg-slate-900/65 shadow-slate-950/30' : 'border-slate-200/80 bg-white/80 shadow-cyan-950/10'} ${className}`}>
      {children}
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text' }) {
  const { esOscuro } = useUI()

  return (
    <div>
      <Etiqueta>{label}</Etiqueta>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
          esOscuro
            ? 'border-white/10 bg-slate-950/70 text-white'
            : 'border-slate-300 bg-white/85 text-slate-900'
        }`}
      />
    </div>
  )
}

function Etiqueta({ children }) {
  const { esOscuro } = useUI()

  return <label className={`text-sm font-medium ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{children}</label>
}

function SelectorFotoPerfil({ nombreArchivo, fotoActual, onSeleccionar, ayuda = '' }) {
  const { esOscuro, t } = useUI()
  const inputRef = useRef(null)

  const textoEstado = nombreArchivo
    ? nombreArchivo
    : fotoActual
      ? t('Imagen lista para guardar', 'Image ready to save')
      : t('Aún no has seleccionado una imagen.', 'You have not selected an image yet.')

  return (
    <div>
      <Etiqueta>{t('Foto de perfil', 'Profile picture')}</Etiqueta>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onSeleccionar(e.target.files?.[0])}
        className="hidden"
      />
      <div className={`mt-2 flex flex-col gap-3 rounded-3xl border px-4 py-4 ${
        esOscuro
          ? 'border-white/10 bg-slate-950/55'
          : 'border-cyan-200/90 bg-white/92 shadow-[0_14px_30px_rgba(14,116,144,0.1)]'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            + {fotoActual ? t('Cambiar imagen', 'Change image') : t('Agregar imagen', 'Add image')}
          </button>
          <div className={`min-w-[12rem] flex-1 rounded-2xl border px-4 py-3 text-sm ${
            esOscuro
              ? 'border-white/10 bg-slate-900/80 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            {textoEstado}
          </div>
        </div>
        {ayuda ? (
          <p className={`text-xs ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            {ayuda}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function TarjetaPerfilGuardado({ etiqueta, titulo, descripcion, campos, accionTexto, onAccion, foto }) {
  const { esOscuro, t } = useUI()

  return (
    <div className={`rounded-[28px] border p-5 shadow-2xl ${
      esOscuro
        ? 'border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-slate-900/80 to-slate-950/80 shadow-slate-950/20'
        : 'border-cyan-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,248,255,0.96))] shadow-cyan-950/10'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border ${
            esOscuro
              ? 'border-cyan-400/30 bg-slate-950/70'
              : 'border-cyan-300/70 bg-cyan-50'
          }`}>
            {foto ? (
              <img src={foto} alt={t('Foto de perfil', 'Profile picture')} className="h-full w-full object-cover" />
            ) : (
              <span className={`text-2xl font-semibold ${esOscuro ? 'text-cyan-200' : 'text-cyan-700'}`}>
                {String(titulo || 'V').trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className={`text-xs uppercase tracking-[0.3em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{etiqueta}</p>
            <h4 className={`mt-2 text-xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{titulo || t('Perfil actualizado', 'Updated profile')}</h4>
          </div>
        </div>
        <button
          type="button"
          onClick={onAccion}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            esOscuro
              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
              : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_24px_rgba(34,211,238,0.14)] hover:bg-cyan-50'
          }`}
        >
          {accionTexto}
        </button>
      </div>
      <p className={`mt-4 text-sm leading-6 ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{descripcion}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {campos.map((campo) => (
          <div
            key={campo.label}
            className={`rounded-2xl border px-4 py-3 ${
              esOscuro
                ? 'border-white/8 bg-slate-950/50'
                : 'border-slate-200 bg-white/90'
            }`}
          >
            <p className={`text-[11px] uppercase tracking-[0.24em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{campo.label}</p>
            <p className={`mt-2 text-sm font-medium ${esOscuro ? 'text-slate-100' : 'text-slate-900'}`}>{campo.value || t('Pendiente', 'Pending')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EstadoVacio({ mensaje }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-2xl border border-dashed p-6 text-sm ${
      esOscuro
        ? 'border-white/12 bg-white/4 text-slate-300'
        : 'border-slate-300 bg-slate-50/80 text-slate-600'
    }`}>
      {mensaje}
    </div>
  )
}

// Asigna un badge visual legible a cada logro para reforzar el reconocimiento del deportista.
function obtenerBadgeLogro(logro, t) {
  const nivel = limpiarTextoVisual(logro?.nivel || '').toLowerCase()
  const titulo = limpiarTextoVisual(logro?.titulo || '').toLowerCase()

  if (nivel.includes('diamante')) {
    return {
      nombre: t('Diamante', 'Diamond'),
      icono: '💎',
      fondo: 'bg-[linear-gradient(135deg,#60a5fa,#7c3aed)] text-white',
      borde: 'border-white/20',
      brillo: 'bg-[linear-gradient(90deg,#60a5fa,#8b5cf6)]',
      etiqueta: 'bg-violet-400/12 text-violet-200',
      descripcion: t('Rendimiento sobresaliente por encima del objetivo.', 'Outstanding performance above the target.'),
    }
  }

  if (nivel.includes('oro') || nivel.includes('plata')) {
    return {
      nombre: t('Oro', 'Gold'),
      icono: '🥇',
      fondo: 'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-slate-950',
      borde: 'border-amber-100/70',
      brillo: 'bg-[linear-gradient(90deg,#fbbf24,#f59e0b)]',
      etiqueta: 'bg-amber-400/12 text-amber-200',
      descripcion: t('Meta cumplida o superada con un gran rendimiento.', 'Goal achieved or exceeded with strong performance.'),
    }
  }

  if (nivel.includes('plata')) {
    return {
      nombre: t('Plata', 'Silver'),
      icono: '🥈',
      fondo: 'bg-[linear-gradient(135deg,#e2e8f0,#94a3b8)] text-slate-950',
      borde: 'border-slate-100/70',
      brillo: 'bg-[linear-gradient(90deg,#cbd5e1,#94a3b8)]',
      etiqueta: 'bg-slate-400/12 text-slate-200',
      descripcion: t('Objetivo completado con constancia.', 'Goal completed with consistency.'),
    }
  }

  if (titulo.includes('meta completada') || titulo.includes('completed goal')) {
    return {
      nombre: t('Meta cumplida', 'Goal achieved'),
      icono: '🏅',
      fondo: 'bg-[linear-gradient(135deg,#22d3ee,#2563eb)] text-white',
      borde: 'border-cyan-100/30',
      brillo: 'bg-[linear-gradient(90deg,#22d3ee,#2563eb)]',
      etiqueta: 'bg-cyan-400/12 text-cyan-200',
      descripcion: t('Reconocimiento por cerrar una meta asignada.', 'Recognition for completing an assigned goal.'),
    }
  }

  return {
    nombre: t('Reconocimiento', 'Recognition'),
    icono: '🏆',
    fondo: 'bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-white',
    borde: 'border-orange-100/30',
    brillo: 'bg-[linear-gradient(90deg,#f59e0b,#f97316)]',
    etiqueta: 'bg-orange-400/12 text-orange-200',
    descripcion: t('Logro destacado dentro de tu progreso deportivo.', 'Highlighted achievement within your sports progress.'),
  }
}

function ResumenAsignadoSimple({ titulo, vacio, items, render }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-2xl border p-3 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200/80 bg-white/70'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs uppercase tracking-[0.2em] ${esOscuro ? 'text-cyan-300' : 'text-cyan-700'}`}>{titulo}</p>
        <span className={`rounded-full border px-2 py-1 text-[11px] ${esOscuro ? 'border-white/10 bg-slate-950/50 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
          {items.length}
        </span>
      </div>
      <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className={`text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{vacio}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className={`rounded-xl border px-3 py-2 text-sm ${esOscuro ? 'border-white/8 bg-slate-950/45 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              {render(item)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function perfilDeportistaTieneContenido(perfil = {}) {
  return Boolean(
    perfil.foto?.trim?.() ||
    perfil.disciplina?.trim?.() ||
    perfil.categoria?.trim?.() ||
    perfil.equipo?.trim?.() ||
    perfil.objetivoPrincipal?.trim?.() ||
    perfil.bio?.trim?.()
  )
}

function perfilEntrenadorTieneContenido(perfil = {}) {
  return Boolean(
    perfil.foto?.trim?.() ||
    perfil.especialidad?.trim?.() ||
    perfil.categoria?.trim?.() ||
    perfil.equipo?.trim?.() ||
    perfil.metodologia?.trim?.()
  )
}

function SelectorDeportistas({
  deportistas,
  seleccionados,
  onToggle,
  busqueda,
  onBusquedaChange,
  onSeleccionarTodos,
  onDeseleccionarTodos,
}) {
  const { esOscuro, t } = useUI()
  const seleccionadosVisibles = deportistas.filter((deportista) => seleccionados.includes(deportista.id)).length

  return (
    <div>
      <Etiqueta>{t('Deportistas asignados', 'Assigned athletes')}</Etiqueta>
      <div className={`mt-3 space-y-3 rounded-2xl border p-4 ${esOscuro ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-white/80'}`}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={t('Buscar deportista por nombre, correo o disciplina.', 'Search athlete by name, email or discipline.')}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-400 ${
              esOscuro
                ? 'border-white/10 bg-slate-950/80 text-white'
                : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-[0_10px_24px_rgba(148,163,184,0.12)]'
            }`}
          />
          <button
            type="button"
            onClick={onSeleccionarTodos}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              esOscuro
                ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18'
                : 'border-cyan-300 bg-white text-cyan-800 shadow-[0_10px_24px_rgba(34,211,238,0.14)] hover:bg-cyan-50'
            }`}
          >
            {t('Seleccionar visibles', 'Select visible')}
          </button>
          <button
            type="button"
            onClick={onDeseleccionarTodos}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              esOscuro
                ? 'border-white/15 text-slate-200 hover:bg-white/5'
                : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'
            }`}
          >
            {t('Deseleccionar visibles', 'Deselect visible')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`rounded-full px-3 py-1 ${esOscuro ? 'bg-white/6 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            {t('Visibles', 'Visible')}: {deportistas.length}
          </span>
          <span className={`rounded-full px-3 py-1 ${
            esOscuro
              ? 'bg-cyan-400/10 text-cyan-100'
              : 'bg-cyan-100 text-cyan-800'
          }`}>
            {t('Seleccionados en esta vista', 'Selected in this view')}: {seleccionadosVisibles}
          </span>
          <span className={`rounded-full px-3 py-1 ${esOscuro ? 'bg-white/6 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            {t('Selección total', 'Total selected')}: {seleccionados.length}
          </span>
        </div>

        {deportistas.length === 0 ? (
          <EstadoVacio mensaje={t('Primero vincule deportistas reales para poder asignarles sesiones, metas o competencias.', 'Link real athletes first so you can assign sessions, goals, or competitions.')} />
        ) : (
          deportistas.map((deportista) => (
            <label
              key={deportista.id}
              className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition ${
                seleccionados.includes(deportista.id)
                  ? esOscuro
                    ? 'border-cyan-400/35 bg-cyan-400/10'
                    : 'border-cyan-300 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(186,230,253,0.65))] shadow-[0_12px_24px_rgba(34,211,238,0.18)]'
                  : (esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200 bg-slate-50/80')
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(deportista.id)}
                  onChange={() => onToggle(deportista.id)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{deportista.nombre}</p>
                  <p className={`text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{deportista.descripcion}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  seleccionados.includes(deportista.id)
                    ? esOscuro
                      ? 'bg-cyan-400/20 text-cyan-100'
                      : 'border border-cyan-300 bg-white text-cyan-800 shadow-[0_8px_18px_rgba(34,211,238,0.16)]'
                    : (esOscuro ? 'bg-white/8 text-slate-300' : 'border border-slate-200 bg-white text-slate-600')
                }`}
              >
                {seleccionados.includes(deportista.id) ? t('Incluido', 'Included') : t('Disponible', 'Available')}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function ListadoAsignaciones({ titulo, vacio, items, renderItem }) {
  const { esOscuro, t } = useUI()

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Vista del deportista', 'Athlete view')}</p>
      <h3 className="mt-2 text-2xl font-semibold">{titulo}</h3>
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <EstadoVacio mensaje={vacio} />
        ) : (
          items.map((item) => (
            <div key={item.id} className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-4 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200/80 bg-white/78'}`}>
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ListaEntrenadorAsignaciones({
  titulo,
  vacio,
  items,
  renderItem,
  seleccionados = [],
  onToggleSeleccion,
  onSeleccionarTodos,
  onDeseleccionarTodos,
  accionMasiva = null,
}) {
  const { esOscuro, t } = useUI()
  const seleccionadosVisibles = items.filter((item) => seleccionados.includes(item.id)).length

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Vista del entrenador', 'Coach view')}</p>
      <h3 className="mt-2 text-2xl font-semibold">{titulo}</h3>
      {onToggleSeleccion && items.length > 0 && (
        <div className={`mt-6 grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_auto_auto_1fr] ${
          esOscuro
            ? 'border-white/8 bg-white/5'
            : 'border-slate-200 bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.08)]'
        }`}>
          <button type="button" onClick={onSeleccionarTodos} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${esOscuro ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18' : 'border-cyan-300 bg-cyan-50 text-cyan-800 shadow-[0_10px_24px_rgba(34,211,238,0.14)] hover:bg-cyan-100'}`}>
            {t('Seleccionar visibles', 'Select visible')}
          </button>
          <button type="button" onClick={onDeseleccionarTodos} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${esOscuro ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-300 bg-white text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50'}`}>
            {t('Deseleccionar visibles', 'Deselect visible')}
          </button>
          {accionMasiva}
          <div className={`rounded-2xl border px-4 py-3 text-sm ${esOscuro ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            {t('Seleccionadas en esta vista', 'Selected in this view')}: <span className="font-semibold">{seleccionadosVisibles}</span> · {t('Total', 'Total')}: <span className="font-semibold">{seleccionados.length}</span>
          </div>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <EstadoVacio mensaje={vacio} />
        ) : (
          items.map((item) => (
            <div key={item.id} className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-4 ${onToggleSeleccion && seleccionados.includes(item.id) ? (esOscuro ? 'border-cyan-400/35 bg-cyan-400/10' : 'border-cyan-300 bg-cyan-50/80') : (esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200/80 bg-white/78')}`}>
              {onToggleSeleccion ? (
                <div className="flex w-full items-start gap-3">
                  <input type="checkbox" checked={seleccionados.includes(item.id)} onChange={() => onToggleSeleccion(item.id)} className="mt-1" />
                  <div className="flex-1">{renderItem(item)}</div>
                </div>
              ) : renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Tablero



import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  construirResumenCoach,
  construirSerieDeportista,
  crearPanelVacio,
  normalizarPanel,
  obtenerOpcionesDeportistas,
  obtenerResumenDeportista,
  obtenerResumenEntrenador,
} from '../utils/plataformaDatos'
import panelServicio from '../servicios/panelServicio'

// Paleta visual reutilizada por los graficos del tablero.
const coloresGrafico = ['#22d3ee', '#f59e0b', '#38bdf8', '#fb7185']

// Genera las pestañas principales en el idioma activo para no duplicar el dashboard.
const crearModulosDeportista = (t) => [
  { id: 'perfil', titulo: t('Perfil deportivo', 'Sports profile'), descripcion: t('Actualiza tus datos personales y disciplina.', 'Update your personal details and discipline.') },
  { id: 'estadisticas', titulo: t('Estadisticas', 'Statistics'), descripcion: t('Registra tu rendimiento individual.', 'Track your individual performance.') },
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

const modulosDeportista = [
  { id: 'perfil', titulo: 'Perfil deportivo', descripcion: 'Actualiza tus datos personales y disciplina.' },
  { id: 'estadisticas', titulo: 'Estadísticas', descripcion: 'Registra tu rendimiento individual.' },
  { id: 'sesiones', titulo: 'Sesiones asignadas', descripcion: 'Consulta entrenamientos indicados por tus entrenadores.' },
  { id: 'metas', titulo: 'Metas asignadas', descripcion: 'Revisa objetivos activos y su progreso.' },
  { id: 'competencias', titulo: 'Competencias asignadas', descripcion: 'Mira los eventos que te corresponden.' },
  { id: 'logros', titulo: 'Logros', descripcion: 'Reconocimientos y metas completadas.' },
]

const modulosEntrenador = [
  { id: 'perfil', titulo: 'Perfil del entrenador', descripcion: 'Gestiona tu enfoque y categoría.' },
  { id: 'deportistas', titulo: 'Deportistas vinculados', descripcion: 'Agrega cuentas reales de deportistas por correo.' },
  { id: 'sesiones', titulo: 'Sesiones', descripcion: 'Asigna entrenamientos a uno o varios deportistas.' },
  { id: 'metas', titulo: 'Metas', descripcion: 'Crea objetivos específicos para tus deportistas.' },
  { id: 'competencias', titulo: 'Competencias', descripcion: 'Asigna eventos o torneos a tu grupo.' },
  { id: 'seguimiento', titulo: 'Seguimiento', descripcion: 'Registra observaciones individuales.' },
]

// Pantalla principal del sistema. Cambia dinamicamente segun el rol autenticado.
function Tablero() {
  const { usuario, cerrarSesion } = useAuth()
  const { alternarIdioma, alternarTema, esOscuro, idioma, t, tema } = useUI()
  const navegar = useNavigate()
  const [datos, setDatos] = useState(() => crearPanelVacio(usuario))
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [moduloActivo, setModuloActivo] = useState(() =>
    usuario?.rol === 'entrenador' ? 'deportistas' : 'perfil'
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
    } catch (error) {
      setDatos(referenciaActual)
      setErrorApi(error.response?.data?.mensaje || 'No se pudieron guardar los cambios.')
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
      const mensaje = error.response?.data?.mensaje || 'No se pudo vincular el deportista.'
      setErrorApi(mensaje)
      return { ok: false, mensaje }
    } finally {
      setGuardando(false)
    }
  }

  // Prepara resumenes y series para no recalcular toda la vista en cada render.
  const contenido = useMemo(() => {
    if (!usuario || !datos) return null

    if (usuario.rol === 'entrenador') {
      const distribucion = construirPorcentajeMetasEntrenador(datos)
      return {
        resumen: obtenerResumenEntrenador(datos),
        seriePrincipal: construirResumenCoach(datos),
        serieSecundaria: distribucion.series,
        graficoPrincipal: {
          etiqueta: 'Vista del grupo',
          titulo: 'Avance de metas por deportista vinculado',
          valorKey: 'valor',
          detalleKey: 'detalle',
          nombreValor: 'Progreso',
          sufijoValor: '%',
          limitePorcentaje: true,
        },
        graficoSecundario: {
          etiqueta: 'Estado general',
          titulo: `${distribucion.porcentaje}% de deportistas al día con sus metas`,
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
        titulo: datos.metas.length > 0 ? t('Porcentaje de avance por meta', 'Goal progress percentage') : t('Evolucion de estadisticas', 'Statistics evolution'),
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
  }, [datos, t, usuario])

  if (!usuario || cargando || !datos || !contenido) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${esOscuro ? 'text-slate-200' : 'text-slate-700'}`}>
        <IndicadorCarga texto={t('Cargando tablero...', 'Loading dashboard...')} />
      </div>
    )
  }

  const esEntrenador = usuario.rol === 'entrenador'
  const rolTexto = esEntrenador ? t('entrenador', 'coach') : t('deportista', 'athlete')

  return (
    <div className={`min-h-screen ${esOscuro ? 'text-slate-100' : 'text-slate-900'}`}>
      <nav className={`border-b backdrop-blur-xl ${
        esOscuro
          ? 'border-white/10 bg-slate-950/60'
          : 'border-slate-200/80 bg-white/72'
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Vyrox</p>
            <h1 className="text-2xl font-semibold">{t('Panel de', 'Dashboard for')} {rolTexto}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
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
            <div className="text-right">
              <p className={`text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{t('Hola,', 'Hello,')} <span className={`font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{usuario.nombre}</span></p>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300">{usuario.rol}</p>
            </div>
            <BotonSecundario
              onClick={manejarCerrarSesion}
              className="border-rose-400/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18"
            >
              {t('Cerrar sesion', 'Sign out')}
            </BotonSecundario>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {(errorApi || guardando) && (
          <section className="mb-6">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              errorApi
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
            }`}>
              {errorApi || 'Guardando cambios en la base de datos...'}
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {esEntrenador ? (
            <>
              <ResumenCard titulo="Deportistas" valor={contenido.resumen.deportistas} detalle="cuentas vinculadas" />
              <ResumenCard titulo="Sesiones" valor={contenido.resumen.sesiones} detalle={`${contenido.resumen.sesionesPendientes} pendientes`} />
              <ResumenCard titulo="Alertas" valor={contenido.resumen.alertas} detalle="observaciones prioritarias" />
              <ResumenCard titulo="Competencias" valor={contenido.resumen.competencias} detalle={`${contenido.resumen.promedioProgreso}% progreso promedio`} />
            </>
          ) : (
            <>
              <ResumenCard titulo="Estadisticas" valor={contenido.resumen.estadisticas} detalle="registros personales" />
              <ResumenCard titulo="Sesiones" valor={contenido.resumen.sesiones} detalle="asignadas por entrenadores" />
              <ResumenCard titulo="Metas" valor={contenido.resumen.metas} detalle={`${contenido.resumen.metasCompletadas} completadas`} />
              <ResumenCard titulo="Competencias" valor={contenido.resumen.competencias} detalle="eventos asignados" />
            </>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel className="min-h-80">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{contenido.graficoPrincipal.etiqueta}</p>
              <h2 className="text-xl font-semibold">{contenido.graficoPrincipal.titulo}</h2>
            </div>

            <div className="h-64">
              {contenido.seriePrincipal.length === 0 ? (
                <EstadoVacio mensaje="Todavía no hay datos suficientes para graficar esta vista." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contenido.seriePrincipal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="etiqueta" stroke="#cbd5e1" />
                    <YAxis
                      stroke="#cbd5e1"
                      domain={contenido.graficoPrincipal.limitePorcentaje ? [0, 100] : ['auto', 'auto']}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(valor, _, item) => {
                        const detalle = item?.payload?.detalle ? ` (${item.payload.detalle})` : ''
                        return `${valor}${contenido.graficoPrincipal.sufijoValor}${detalle}`
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Bar dataKey={contenido.graficoPrincipal.valorKey} radius={[10, 10, 0, 0]}>
                      {contenido.seriePrincipal.map((item, indice) => (
                        <Cell key={`${item.etiqueta}-${indice}`} fill={coloresGrafico[indice % coloresGrafico.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                <EstadoVacio mensaje="Aún no hay metas suficientes para construir esta gráfica." />
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
                        <Cell key={`${item.nombre}-${indice}`} fill={coloresGrafico[indice % coloresGrafico.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor, _, item) => `${valor} ${item?.payload?.nombre?.toLowerCase?.() || ''}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-300">
              <p>{contenido.graficoSecundario.total} elementos evaluados</p>
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 font-semibold text-cyan-100">
                {contenido.graficoSecundario.porcentajeCentro}% completado
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contenido.modulos.map((modulo) => (
              <button
                key={modulo.id}
                onClick={() => setModuloActivo(modulo.id)}
                className={`group rounded-3xl border p-5 text-left transition duration-200 ${
                  moduloActivo === modulo.id
                    ? (esOscuro
                        ? 'border-cyan-400 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.14))] shadow-[0_18px_40px_rgba(8,145,178,0.24)]'
                        : 'border-cyan-500 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(37,99,235,0.12))] shadow-[0_18px_40px_rgba(14,116,144,0.12)]')
                    : (esOscuro
                        ? 'border-white/8 bg-white/5 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/7'
                        : 'border-slate-200/90 bg-white/72 hover:-translate-y-1 hover:border-cyan-500/35 hover:bg-white')
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold">{modulo.titulo}</p>
                  <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${
                    moduloActivo === modulo.id
                      ? 'bg-cyan-400/18 text-cyan-200'
                      : (esOscuro ? 'bg-white/8 text-slate-300' : 'bg-slate-100 text-slate-600')
                  }`}>
                    {moduloActivo === modulo.id ? t('Activo', 'Active') : t('Abrir', 'Open')}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{modulo.descripcion}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <Panel>
            {esEntrenador ? (
              <ModuloEntrenador
                datos={datos}
                moduloActivo={moduloActivo}
                guardarCambios={guardarCambios}
                vincularDeportista={vincularDeportista}
              />
            ) : (
              <ModuloDeportista
                datos={datos}
                moduloActivo={moduloActivo}
                guardarCambios={guardarCambios}
                ranking={contenido.ranking}
              />
            )}
          </Panel>
        </section>
      </main>
    </div>
  )
}

function ModuloDeportista({ datos, moduloActivo, guardarCambios, ranking }) {
  const [perfil, setPerfil] = useState(datos.perfil)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nuevaEstadistica, setNuevaEstadistica] = useState({
    fecha: '2026-05-08',
    disciplina: datos.perfil.disciplina || '',
    metrica: 'Goles',
    valor: 1,
    competencia: '',
  })
  const [metasLocales, setMetasLocales] = useState(datos.metas)

  const perfilRef = useRef(JSON.stringify(datos.perfil))
  const metasRef = useRef(JSON.stringify(datos.metas))
  const perfilTieneContenido = perfilDeportistaTieneContenido(datos.perfil)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const perfilStr = JSON.stringify(datos.perfil)
    if (perfilRef.current !== perfilStr) {
      perfilRef.current = perfilStr
      setPerfil(datos.perfil)
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
    await guardarCambios((actuales) => ({ ...actuales, perfil }))
    setEditandoPerfil(false)
  }

  // Convierte la imagen seleccionada a base64 para guardarla dentro del perfil del deportista.
  const cargarFotoPerfil = (archivo) => {
    if (!archivo) return
    if (!archivo.type?.startsWith('image/')) return

    const lector = new FileReader()
    lector.onload = () => {
      setPerfil((previo) => ({ ...previo, foto: lector.result }))
    }
    lector.readAsDataURL(archivo)
  }

  const agregarEstadistica = async (e) => {
    e.preventDefault()
    await guardarCambios((actuales) => ({
      ...actuales,
      estadisticas: (() => {
        const metricaNormalizada = String(nuevaEstadistica.metrica || '').trim().toLowerCase()
        const disciplinaNormalizada = String(nuevaEstadistica.disciplina || '').trim().toLowerCase()
        const contextoNormalizado = String(nuevaEstadistica.competencia || '').trim().toLowerCase()
        const valorNuevo = Number(nuevaEstadistica.valor) || 0

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
    setNuevaEstadistica((previo) => ({ ...previo, valor: 1, competencia: '' }))
  }

  if (moduloActivo === 'perfil') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Perfil activo</p>
          <h3 className="mt-2 text-2xl font-semibold">Información deportiva</h3>
          <p className="mt-3 max-w-xl text-sm text-slate-300">
            Este perfil lo ve usted en su cuenta y ayuda a que los entrenadores lo identifiquen mejor cuando lo vinculan.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <ResumenAsignadoSimple
              titulo="Metas asignadas"
              vacio="Aun no tienes metas asignadas."
              items={datos.metas}
              render={(meta) => `${meta.titulo} - ${meta.progreso}/${meta.objetivo}`}
            />
            <ResumenAsignadoSimple
              titulo="Sesiones asignadas"
              vacio="Aun no tienes sesiones asignadas."
              items={datos.sesiones}
              render={(sesion) => `${sesion.tipo} - ${sesion.fecha}`}
            />
            <ResumenAsignadoSimple
              titulo="Competencias asignadas"
              vacio="Aun no tienes competencias asignadas."
              items={datos.competencias}
              render={(competencia) => `${competencia.nombre} - ${competencia.fecha}`}
            />
            <ResumenAsignadoSimple
              titulo="Seguimiento"
              vacio="Aun no hay observaciones de tu entrenador."
              items={datos.observaciones}
              render={(observacion) => `${observacion.prioridad} - ${observacion.nota}`}
            />
          </div>
        </div>

        {editandoPerfil || !perfilTieneContenido ? (
          <form onSubmit={guardarPerfil} className="grid gap-4 md:grid-cols-2">
            <Campo label="Disciplina" value={perfil.disciplina} onChange={(value) => setPerfil({ ...perfil, disciplina: value })} />
            <Campo label="Categoria" value={perfil.categoria} onChange={(value) => setPerfil({ ...perfil, categoria: value })} />
            <Campo label="Equipo" value={perfil.equipo} onChange={(value) => setPerfil({ ...perfil, equipo: value })} />
            <div className="md:col-span-2">
              <Etiqueta>Foto de perfil</Etiqueta>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => cargarFotoPerfil(e.target.files?.[0])}
                className="mt-2 block w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
              />
              <p className="mt-2 text-xs text-slate-400">
                Puede subir JPG, JPEG, PNG, WEBP, GIF, SVG y cualquier otro formato de imagen compatible.
              </p>
            </div>
            <div className="md:col-span-2">
              <Campo label="Objetivo principal" value={perfil.objetivoPrincipal} onChange={(value) => setPerfil({ ...perfil, objetivoPrincipal: value })} />
            </div>
            <div className="md:col-span-2">
              <Etiqueta>Resumen personal</Etiqueta>
              <textarea
                value={perfil.bio}
                onChange={(e) => setPerfil({ ...perfil, bio: e.target.value })}
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                Guardar perfil
              </button>
              {perfilTieneContenido && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil(datos.perfil)
                    setEditandoPerfil(false)
                  }}
                  className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Cancelar edicion
                </button>
              )}
            </div>
          </form>
        ) : (
          <TarjetaPerfilGuardado
            etiqueta="Perfil guardado"
            titulo={datos.perfil.disciplina || 'Perfil deportivo actualizado'}
            descripcion={datos.perfil.bio || 'Sin resumen personal registrado.'}
            foto={datos.perfil.foto}
            campos={[
              { label: 'Disciplina', value: datos.perfil.disciplina },
              { label: 'Categoria', value: datos.perfil.categoria },
              { label: 'Equipo', value: datos.perfil.equipo },
              { label: 'Objetivo principal', value: datos.perfil.objetivoPrincipal },
            ]}
            accionTexto="Editar perfil"
            onAccion={() => setEditandoPerfil(true)}
          />
        )}

        <div className="hidden">
          <ResumenAsignadoSimple
            titulo="Metas asignadas"
            vacio="Aun no tienes metas asignadas."
            items={datos.metas}
            render={(meta) => `${meta.titulo} · ${meta.progreso}/${meta.objetivo}`}
          />
          <ResumenAsignadoSimple
            titulo="Sesiones asignadas"
            vacio="Aun no tienes sesiones asignadas."
            items={datos.sesiones}
            render={(sesion) => `${sesion.tipo} · ${sesion.fecha}`}
          />
          <ResumenAsignadoSimple
            titulo="Competencias asignadas"
            vacio="Aun no tienes competencias asignadas."
            items={datos.competencias}
            render={(competencia) => `${competencia.nombre} · ${competencia.fecha}`}
          />
          <ResumenAsignadoSimple
            titulo="Seguimiento"
            vacio="Aun no hay observaciones de tu entrenador."
            items={datos.observaciones}
            render={(observacion) => `${observacion.prioridad} - ${observacion.nota}`}
          />
        </div>
      </div>
    )
  }

  if (moduloActivo === 'estadisticas' || moduloActivo === 'estadísticas') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={agregarEstadistica} className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Nuevo registro</p>
            <h3 className="mt-2 text-2xl font-semibold">Agregar estadistica</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Fecha" type="date" value={nuevaEstadistica.fecha} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, fecha: value })} />
            <Campo label="Valor" type="number" value={nuevaEstadistica.valor} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, valor: value })} />
            <Campo label="Disciplina" value={nuevaEstadistica.disciplina} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, disciplina: value })} />
            <Campo label="Metrica" value={nuevaEstadistica.metrica} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, metrica: value })} />
            <div className="md:col-span-2">
              <Campo label="Competencia o contexto" value={nuevaEstadistica.competencia} onChange={(value) => setNuevaEstadistica({ ...nuevaEstadistica, competencia: value })} />
            </div>
          </div>
          <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Guardar estadistica
          </button>
        </form>

        <div className="space-y-4">
          {datos.estadisticas.length === 0 ? (
            <EstadoVacio mensaje="Todavia no has registrado estadisticas personales." />
          ) : (
            datos.estadisticas.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{item.metrica}</h4>
                    <p className="text-sm text-slate-300">{item.disciplina} · {item.competencia}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-cyan-300">{item.valor}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.fecha}</p>
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
      <ListadoAsignaciones
        titulo="Sesiones y entrenamientos asignados"
        vacio="Todavia no tienes sesiones asignadas por un entrenador."
        items={datos.sesiones}
        renderItem={(sesion) => (
          <>
            <div>
              <h4 className="font-semibold">{sesion.tipo}</h4>
              <p className="mt-1 text-sm text-slate-300">{sesion.descripcion || 'Sin descripcion adicional.'}</p>
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
        titulo="Metas asignadas"
        vacio="Todavia no tienes metas asignadas por un entrenador."
        items={metasLocales}
        renderItem={(meta) => (
          <div className="w-full">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{meta.titulo}</h4>
                <p className="mt-1 text-sm text-slate-300">{meta.descripcion || 'Sin descripcion adicional.'}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{meta.entrenadorNombre}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">{meta.progreso} / {meta.objetivo}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{meta.fechaLimite || 'Sin fecha limite'}</p>
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
                label="Progreso actual"
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
                <Etiqueta>Estado</Etiqueta>
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                >
                  <option value="en progreso">En progreso</option>
                  <option value="completada">Completada</option>
                  <option value="pausada">Pausada</option>
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
                  Guardar progreso
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
        titulo="Competencias asignadas"
        vacio="Todavia no tienes competencias asignadas."
        items={datos.competencias}
        renderItem={(competencia) => (
          <>
            <div>
              <h4 className="font-semibold">{competencia.nombre}</h4>
              <p className="mt-1 text-sm text-slate-300">{competencia.ubicacion || 'Ubicacion por definir'}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">{competencia.entrenadorNombre}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{competencia.estado || competencia.resultado || 'Asignada'}</span>
              <p className="mt-3 text-sm text-slate-400">{competencia.fecha}</p>
            </div>
          </>
        )}
      />
    )
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Reconocimientos</p>
      <h3 className="mt-2 text-2xl font-semibold">Logros del deportista</h3>
      {datos.logros.length === 0 && ranking.length === 0 ? (
        <div className="mt-6">
          <EstadoVacio mensaje="Tus logros apareceran aqui cuando completes metas o acumules avances relevantes." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {datos.logros.map((logro) => (
            <div key={logro.id} className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300">{logro.nivel}</p>
              <h4 className="mt-2 text-xl font-semibold">{logro.titulo}</h4>
              <p className="mt-2 text-sm text-slate-200">{logro.descripcion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModuloEntrenador({ datos, moduloActivo, guardarCambios, vincularDeportista }) {
  const [perfil, setPerfil] = useState(datos.perfil)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [correoDeportista, setCorreoDeportista] = useState('')
  const [edicionSesionId, setEdicionSesionId] = useState('')
  const [edicionMetaId, setEdicionMetaId] = useState('')
  const [edicionCompetenciaId, setEdicionCompetenciaId] = useState('')
  const [edicionObservacionId, setEdicionObservacionId] = useState('')
  const [filtroDeportistaId, setFiltroDeportistaId] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
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

  const opcionesDeportistas = useMemo(() => obtenerOpcionesDeportistas(datos), [datos])
  const perfilTieneContenido = perfilEntrenadorTieneContenido(datos.perfil)
  const disciplinas = useMemo(
    () => [...new Set((datos.deportistas || []).map((item) => item.disciplina).filter(Boolean))],
    [datos.deportistas]
  )

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

  const deportistasFiltrados = datos.deportistas.filter((deportista) => {
    const coincideId = !filtroDeportistaId || deportista.id === filtroDeportistaId
    const coincideDisciplina = !filtroDisciplina || deportista.disciplina === filtroDisciplina
    return coincideId && coincideDisciplina
  })

  const sesionesFiltradas = datos.sesiones.filter((sesion) => coincideFiltroDeportista(sesion) && coincideFiltroDisciplina(sesion))
  const metasFiltradas = datos.metas.filter((meta) => coincideFiltroDeportista(meta) && coincideFiltroDisciplina(meta))
  const competenciasFiltradas = datos.competencias.filter((competencia) => coincideFiltroDeportista(competencia) && coincideFiltroDisciplina(competencia))
  const observacionesFiltradas = datos.observaciones.filter((observacion) => coincideFiltroDeportista(observacion) && coincideFiltroDisciplina(observacion))

  const FiltrosEntrenador = (
    <div className="mb-6 grid gap-4 rounded-2xl border border-white/8 bg-white/5 p-4 md:grid-cols-3">
      <div>
        <Etiqueta>Filtrar por deportista</Etiqueta>
        <select
          value={filtroDeportistaId}
          onChange={(e) => setFiltroDeportistaId(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
        >
          <option value="">Todos</option>
          {opcionesDeportistas.map((deportista) => (
            <option key={deportista.id} value={deportista.id}>{deportista.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <Etiqueta>Filtrar por disciplina</Etiqueta>
        <select
          value={filtroDisciplina}
          onChange={(e) => setFiltroDisciplina(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
        >
          <option value="">Todas</option>
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
          }}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )

  if (moduloActivo === 'perfil') {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Perfil profesional</p>
            <h3 className="mt-2 text-2xl font-semibold">Configuracion del entrenador</h3>
            <p className="mt-3 max-w-xl text-sm text-slate-300">
              Esta ficha resume su enfoque de trabajo y mantiene el perfil alineado con el estilo visual del tablero.
            </p>
          </div>
          {!perfilTieneContenido && (
            <EstadoVacio mensaje="Todavia no ha guardado su perfil profesional." />
          )}
        </div>

        {editandoPerfil || !perfilTieneContenido ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await guardarCambios((actuales) => ({ ...actuales, perfil }))
              setEditandoPerfil(false)
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Campo label="Especialidad" value={perfil.especialidad} onChange={(value) => setPerfil({ ...perfil, especialidad: value })} />
            <Campo label="Categoria" value={perfil.categoria} onChange={(value) => setPerfil({ ...perfil, categoria: value })} />
            <Campo label="Equipo" value={perfil.equipo} onChange={(value) => setPerfil({ ...perfil, equipo: value })} />
            <div className="md:col-span-2">
              <Etiqueta>Foto de perfil</Etiqueta>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => cargarFotoPerfil(e.target.files?.[0])}
                className="mt-2 block w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
              />
              <p className="mt-2 text-xs text-slate-400">
                Puede subir JPG, JPEG, PNG, WEBP, GIF, SVG y cualquier otro formato de imagen compatible.
              </p>
            </div>
            <div className="md:col-span-2">
              <Etiqueta>Metodologia</Etiqueta>
              <textarea
                value={perfil.metodologia}
                onChange={(e) => setPerfil({ ...perfil, metodologia: e.target.value })}
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                Guardar perfil
              </button>
              {perfilTieneContenido && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfil(datos.perfil)
                    setEditandoPerfil(false)
                  }}
                  className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Cancelar edicion
                </button>
              )}
            </div>
          </form>
        ) : (
          <TarjetaPerfilGuardado
            etiqueta="Perfil guardado"
            titulo={datos.perfil.especialidad || 'Entrenador registrado'}
            descripcion={datos.perfil.metodologia || 'Sin metodologia registrada.'}
            foto={datos.perfil.foto}
            campos={[
              { label: 'Especialidad', value: datos.perfil.especialidad },
              { label: 'Categoria', value: datos.perfil.categoria },
              { label: 'Equipo', value: datos.perfil.equipo },
            ]}
            accionTexto="Editar perfil"
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
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Vinculacion real</p>
            <h3 className="mt-2 text-2xl font-semibold">Agregar deportista por correo</h3>
            <p className="mt-2 text-sm text-slate-300">
              El deportista debe existir como usuario registrado con rol de deportista.
            </p>
          </div>
          <Campo label="Correo del deportista" type="email" value={correoDeportista} onChange={setCorreoDeportista} />
          <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Vincular deportista
          </button>
        </form>

        <div className="space-y-4">
          {FiltrosEntrenador}
          {deportistasFiltrados.length === 0 ? (
            <EstadoVacio mensaje="Aun no tienes deportistas vinculados. Registre primero sus cuentas y luego agreguelos por correo." />
          ) : (
            deportistasFiltrados.map((deportista) => (
              <div key={deportista.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{deportista.nombre}</h4>
                    <p className="mt-1 text-sm text-slate-300">{deportista.correo}</p>
                    <p className="mt-2 text-sm text-slate-400">{deportista.disciplina || 'Disciplina pendiente'}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm text-cyan-200">{deportista.progreso}%</span>
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
                        className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
                      >
                        Desvincular
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
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Asignacion multiple</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionSesionId ? 'Editar sesion' : 'Crear sesion'}</h3>
          </div>
          <Campo label="Fecha" type="date" value={nuevaSesion.fecha} onChange={(value) => setNuevaSesion({ ...nuevaSesion, fecha: value })} />
          <Campo label="Tipo de sesion" value={nuevaSesion.tipo} onChange={(value) => setNuevaSesion({ ...nuevaSesion, tipo: value })} />
          <div>
            <Etiqueta>Descripcion</Etiqueta>
            <textarea
              value={nuevaSesion.descripcion}
              onChange={(e) => setNuevaSesion({ ...nuevaSesion, descripcion: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            />
          </div>
          <div>
            <Etiqueta>Estado</Etiqueta>
            <select
              value={nuevaSesion.estado}
              onChange={(e) => setNuevaSesion({ ...nuevaSesion, estado: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            >
              <option value="pendiente">Pendiente</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
          <SelectorDeportistas
            deportistas={opcionesDeportistas}
            seleccionados={nuevaSesion.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaSesion.asignados, setNuevaSesion, deportistaId)}
          />
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionSesionId ? 'Actualizar sesion' : 'Guardar sesion'}
            </button>
            {edicionSesionId && (
              <button
                type="button"
                onClick={resetSesion}
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          titulo="Sesiones creadas"
          vacio="No hay sesiones creadas todavia."
          items={sesionesFiltradas}
          renderItem={(sesion) => (
            <div className="flex w-full flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{sesion.tipo}</h4>
                <p className="mt-1 text-sm text-slate-300">{sesion.descripcion || 'Sin descripcion adicional.'}</p>
                <p className="mt-2 text-sm text-cyan-300">{(sesion.asignadoNombres || []).join(', ')}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{sesion.estado}</span>
                <p className="mt-3 text-sm text-slate-400">{sesion.fecha}</p>
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
                    className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
                  >
                    Editar
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
                    className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
                  >
                    Eliminar
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
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Objetivos asignados</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionMetaId ? 'Editar meta' : 'Crear meta'}</h3>
          </div>
          <Campo label="Titulo" value={nuevaMeta.titulo} onChange={(value) => setNuevaMeta({ ...nuevaMeta, titulo: value })} />
          <div>
            <Etiqueta>Descripcion</Etiqueta>
            <textarea
              value={nuevaMeta.descripcion}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, descripcion: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            />
          </div>
          <Campo label="Objetivo numerico" type="number" value={nuevaMeta.objetivo} onChange={(value) => setNuevaMeta({ ...nuevaMeta, objetivo: value })} />
          <Campo label="Fecha limite" type="date" value={nuevaMeta.fechaLimite} onChange={(value) => setNuevaMeta({ ...nuevaMeta, fechaLimite: value })} />
          <SelectorDeportistas
            deportistas={opcionesDeportistas}
            seleccionados={nuevaMeta.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaMeta.asignados, setNuevaMeta, deportistaId)}
          />
          {nuevaMeta.asignados.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-sm font-medium text-slate-300">Progreso individual por deportista</p>
              {nuevaMeta.asignados.map((deportistaId) => {
                const asignacion = (nuevaMeta.asignaciones || []).find((item) => item.deportistaId === deportistaId)
                const deportista = opcionesDeportistas.find((item) => item.id === deportistaId)
                return (
                  <div key={deportistaId} className="grid gap-3 rounded-xl border border-white/8 bg-white/5 p-3 md:grid-cols-3">
                    <div className="md:col-span-3">
                      <p className="font-medium">{deportista?.nombre || asignacion?.nombre}</p>
                    </div>
                    <Campo
                      label="Progreso"
                      type="number"
                      value={asignacion?.progreso ?? 0}
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
                      label="Objetivo"
                      type="number"
                      value={asignacion?.objetivo ?? nuevaMeta.objetivo}
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
                      <Etiqueta>Estado</Etiqueta>
                      <select
                        value={asignacion?.estado ?? 'en progreso'}
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
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      >
                        <option value="en progreso">En progreso</option>
                        <option value="completada">Completada</option>
                        <option value="pausada">Pausada</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionMetaId ? 'Actualizar meta' : 'Guardar meta'}
            </button>
            {edicionMetaId && (
              <button
                type="button"
                onClick={resetMeta}
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          titulo="Metas creadas"
          vacio="No hay metas asignadas todavia."
          items={metasFiltradas}
          renderItem={(meta) => (
            <div className="w-full">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold">{meta.titulo}</h4>
                  <p className="mt-1 text-sm text-slate-300">{meta.descripcion || 'Sin descripcion adicional.'}</p>
                  <p className="mt-2 text-sm text-cyan-300">{(meta.asignadoNombres || []).join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">{meta.estado}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{meta.fechaLimite || 'Sin fecha limite'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(meta.asignaciones || []).map((asignacion) => (
                  <div key={asignacion.deportistaId} className="rounded-xl border border-white/8 bg-slate-950/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{asignacion.nombre}</p>
                      <p className="text-xs text-slate-300">{asignacion.progreso} / {asignacion.objetivo}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
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
                  className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
                >
                  Editar
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
                  className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
                >
                  Eliminar
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
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Eventos compartidos</p>
            <h3 className="mt-2 text-2xl font-semibold">{edicionCompetenciaId ? 'Editar competencia' : 'Crear competencia'}</h3>
          </div>
          <Campo label="Nombre" value={nuevaCompetencia.nombre} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, nombre: value })} />
          <Campo label="Fecha" type="date" value={nuevaCompetencia.fecha} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, fecha: value })} />
          <Campo label="Ubicacion" value={nuevaCompetencia.ubicacion} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, ubicacion: value })} />
          <Campo label="Estado" value={nuevaCompetencia.estado} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, estado: value })} />
          <Campo label="Resultado esperado o nota" value={nuevaCompetencia.resultado} onChange={(value) => setNuevaCompetencia({ ...nuevaCompetencia, resultado: value })} />
          <SelectorDeportistas
            deportistas={opcionesDeportistas}
            seleccionados={nuevaCompetencia.asignados}
            onToggle={(deportistaId) => toggleAsignado(nuevaCompetencia.asignados, setNuevaCompetencia, deportistaId)}
          />
          <div className="flex gap-3">
            <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              {edicionCompetenciaId ? 'Actualizar competencia' : 'Guardar competencia'}
            </button>
            {edicionCompetenciaId && (
              <button
                type="button"
                onClick={resetCompetencia}
                className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div>
          {FiltrosEntrenador}
          <ListaEntrenadorAsignaciones
          titulo="Competencias creadas"
          vacio="No hay competencias creadas todavia."
          items={competenciasFiltradas}
          renderItem={(competencia) => (
            <div className="flex w-full flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{competencia.nombre}</h4>
                <p className="mt-1 text-sm text-slate-300">{competencia.ubicacion || 'Ubicacion por definir'}</p>
                <p className="mt-2 text-sm text-cyan-300">{(competencia.asignadoNombres || []).join(', ')}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{competencia.estado || competencia.resultado || 'Asignada'}</span>
                <p className="mt-3 text-sm text-slate-400">{competencia.fecha}</p>
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
                    className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
                  >
                    Editar
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
                    className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
                  >
                    Eliminar
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
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Seguimiento individual</p>
          <h3 className="mt-2 text-2xl font-semibold">{edicionObservacionId ? 'Editar observacion' : 'Registrar observacion'}</h3>
        </div>
        <div>
          <Etiqueta>Deportista</Etiqueta>
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
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
          >
            <option value="">Seleccione un deportista</option>
            {opcionesDeportistas.map((deportista) => (
              <option key={deportista.id} value={deportista.id}>{deportista.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <Etiqueta>Nota tecnica</Etiqueta>
          <textarea
            value={nuevaObservacion.nota}
            onChange={(e) => setNuevaObservacion({ ...nuevaObservacion, nota: e.target.value })}
            className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
          />
        </div>
        <Campo label="Prioridad" value={nuevaObservacion.prioridad} onChange={(value) => setNuevaObservacion({ ...nuevaObservacion, prioridad: value })} />
        <div className="flex gap-3">
          <button className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            {edicionObservacionId ? 'Actualizar observacion' : 'Guardar observacion'}
          </button>
          {edicionObservacionId && (
            <button
              type="button"
              onClick={resetObservacion}
              className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div>
        {FiltrosEntrenador}
        <ListaEntrenadorAsignaciones
        titulo="Observaciones registradas"
        vacio="No hay observaciones registradas todavia."
        items={observacionesFiltradas}
        renderItem={(observacion) => (
          <div className="w-full">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-semibold">{observacion.deportista}</h4>
              <span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200">{observacion.prioridad}</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{observacion.nota}</p>
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
                className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
              >
                Editar
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
                className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
              >
                Eliminar
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
    <article className={`rounded-3xl border p-6 shadow-xl backdrop-blur ${
      esOscuro
        ? 'border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(15,23,42,0.55))] shadow-slate-950/20'
        : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,249,255,0.92))] shadow-cyan-950/8'
    }`}>
      <p className={`text-sm uppercase tracking-[0.3em] ${esOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{titulo}</p>
      <p className={`mt-4 text-4xl font-semibold ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
      <p className={`mt-3 text-sm ${esOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{detalle}</p>
    </article>
  )
}

function Panel({ children, className = '' }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-[28px] border p-6 shadow-2xl backdrop-blur ${esOscuro ? 'border-white/8 bg-slate-900/65 shadow-slate-950/30' : 'border-slate-200/80 bg-white/80 shadow-cyan-950/10'} ${className}`}>
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

function TarjetaPerfilGuardado({ etiqueta, titulo, descripcion, campos, accionTexto, onAccion, foto }) {
  return (
    <div className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-slate-900/80 to-slate-950/80 p-5 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/70">
            {foto ? (
              <img src={foto} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-cyan-200">
                {String(titulo || 'V').trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{etiqueta}</p>
            <h4 className="mt-2 text-xl font-semibold text-white">{titulo || 'Perfil actualizado'}</h4>
          </div>
        </div>
        <button
          type="button"
          onClick={onAccion}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
        >
          {accionTexto}
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{descripcion}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {campos.map((campo) => (
          <div key={campo.label} className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{campo.label}</p>
            <p className="mt-2 text-sm font-medium text-slate-100">{campo.value || 'Pendiente'}</p>
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

function ResumenAsignadoSimple({ titulo, vacio, items, render }) {
  const { esOscuro } = useUI()

  return (
    <div className={`rounded-2xl border p-3 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200/80 bg-white/70'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{titulo}</p>
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

function SelectorDeportistas({ deportistas, seleccionados, onToggle }) {
  const { esOscuro } = useUI()

  return (
    <div>
      <Etiqueta>Deportistas asignados</Etiqueta>
      <div className={`mt-3 space-y-3 rounded-2xl border p-4 ${esOscuro ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-white/80'}`}>
        {deportistas.length === 0 ? (
          <EstadoVacio mensaje="Primero vincule deportistas reales para poder asignarles sesiones, metas o competencias." />
        ) : (
          deportistas.map((deportista) => (
            <label key={deportista.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${esOscuro ? 'border-white/8 bg-white/5' : 'border-slate-200 bg-slate-50/80'}`}>
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

function ListaEntrenadorAsignaciones({ titulo, vacio, items, renderItem }) {
  const { esOscuro, t } = useUI()

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t('Vista del entrenador', 'Coach view')}</p>
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

export default Tablero

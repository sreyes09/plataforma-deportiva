// Utilidad visual para mostrar fechas cortas en tarjetas y graficos.
const formatearFecha = (fecha) =>
  new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(fecha))

// Convierte cualquier entrada en un numero seguro antes de graficar o resumir.
const convertirNumero = (valor) => {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

// Evita que una fecha invalida rompa ordenamientos o series temporales.
const obtenerFechaSegura = (valor) => {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

// Ordena colecciones por fecha para construir cronologias coherentes.
const ordenarPorFecha = (items, selector) =>
  [...items].sort((a, b) => {
    const fechaA = obtenerFechaSegura(selector(a))
    const fechaB = obtenerFechaSegura(selector(b))
    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1
    return fechaA - fechaB
  })

// Ajusta etiquetas largas para que no deformen los graficos.
const recortarEtiqueta = (texto, limite = 18) => {
  const limpio = String(texto || '').trim()
  if (!limpio) return 'Sin dato'
  return limpio.length > limite ? `${limpio.slice(0, limite - 1)}...` : limpio
}

// Transforma el avance numerico en un porcentaje maximo de 100.
const convertirPorcentaje = (progreso, objetivo) => {
  const objetivoSeguro = convertirNumero(objetivo)
  if (objetivoSeguro <= 0) return 0
  return Math.min(Math.round((convertirNumero(progreso) / objetivoSeguro) * 100), 100)
}

// Construye la estructura base del panel segun el rol autenticado.
export const crearPanelVacio = (usuario) => {
  if (!usuario) return null

  if (usuario.rol === 'administrador') {
    return {
      rol: usuario.rol,
      perfil: {
        nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
        foto: '',
        cargo: 'Administrador general',
        area: 'Gestion de plataforma',
        bio: '',
      },
      estadisticas: [],
      metas: [],
      logros: [],
      competencias: [],
      deportistas: [],
      sesiones: [],
      observaciones: [],
      usuarios: [],
      resumenAdmin: {
        usuarios: 0,
        deportistas: 0,
        entrenadores: 0,
        administradores: 0,
        activos: 0,
        inactivos: 0,
        estadisticas: 0,
        metas: 0,
        sesiones: 0,
        competencias: 0,
      },
      actividadAdmin: [],
    }
  }

  if (usuario.rol === 'entrenador') {
    return {
      rol: usuario.rol,
      perfil: {
        nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
        foto: '',
        especialidad: '',
        categoria: '',
        equipo: '',
        metodologia: '',
      },
      competencias: [],
      deportistas: [],
      sesiones: [],
      observaciones: [],
      estadisticas: [],
      metas: [],
      logros: [],
    }
  }

  return {
    rol: usuario.rol,
    perfil: {
      nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
      foto: '',
      disciplina: '',
      categoria: '',
      equipo: '',
      objetivoPrincipal: '',
      bio: '',
    },
    estadisticas: [],
    metas: [],
    logros: [],
    competencias: [],
    deportistas: [],
    sesiones: [],
    observaciones: [],
  }
}

// Asegura que el frontend siempre reciba arreglos y objetos con la forma esperada.
export const normalizarPanel = (usuario, datos) => {
  const base = crearPanelVacio(usuario)

  if (!base) return null

  return {
    ...base,
    ...(datos || {}),
    perfil: {
      ...base.perfil,
      ...(datos?.perfil || {}),
      nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
    },
    estadisticas: Array.isArray(datos?.estadisticas) ? datos.estadisticas : [],
    metas: Array.isArray(datos?.metas) ? datos.metas : [],
    logros: Array.isArray(datos?.logros) ? datos.logros : [],
    competencias: Array.isArray(datos?.competencias) ? datos.competencias : [],
    deportistas: Array.isArray(datos?.deportistas) ? datos.deportistas : [],
    sesiones: Array.isArray(datos?.sesiones) ? datos.sesiones : [],
    observaciones: Array.isArray(datos?.observaciones) ? datos.observaciones : [],
    usuarios: Array.isArray(datos?.usuarios) ? datos.usuarios : [],
    resumenAdmin: {
      ...(base.resumenAdmin || {}),
      ...(datos?.resumenAdmin || {}),
    },
    actividadAdmin: Array.isArray(datos?.actividadAdmin) ? datos.actividadAdmin : [],
  }
}

export const obtenerResumenDeportista = (datos) => {
  const totalEstadisticas = datos.estadisticas.length
  const metasCompletadas = datos.metas.filter((meta) => meta.estado === 'completada').length
  const logros = datos.logros.length
  const disciplinas = new Set(
    datos.estadisticas
      .map((item) => item.disciplina)
      .filter(Boolean)
  ).size

  return {
    deportes: disciplinas,
    estadisticas: totalEstadisticas,
    metas: datos.metas.length,
    logros,
    metasCompletadas,
    sesiones: datos.sesiones.length,
    competencias: datos.competencias.length,
  }
}

export const obtenerResumenEntrenador = (datos) => {
  const sesionesPendientes = datos.sesiones.filter((sesion) => sesion.estado !== 'Completada').length
  const metasPorAsignacion = datos.metas.flatMap((meta) => meta.asignaciones || [])
  const promedioProgreso =
    metasPorAsignacion.reduce(
      (acum, asignacion) => acum + convertirPorcentaje(asignacion.progreso, asignacion.objetivo),
      0
    ) / (metasPorAsignacion.length || 1)

  return {
    deportistas: datos.deportistas.length,
    sesiones: datos.sesiones.length,
    alertas: datos.observaciones.filter((item) => item.prioridad === 'alta').length,
    competencias: datos.competencias.length,
    sesionesPendientes,
    promedioProgreso: Math.round(promedioProgreso),
  }
}

export const obtenerResumenAdministrador = (datos) => ({
  usuarios: datos.resumenAdmin?.usuarios || 0,
  deportistas: datos.resumenAdmin?.deportistas || 0,
  entrenadores: datos.resumenAdmin?.entrenadores || 0,
  administradores: datos.resumenAdmin?.administradores || 0,
  activos: datos.resumenAdmin?.activos || 0,
  inactivos: datos.resumenAdmin?.inactivos || 0,
  estadisticas: datos.resumenAdmin?.estadisticas || 0,
  metas: datos.resumenAdmin?.metas || 0,
  sesiones: datos.resumenAdmin?.sesiones || 0,
  competencias: datos.resumenAdmin?.competencias || 0,
})

export const construirSerieDeportista = (datos) =>
  (datos.metas.length > 0
    ? datos.metas.map((meta) => ({
        etiqueta: recortarEtiqueta(meta.titulo, 16),
        valor: convertirPorcentaje(meta.progreso, meta.objetivo),
        detalle: `${convertirNumero(meta.progreso)}/${convertirNumero(meta.objetivo)}`,
      }))
    : ordenarPorFecha(datos.estadisticas, (item) => item.fecha).slice(-6).map((item) => ({
        etiqueta: formatearFecha(item.fecha),
        valor: convertirNumero(item.valor),
        detalle: item.metrica || item.disciplina || 'Registro',
      })))

export const construirPorcentajeMetasDeportista = (datos) => {
  const total = datos.metas.length
  const completadas = datos.metas.filter((meta) => meta.estado === 'completada').length
  const pendientes = Math.max(total - completadas, 0)
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0

  return {
    series: [
      { nombre: 'Completadas', valor: completadas },
      { nombre: 'Pendientes', valor: pendientes },
    ],
    porcentaje,
    total,
  }
}

export const construirRankingDeportista = (datos, usuario) => {
  const totalPersonal = datos.estadisticas.reduce((acum, item) => acum + convertirNumero(item.valor), 0)

  if (datos.estadisticas.length === 0) {
    return []
  }

  return [{ nombre: usuario.nombre, puntaje: totalPersonal, posicion: 1 }]
}

export const construirDistribucionMetas = (datos) => {
  const completadas = datos.metas.filter((meta) => meta.estado === 'completada').length
  const pendientes = datos.metas.length - completadas
  return [
    { nombre: 'Completadas', valor: completadas || 0 },
    { nombre: 'En progreso', valor: pendientes || 0 },
  ]
}

export const construirResumenCoach = (datos) =>
  datos.deportistas.map((deportista) => {
    const asignaciones = datos.metas.flatMap((meta) =>
      (meta.asignaciones || []).filter((asignacion) => asignacion.deportistaId === deportista.id)
    )

    const progreso = asignaciones.reduce((total, asignacion) => total + convertirNumero(asignacion.progreso), 0)
    const objetivo = asignaciones.reduce((total, asignacion) => total + convertirNumero(asignacion.objetivo), 0)
    const porcentaje = objetivo > 0 ? Math.min(Math.round((progreso / objetivo) * 100), 100) : 0

    return {
      etiqueta: recortarEtiqueta(deportista.nombre.split(' ')[0], 12),
      valor: porcentaje,
      progreso,
      objetivo,
      metas: asignaciones.length,
      detalle: `${progreso}/${objetivo || 0} en ${asignaciones.length} metas`,
    }
  })

export const construirPorcentajeMetasEntrenador = (datos) => {
  const deportistas = datos.deportistas || []
  const estadoPorDeportista = deportistas.map((deportista) => {
    const asignaciones = datos.metas.flatMap((meta) =>
      (meta.asignaciones || []).filter((asignacion) => asignacion.deportistaId === deportista.id)
    )
    const completadas = asignaciones.length > 0 && asignaciones.every((asignacion) => asignacion.estado === 'completada')
    return completadas
  })

  const alDia = estadoPorDeportista.filter(Boolean).length
  const pendientes = Math.max(deportistas.length - alDia, 0)
  const porcentaje = deportistas.length > 0 ? Math.round((alDia / deportistas.length) * 100) : 0

  return {
    series: [
      { nombre: 'Al dia', valor: alDia },
      { nombre: 'Pendientes', valor: pendientes },
    ],
    porcentaje,
    total: deportistas.length,
  }
}

export const obtenerOpcionesDeportistas = (datos) =>
  datos.deportistas.map((deportista) => ({
    id: deportista.id,
    nombre: deportista.nombre,
    descripcion: `${deportista.correo}${deportista.disciplina ? ` · ${deportista.disciplina}` : ''}`,
  }))

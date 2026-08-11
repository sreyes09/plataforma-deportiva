import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Limpia cualquier valor para que siempre se exporte como texto legible.
const limpiarTexto = (valor = '') =>
  String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()

// Convierte a número seguro cuando el valor puede venir vacío o como texto.
const convertirNumero = (valor) => {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

// Formatea fechas según el idioma activo del usuario.
const formatearFechaHora = (idioma = 'es') =>
  new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

// Evita nombres de archivo con caracteres problemáticos para el navegador.
const crearNombreArchivo = (rolUsuario, extension) => {
  const fecha = new Date().toISOString().slice(0, 10)
  return `vyrox-reporte-${rolUsuario || 'usuario'}-${fecha}.${extension}`
}

// Une nombre y apellidos sin repetir espacios ni valores vacíos.
const construirNombreCompleto = (...partes) => {
  const tokens = partes
    .flat()
    .map((item) => limpiarTexto(item))
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter(Boolean)

  const unicos = []
  tokens.forEach((token) => {
    const anterior = unicos[unicos.length - 1]
    if (!anterior || anterior.toLowerCase() !== token.toLowerCase()) {
      unicos.push(token)
    }
  })

  return unicos.join(' ')
}

// Traduce el rol actual a un texto claro dentro del reporte.
const obtenerRolLegible = (rolUsuario, t) => {
  if (rolUsuario === 'administrador') return t('Administrador', 'Administrator')
  if (rolUsuario === 'entrenador') return t('Entrenador', 'Coach')
  return t('Deportista', 'Athlete')
}

// Convierte cualquier fila a texto plano para evitar celdas dañadas.
const normalizarFila = (fila = []) => fila.map((celda) => limpiarTexto(celda))

// Garantiza que cada sección tenga contenido exportable.
const asegurarFilas = (filas = [], t) =>
  filas.length > 0 ? filas.map((fila) => normalizarFila(fila)) : [[t('Sin registros disponibles', 'No records available')]]

// Evita exportar logros repetidos cuando la misma meta ya generó varias entradas visuales.
const deduplicarLogrosExportacion = (logros = []) => {
  const vistos = new Set()

  return (logros || []).filter((logro) => {
    const llave = [
      limpiarTexto(logro?.titulo || ''),
      limpiarTexto(logro?.nivel || ''),
      limpiarTexto(logro?.descripcion || ''),
    ].join('|').toLowerCase()

    if (!llave) return true
    if (vistos.has(llave)) return false
    vistos.add(llave)
    return true
  })
}

// Construye toda la información del reporte según el rol autenticado.
const construirSeccionesReporte = ({ usuario, rolUsuario, datos, contenido, t, idioma }) => {
  const resumen = []

  if (rolUsuario === 'administrador') {
    resumen.push(
      [t('Usuarios', 'Users'), contenido?.resumen?.usuarios ?? 0],
      [t('Deportistas', 'Athletes'), contenido?.resumen?.deportistas ?? 0],
      [t('Entrenadores', 'Coaches'), contenido?.resumen?.entrenadores ?? 0],
      [t('Activos', 'Active'), contenido?.resumen?.activos ?? 0],
      [t('Inactivos', 'Inactive'), contenido?.resumen?.inactivos ?? 0],
    )
  } else if (rolUsuario === 'entrenador') {
    resumen.push(
      [t('Deportistas vinculados', 'Linked athletes'), contenido?.resumen?.deportistas ?? 0],
      [t('Sesiones', 'Sessions'), contenido?.resumen?.sesiones ?? 0],
      [t('Alertas', 'Alerts'), contenido?.resumen?.alertas ?? 0],
      [t('Competencias', 'Competitions'), contenido?.resumen?.competencias ?? 0],
      [t('Promedio de progreso', 'Average progress'), `${contenido?.resumen?.promedioProgreso ?? 0}%`],
    )
  } else {
    resumen.push(
      [t('Estadísticas', 'Statistics'), contenido?.resumen?.estadisticas ?? 0],
      [t('Sesiones', 'Sessions'), contenido?.resumen?.sesiones ?? 0],
      [t('Metas', 'Goals'), contenido?.resumen?.metas ?? 0],
      [t('Competencias', 'Competitions'), contenido?.resumen?.competencias ?? 0],
      [t('Logros', 'Achievements'), datos?.logros?.length ?? 0],
    )
  }

  const secciones = [
    {
      titulo: t('Resumen general', 'General summary'),
      columnas: [t('Campo', 'Field'), t('Valor', 'Value')],
      filas: asegurarFilas(resumen, t),
    },
  ]

  if (rolUsuario === 'administrador') {
    secciones.push({
      titulo: t('Usuarios registrados', 'Registered users'),
      columnas: [t('Nombre', 'Name'), t('Correo', 'Email'), t('Rol', 'Role'), t('Estado', 'Status')],
      filas: asegurarFilas(
        (datos?.usuarios || [])
          .filter((item) => item?.rol !== 'administrador')
          .map((item) => [
            item.nombreCompleto || construirNombreCompleto(item.nombre, item.apellidos),
            item.correo || '',
            item.rol || '',
            item.estado || '',
          ]),
        t
      ),
    })
  }

  if (rolUsuario === 'entrenador') {
    secciones.push(
      {
        titulo: t('Deportistas vinculados', 'Linked athletes'),
        columnas: [t('Nombre', 'Name'), t('Correo', 'Email'), t('Disciplina', 'Discipline')],
        filas: asegurarFilas(
          (datos?.deportistas || []).map((item) => [item.nombre || '', item.correo || '', item.disciplina || '']),
          t
        ),
      },
      {
        titulo: t('Sesiones asignadas', 'Assigned sessions'),
        columnas: [t('Tipo', 'Type'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Deportistas', 'Athletes')],
        filas: asegurarFilas(
          (datos?.sesiones || []).map((item) => [
            item.tipo || '',
            item.fecha || '',
            item.estado || '',
            (item.deportistas || []).map((persona) => persona.nombre || '').join(', '),
          ]),
          t
        ),
      },
      {
        titulo: t('Metas creadas', 'Created goals'),
        columnas: [t('Título', 'Title'), t('Objetivo', 'Target'), t('Fecha límite', 'Due date'), t('Asignados', 'Assigned')],
        filas: asegurarFilas(
          (datos?.metas || []).map((item) => [
            item.titulo || item.metrica || '',
            String(item.objetivo ?? ''),
            item.fechaLimite || '',
            String((item.asignaciones || []).length),
          ]),
          t
        ),
      },
      {
        titulo: t('Competencias creadas', 'Created competitions'),
        columnas: [t('Nombre', 'Name'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Participantes', 'Participants')],
        filas: asegurarFilas(
          (datos?.competencias || []).map((item) => [
            item.nombre || '',
            item.fecha || '',
            item.estado || item.resultado || '',
            String((item.deportistas || []).length),
          ]),
          t
        ),
      },
      {
        titulo: t('Seguimiento', 'Tracking'),
        columnas: [t('Deportista', 'Athlete'), t('Prioridad', 'Priority'), t('Observación', 'Observation'), t('Fecha', 'Date')],
        filas: asegurarFilas(
          (datos?.observaciones || []).map((item) => [
            item.deportistaNombre || '',
            item.prioridad || '',
            item.nota || '',
            item.fecha || '',
          ]),
          t
        ),
      }
    )
  }

  if (rolUsuario !== 'administrador') {
    secciones.push(
      {
        titulo: t('Estadísticas registradas', 'Logged statistics'),
        columnas: [t('Fecha', 'Date'), t('Disciplina', 'Discipline'), t('Métrica', 'Metric'), t('Valor', 'Value'), t('Contexto', 'Context')],
        filas: asegurarFilas(
          (datos?.estadisticas || []).map((item) => [
            item.fecha || '',
            item.disciplina || '',
            item.metrica || '',
            String(convertirNumero(item.valor)),
            item.competencia || item.contexto || '',
          ]),
          t
        ),
      },
      {
        titulo: t('Metas', 'Goals'),
        columnas: [t('Título', 'Title'), t('Objetivo', 'Target'), t('Progreso', 'Progress'), t('Estado', 'Status'), t('Fecha límite', 'Due date')],
        filas: asegurarFilas(
          (datos?.metas || []).map((item) => [
            item.titulo || item.metrica || '',
            String(item.objetivo ?? ''),
            String(item.progreso ?? ''),
            item.estado || '',
            item.fechaLimite || '',
          ]),
          t
        ),
      },
      {
        titulo: t('Sesiones', 'Sessions'),
        columnas: [t('Tipo', 'Type'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Descripción', 'Description')],
        filas: asegurarFilas(
          (datos?.sesiones || []).map((item) => [item.tipo || '', item.fecha || '', item.estado || '', item.descripcion || '']),
          t
        ),
      },
      {
        titulo: t('Competencias', 'Competitions'),
        columnas: [t('Nombre', 'Name'), t('Fecha', 'Date'), t('Ubicación', 'Location'), t('Estado', 'Status')],
        filas: asegurarFilas(
          (datos?.competencias || []).map((item) => [item.nombre || '', item.fecha || '', item.ubicacion || '', item.estado || item.resultado || '']),
          t
        ),
      },
      {
        titulo: t('Logros y reconocimientos', 'Achievements and recognitions'),
        columnas: [t('Título', 'Title'), t('Nivel', 'Level'), t('Descripción', 'Description')],
        filas: asegurarFilas(
          deduplicarLogrosExportacion(datos?.logros || []).map((item) => [item.titulo || '', item.nivel || '', item.descripcion || '']),
          t
        ),
      }
    )
  }

  return {
    metadatos: [
      [t('Plataforma', 'Platform'), 'Vyrox'],
      [t('Usuario', 'User'), construirNombreCompleto(usuario?.nombre, usuario?.apellidos)],
      [t('Rol', 'Role'), obtenerRolLegible(rolUsuario, t)],
      [t('Generado', 'Generated'), formatearFechaHora(idioma)],
    ],
    secciones,
  }
}

// Construye una hoja con filas simples para Excel real.
const crearHoja = (titulo, columnas, filas) => {
  const contenido = []
  if (columnas?.length) contenido.push(columnas)
  filas.forEach((fila) => contenido.push(fila))
  const hoja = XLSX.utils.aoa_to_sheet(contenido)
  hoja['!cols'] = (columnas || filas[0] || []).map(() => ({ wch: 24 }))
  return { titulo: limpiarTexto(titulo).slice(0, 31) || 'Hoja', hoja }
}

// Descarga el reporte en un archivo xlsx válido y compatible con Excel.
export const exportarReporteExcel = (contexto) => {
  const { metadatos, secciones } = construirSeccionesReporte(contexto)
  const libro = XLSX.utils.book_new()

  const hojaResumen = crearHoja('Resumen', [contexto.t('Campo', 'Field'), contexto.t('Valor', 'Value')], metadatos)
  XLSX.utils.book_append_sheet(libro, hojaResumen.hoja, hojaResumen.titulo)

  secciones.forEach((seccion, indice) => {
    const hoja = crearHoja(seccion.titulo || `Seccion ${indice + 1}`, seccion.columnas, seccion.filas)
    XLSX.utils.book_append_sheet(libro, hoja.hoja, hoja.titulo)
  })

  XLSX.writeFile(libro, crearNombreArchivo(contexto.rolUsuario, 'xlsx'))
}

// Dibuja un bloque de metadatos compacto al inicio del PDF.
const dibujarMetadatosPdf = (doc, metadatos) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Vyrox', 40, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let y = 74
  metadatos.forEach(([campo, valor]) => {
    doc.text(`${limpiarTexto(campo)}: ${limpiarTexto(valor)}`, 40, y)
    y += 14
  })

  return y + 10
}

// Descarga el reporte en PDF real con tablas ordenadas por sección.
export const exportarReportePdf = (contexto) => {
  const { metadatos, secciones } = construirSeccionesReporte(contexto)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let inicioY = dibujarMetadatosPdf(doc, metadatos)

  secciones.forEach((seccion, indice) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(limpiarTexto(seccion.titulo), 40, inicioY)

    autoTable(doc, {
      startY: inicioY + 12,
      head: [seccion.columnas],
      body: seccion.filas,
      theme: 'grid',
      margin: { left: 40, right: 40 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [34, 211, 238],
        textColor: [8, 15, 30],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 250, 255],
      },
    })

    inicioY = (doc.lastAutoTable?.finalY || 90) + 28
    if (indice < secciones.length - 1 && inicioY > 700) {
      doc.addPage()
      inicioY = 54
    }
  })

  doc.save(crearNombreArchivo(contexto.rolUsuario, 'pdf'))
}



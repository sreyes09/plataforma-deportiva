const limpiarTexto = (valor = '') =>
  String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const textoSeguro = (valor = '') =>
  limpiarTexto(valor)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')

const escaparXml = (valor = '') =>
  textoSeguro(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const escaparPdf = (valor = '') =>
  textoSeguro(valor)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const convertirNumero = (valor) => {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

const formatearFechaHora = (idioma = 'es') =>
  new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

const descargarArchivo = (blob, nombre) => {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const crearNombreArchivo = (rolUsuario, tipo) => {
  const fecha = new Date().toISOString().slice(0, 10)
  return `vyrox-reporte-${rolUsuario || 'usuario'}-${fecha}.${tipo}`
}

const construirSeccionesReporte = ({ usuario, rolUsuario, datos, contenido, t, idioma }) => {
  const resumen = []

  if (rolUsuario === 'administrador') {
    resumen.push(
      { campo: t('Usuarios', 'Users'), valor: contenido?.resumen?.usuarios ?? 0 },
      { campo: t('Deportistas', 'Athletes'), valor: contenido?.resumen?.deportistas ?? 0 },
      { campo: t('Entrenadores', 'Coaches'), valor: contenido?.resumen?.entrenadores ?? 0 },
      { campo: t('Activos', 'Active'), valor: contenido?.resumen?.activos ?? 0 },
    )
  } else if (rolUsuario === 'entrenador') {
    resumen.push(
      { campo: t('Deportistas vinculados', 'Linked athletes'), valor: contenido?.resumen?.deportistas ?? 0 },
      { campo: t('Sesiones', 'Sessions'), valor: contenido?.resumen?.sesiones ?? 0 },
      { campo: t('Alertas', 'Alerts'), valor: contenido?.resumen?.alertas ?? 0 },
      { campo: t('Competencias', 'Competitions'), valor: contenido?.resumen?.competencias ?? 0 },
    )
  } else {
    resumen.push(
      { campo: t('Estadísticas', 'Statistics'), valor: contenido?.resumen?.estadisticas ?? 0 },
      { campo: t('Sesiones', 'Sessions'), valor: contenido?.resumen?.sesiones ?? 0 },
      { campo: t('Metas', 'Goals'), valor: contenido?.resumen?.metas ?? 0 },
      { campo: t('Competencias', 'Competitions'), valor: contenido?.resumen?.competencias ?? 0 },
      { campo: t('Logros', 'Achievements'), valor: datos?.logros?.length ?? 0 },
    )
  }

  const secciones = [
    {
      titulo: t('Resumen general', 'General summary'),
      columnas: [t('Campo', 'Field'), t('Valor', 'Value')],
      filas: resumen.map((item) => [item.campo, String(item.valor)]),
    },
  ]

  if (rolUsuario === 'administrador') {
    secciones.push({
      titulo: t('Usuarios registrados', 'Registered users'),
      columnas: [t('Nombre', 'Name'), t('Correo', 'Email'), t('Rol', 'Role'), t('Estado', 'Status')],
      filas: (datos?.usuarios || []).map((item) => [
        item.nombreCompleto || [item.nombre, item.apellidos].filter(Boolean).join(' '),
        item.correo || '',
        item.rol || '',
        item.estado || '',
      ]),
    })
  }

  if (rolUsuario === 'entrenador') {
    secciones.push(
      {
        titulo: t('Deportistas vinculados', 'Linked athletes'),
        columnas: [t('Nombre', 'Name'), t('Correo', 'Email'), t('Disciplina', 'Discipline')],
        filas: (datos?.deportistas || []).map((item) => [item.nombre || '', item.correo || '', item.disciplina || '']),
      },
      {
        titulo: t('Sesiones asignadas', 'Assigned sessions'),
        columnas: [t('Tipo', 'Type'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Deportistas', 'Athletes')],
        filas: (datos?.sesiones || []).map((item) => [
          item.tipo || '',
          item.fecha || '',
          item.estado || '',
          (item.deportistas || []).map((persona) => persona.nombre || '').join(', '),
        ]),
      },
      {
        titulo: t('Metas creadas', 'Created goals'),
        columnas: [t('Título', 'Title'), t('Objetivo', 'Target'), t('Fecha límite', 'Due date'), t('Asignados', 'Assigned')],
        filas: (datos?.metas || []).map((item) => [
          item.titulo || item.metrica || '',
          String(item.objetivo ?? ''),
          item.fechaLimite || '',
          (item.asignaciones || []).length,
        ]),
      },
      {
        titulo: t('Competencias creadas', 'Created competitions'),
        columnas: [t('Nombre', 'Name'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Participantes', 'Participants')],
        filas: (datos?.competencias || []).map((item) => [
          item.nombre || '',
          item.fecha || '',
          item.estado || item.resultado || '',
          (item.deportistas || []).length,
        ]),
      },
      {
        titulo: t('Seguimiento', 'Tracking'),
        columnas: [t('Deportista', 'Athlete'), t('Prioridad', 'Priority'), t('Observación', 'Observation'), t('Fecha', 'Date')],
        filas: (datos?.observaciones || []).map((item) => [
          item.deportistaNombre || '',
          item.prioridad || '',
          item.nota || '',
          item.fecha || '',
        ]),
      },
    )
  }

  if (rolUsuario !== 'administrador') {
    secciones.push(
      {
        titulo: t('Estadísticas registradas', 'Logged statistics'),
        columnas: [t('Fecha', 'Date'), t('Disciplina', 'Discipline'), t('Métrica', 'Metric'), t('Valor', 'Value'), t('Contexto', 'Context')],
        filas: (datos?.estadisticas || []).map((item) => [
          item.fecha || '',
          item.disciplina || '',
          item.metrica || '',
          String(convertirNumero(item.valor)),
          item.competencia || item.contexto || '',
        ]),
      },
      {
        titulo: t('Metas', 'Goals'),
        columnas: [t('Título', 'Title'), t('Objetivo', 'Target'), t('Progreso', 'Progress'), t('Estado', 'Status'), t('Fecha límite', 'Due date')],
        filas: (datos?.metas || []).map((item) => [
          item.titulo || item.metrica || '',
          String(item.objetivo ?? ''),
          String(item.progreso ?? ''),
          item.estado || '',
          item.fechaLimite || '',
        ]),
      },
      {
        titulo: t('Sesiones', 'Sessions'),
        columnas: [t('Tipo', 'Type'), t('Fecha', 'Date'), t('Estado', 'Status'), t('Descripción', 'Description')],
        filas: (datos?.sesiones || []).map((item) => [item.tipo || '', item.fecha || '', item.estado || '', item.descripcion || '']),
      },
      {
        titulo: t('Competencias', 'Competitions'),
        columnas: [t('Nombre', 'Name'), t('Fecha', 'Date'), t('Ubicación', 'Location'), t('Estado', 'Status')],
        filas: (datos?.competencias || []).map((item) => [item.nombre || '', item.fecha || '', item.ubicacion || '', item.estado || item.resultado || '']),
      },
      {
        titulo: t('Logros y reconocimientos', 'Achievements and recognitions'),
        columnas: [t('Título', 'Title'), t('Nivel', 'Level'), t('Descripción', 'Description')],
        filas: (datos?.logros || []).map((item) => [item.titulo || '', item.nivel || '', item.descripcion || '']),
      },
    )
  }

  return {
    metadatos: [
      [t('Plataforma', 'Platform'), 'Vyrox'],
      [t('Usuario', 'User'), [usuario?.nombre, usuario?.apellidos].filter(Boolean).join(' ')],
      [t('Rol', 'Role'), rolUsuario],
      [t('Generado', 'Generated'), formatearFechaHora(idioma)],
    ],
    secciones: secciones.map((seccion) => ({
      ...seccion,
      filas: seccion.filas.length > 0 ? seccion.filas : [[t('Sin registros disponibles', 'No records available')]],
    })),
  }
}

const construirXmlExcel = ({ metadatos, secciones }) => {
  const hojas = [
    {
      titulo: 'Resumen',
      columnas: ['Campo', 'Valor'],
      filas: metadatos,
    },
    ...secciones,
  ]

  const worksheets = hojas
    .map((hoja) => {
      const nombre = escaparXml(hoja.titulo.slice(0, 31) || 'Hoja')
      const encabezado = (hoja.columnas || [])
        .map((columna) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escaparXml(columna)}</Data></Cell>`)
        .join('')
      const filas = (hoja.filas || [])
        .map(
          (fila) =>
            '<Row>' +
            fila
              .map((celda) => `<Cell><Data ss:Type="String">${escaparXml(celda)}</Data></Cell>`)
              .join('') +
            '</Row>'
        )
        .join('')

      return `<Worksheet ss:Name="${nombre}"><Table><Row>${encabezado}</Row>${filas}</Table></Worksheet>`
    })
    .join('')

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="header">
    <Font ss:Bold="1"/>
    <Interior ss:Color="#D9F5FF" ss:Pattern="Solid"/>
  </Style>
</Styles>
${worksheets}
</Workbook>`
}

const convertirALatin1 = (texto) =>
  Uint8Array.from(Array.from(textoSeguro(texto)).map((char) => {
    const code = char.charCodeAt(0)
    return code <= 255 ? code : 63
  }))

const construirPdf = ({ metadatos, secciones }) => {
  const lineas = ['VYROX', '', ...metadatos.map((fila) => `${fila[0]}: ${fila[1]}`), '']

  secciones.forEach((seccion) => {
    lineas.push(seccion.titulo)
    lineas.push(seccion.columnas.join(' | '))
    seccion.filas.forEach((fila) => {
      lineas.push(fila.map((item) => textoSeguro(item)).join(' | '))
    })
    lineas.push('')
  })

  const paginas = []
  const porPagina = 42
  for (let i = 0; i < lineas.length; i += porPagina) {
    paginas.push(lineas.slice(i, i + porPagina))
  }

  const objects = []
  objects[1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  let nextId = 3
  const pageIds = []

  paginas.forEach((pagina) => {
    const contenido = ['BT', '/F1 11 Tf', '40 780 Td']
    pagina.forEach((linea, indice) => {
      const prefijo = indice === 0 ? '' : 'T* '
      contenido.push(`${prefijo}(${escaparPdf(linea)}) Tj`)
    })
    contenido.push('ET')
    const stream = contenido.join('\n')
    const streamBytes = convertirALatin1(stream)
    const contentId = nextId++
    const pageId = nextId++
    objects[contentId] = `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R >> >> /Contents ${contentId} 0 R >>`
    pageIds.push(pageId)
  })

  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`
  const catalogId = nextId
  objects[catalogId] = '<< /Type /Catalog /Pages 2 0 R >>'

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (let i = 1; i <= catalogId; i += 1) {
    offsets[i] = pdf.length
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const startxref = pdf.length
  pdf += `xref\n0 ${catalogId + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i <= catalogId; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startxref}\n%%EOF`
  return convertirALatin1(pdf)
}

export const exportarReporteExcel = (contexto) => {
  const reporte = construirSeccionesReporte(contexto)
  const xml = construirXmlExcel(reporte)
  descargarArchivo(
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    crearNombreArchivo(contexto.rolUsuario, 'xls')
  )
}

export const exportarReportePdf = (contexto) => {
  const reporte = construirSeccionesReporte(contexto)
  const pdf = construirPdf(reporte)
  descargarArchivo(new Blob([pdf], { type: 'application/pdf' }), crearNombreArchivo(contexto.rolUsuario, 'pdf'))
}

const mongoose = require('mongoose');
const Panel = require('../modelos/Panel');
const Usuario = require('../modelos/Usuario');

// Normaliza el rol para evitar fallos por mayusculas, espacios o datos viejos.
const obtenerRolSeguro = (valor) => String(valor || '').trim().toLowerCase();

// Crea la estructura inicial del panel para cada rol del sistema.
const crearPanelBase = (usuario) => {
  const rol = obtenerRolSeguro(usuario.rol);

  if (rol === 'administrador') {
    return {
      usuarioId: usuario._id,
      rol,
      perfil: {
        nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
        foto: '',
        cargo: 'Administrador general',
        area: 'Gestion de plataforma',
        bio: '',
      },
      competencias: [],
      deportistas: [],
      sesiones: [],
      observaciones: [],
      estadisticas: [],
      metas: [],
      logros: [],
    };
  }

  if (rol === 'entrenador') {
    return {
      usuarioId: usuario._id,
      rol,
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
    };
  }

    return {
    usuarioId: usuario._id,
    rol,
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
  };
};

// Convierte subdocumentos de Mongo en objetos listos para el frontend.
const mapearDocumento = (item, extras = {}) => ({
  id: item._id?.toString(),
  ...item.toObject(),
  ...extras,
});

// Normaliza la referencia de deportistas vinculados para trabajarla en la UI.
const mapearDeportista = (item) => ({
  id: item.deportistaId?.toString() || item.id?.toString() || '',
  nombre: item.nombre,
  correo: item.correo,
  disciplina: item.disciplina || '',
  progreso: item.progreso || 0,
  metaActiva: item.metaActiva || '',
});

// Elimina ids repetidos y los transforma en ObjectId validos.
const asegurarIdsUnicos = (ids = []) => {
  const unicos = new Set(
    ids
      .filter(Boolean)
      .map((item) => item.toString())
  );

  return [...unicos].map((id) => new mongoose.Types.ObjectId(id));
};

// Completa nombres e ids cada vez que un entrenador asigna recursos a deportistas.
const normalizarAsignacion = (item, referenciaDeportistas) => {
  const asignados = asegurarIdsUnicos(item.asignados);
  const asignadoNombres = asignados
    .map((id) => referenciaDeportistas.find((deportista) => deportista.deportistaId.toString() === id.toString()))
    .filter(Boolean)
    .map((deportista) => deportista.nombre);

  return {
    ...item,
    asignados,
    asignadoNombres,
  };
};

const calcularEstadoMeta = (asignaciones = []) => {
  if (asignaciones.length === 0) return 'en progreso';
  const completadas = asignaciones.filter(
    (item) => item.estado === 'completada' || item.progreso >= item.objetivo
  ).length;

  if (completadas === asignaciones.length) return 'completada';
  if (completadas > 0) return 'parcial';
  return 'en progreso';
};

const construirAsignacionesMeta = (meta, referenciaDeportistas) => {
  const ids = asegurarIdsUnicos(meta.asignados);

  return ids
    .map((id) => {
      const deportista = referenciaDeportistas.find(
        (item) => item.deportistaId.toString() === id.toString()
      );
      if (!deportista) return null;

      const existente = (meta.asignaciones || []).find(
        (item) => item.deportistaId?.toString() === id.toString()
      );

      return {
        deportistaId: id,
        nombre: deportista.nombre,
        progreso: Number(existente?.progreso) || 0,
        objetivo: Number(existente?.objetivo) || Number(meta.objetivo) || 0,
        estado:
          existente?.estado ||
          ((Number(existente?.progreso) || 0) >= (Number(existente?.objetivo) || Number(meta.objetivo) || 0)
            ? 'completada'
            : 'en progreso'),
      };
    })
    .filter(Boolean);
};

const migrarPanel = async (panel, usuario) => {
  if (!panel) return panel;

  const base = crearPanelBase(usuario);
  let cambio = false;
  const rol = obtenerRolSeguro(usuario.rol);

  panel.rol = rol;
  panel.perfil = {
    ...base.perfil,
    ...(panel.perfil || {}),
    nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
  };

  if (rol === 'deportista' && Object.prototype.hasOwnProperty.call(panel.perfil, 'posicion')) {
    delete panel.perfil.posicion;
    cambio = true;
  }

  panel.estadisticas = Array.isArray(panel.estadisticas) ? panel.estadisticas : [];
  panel.metas = Array.isArray(panel.metas) ? panel.metas : [];
  panel.logros = Array.isArray(panel.logros) ? panel.logros : [];
  panel.competencias = Array.isArray(panel.competencias) ? panel.competencias : [];
  panel.deportistas = Array.isArray(panel.deportistas) ? panel.deportistas : [];
  panel.sesiones = Array.isArray(panel.sesiones) ? panel.sesiones : [];
  panel.observaciones = Array.isArray(panel.observaciones) ? panel.observaciones : [];

  if (rol === 'entrenador') {
    const correos = new Set();
    const deportistasMigrados = [];

    for (const item of panel.deportistas) {
      const deportistaId = item.deportistaId || item.id;
      const correo = (item.correo || '').trim().toLowerCase();

      if (!deportistaId || !correo || correos.has(correo)) {
        cambio = true;
        continue;
      }

      correos.add(correo);
      deportistasMigrados.push({
        deportistaId,
        nombre: item.nombre || '',
        correo,
        disciplina: item.disciplina || '',
        progreso: Number(item.progreso) || 0,
        metaActiva: item.metaActiva || '',
      });
    }

    if (deportistasMigrados.length !== panel.deportistas.length) {
      cambio = true;
    }

    panel.deportistas = deportistasMigrados;

    const referenciaDeportistas = deportistasMigrados
      .filter((item) => item.deportistaId)
      .map((item) => ({
        deportistaId: item.deportistaId,
        nombre: item.nombre,
        correo: item.correo,
        disciplina: item.disciplina,
        progreso: item.progreso,
        metaActiva: item.metaActiva,
      }));

    panel.metas = panel.metas.map((meta) => {
      const asignados = (meta.asignados || [])
        .map((item) => item?.toString?.() || item)
        .filter(Boolean);
      const asignacionesPrevias = Array.isArray(meta.asignaciones) ? meta.asignaciones : [];
      const asignaciones = construirAsignacionesMeta(
        {
          ...meta.toObject(),
          asignados,
          asignaciones: asignacionesPrevias.length
            ? asignacionesPrevias
            : asignados.map((deportistaId) => ({
                deportistaId,
                progreso: Number(meta.progreso) || 0,
                objetivo: Number(meta.objetivo) || 0,
                estado: meta.estado || 'en progreso',
              })),
        },
        referenciaDeportistas
      );

      if (!Array.isArray(meta.asignaciones) || meta.asignaciones.length !== asignaciones.length) {
        cambio = true;
      }

      return {
        ...meta.toObject(),
        titulo: meta.titulo || '',
        descripcion: meta.descripcion || '',
        objetivo: Number(meta.objetivo) || 0,
        fechaLimite: meta.fechaLimite || '',
        asignados: asegurarIdsUnicos(asignados),
        asignadoNombres: asignaciones.map((item) => item.nombre),
        asignaciones,
        estado: calcularEstadoMeta(asignaciones),
      };
    });
  }

  if (cambio) {
    panel.markModified('perfil');
    panel.markModified('deportistas');
    panel.markModified('metas');
    panel.markModified('estadisticas');
    panel.markModified('logros');
    panel.markModified('competencias');
    panel.markModified('sesiones');
    panel.markModified('observaciones');
    await panel.save();
  }

  return panel;
};

const sanitizarPanelEntrenador = (datos, panelActual) => {
  const referenciaDeportistas = (datos.deportistas || panelActual.deportistas || []).map((deportista) => ({
    deportistaId: deportista.deportistaId || deportista.id,
    nombre: deportista.nombre || '',
    correo: deportista.correo || '',
    disciplina: deportista.disciplina || '',
    progreso: Number(deportista.progreso) || 0,
    metaActiva: deportista.metaActiva || '',
  })).filter((deportista) => deportista.deportistaId);

  return {
    perfil: {
      ...panelActual.perfil,
      ...(datos.perfil || {}),
    },
    deportistas: referenciaDeportistas,
    estadisticas: [],
    logros: Array.isArray(datos.logros) ? datos.logros : [],
    metas: Array.isArray(datos.metas)
      ? datos.metas.map((meta) => {
        const normalizada = normalizarAsignacion({
          titulo: meta.titulo || '',
          descripcion: meta.descripcion || '',
          objetivo: Number(meta.objetivo) || 0,
          fechaLimite: meta.fechaLimite || '',
          asignados: meta.asignados || [],
        }, referenciaDeportistas);
        const asignaciones = construirAsignacionesMeta(meta, referenciaDeportistas);

        return {
          ...normalizada,
          objetivo: Number(meta.objetivo) || 0,
          asignaciones,
          estado: calcularEstadoMeta(asignaciones),
        };
      })
      : [],
    sesiones: Array.isArray(datos.sesiones)
      ? datos.sesiones.map((sesion) => normalizarAsignacion({
        fecha: sesion.fecha || '',
        tipo: sesion.tipo || '',
        descripcion: sesion.descripcion || '',
        estado: sesion.estado || 'Programada',
        asignados: sesion.asignados || [],
      }, referenciaDeportistas))
      : [],
    competencias: Array.isArray(datos.competencias)
      ? datos.competencias.map((competencia) => normalizarAsignacion({
        nombre: competencia.nombre || '',
        fecha: competencia.fecha || '',
        estado: competencia.estado || '',
        ubicacion: competencia.ubicacion || '',
        resultado: competencia.resultado || '',
        inscritos: Number(competencia.inscritos) || 0,
        asignados: competencia.asignados || [],
      }, referenciaDeportistas))
      : [],
    observaciones: Array.isArray(datos.observaciones)
      ? datos.observaciones.map((item) => ({
        deportistaId: item.deportistaId || null,
        deportista: item.deportista || '',
        nota: item.nota || '',
        prioridad: item.prioridad || 'media',
      }))
      : [],
  };
};

const construirAsignacionDeportista = (item, entrenador) => ({
  id: item._id.toString(),
  entrenadorId: entrenador.usuarioId.toString(),
  entrenadorNombre: entrenador.perfil?.nombreCompleto || 'Entrenador',
  ...item.toObject(),
  asignados: item.asignados?.map((id) => id.toString()) || [],
});

// Genera logros autom?ticos a partir de metas completadas para reforzar la motivaci?n del deportista.
const construirLogrosDesdeMetas = (metasAsignadas) =>
  metasAsignadas
    .filter((meta) => meta.estado === 'completada' || meta.progreso >= meta.objetivo)
    .map((meta) => {
      const objetivo = Number(meta.objetivo) || 0
      const progreso = Number(meta.progreso) || 0
      const porcentaje = objetivo > 0 ? Math.round((progreso / objetivo) * 100) : 100

      let nivel = 'bronce'
      if (porcentaje >= 150) nivel = 'diamante'
      else if (porcentaje >= 120) nivel = 'oro'
      else if (porcentaje >= 100) nivel = 'plata'

      return {
        id: `logro-${meta.id}` ,
        titulo: `Meta completada: ${meta.titulo}` ,
        descripcion: `Asignada por ${meta.entrenadorNombre}. Avance final: ${progreso}/${objetivo || progreso}.`,
        nivel,
        badge: 'meta-cumplida',
        porcentaje,
      }
    });

const normalizarPanelAdministrador = async (panel) => {
  const usuarios = await Usuario.find({})
    .sort({ fechaRegistro: -1 })
    .lean();
  const paneles = await Panel.find({}).lean();
  const panelPorUsuario = new Map(
    paneles.map((item) => [item.usuarioId?.toString?.() || '', item])
  );

  const usuariosNormalizados = usuarios.map((usuario) => {
    const panelUsuario = panelPorUsuario.get(usuario._id.toString()) || {};
    const estadisticas = Array.isArray(panelUsuario.estadisticas) ? panelUsuario.estadisticas.length : 0;
    const metas = Array.isArray(panelUsuario.metas) ? panelUsuario.metas.length : 0;
    const sesiones = Array.isArray(panelUsuario.sesiones) ? panelUsuario.sesiones.length : 0;
    const competencias = Array.isArray(panelUsuario.competencias) ? panelUsuario.competencias.length : 0;

    return {
      id: usuario._id.toString(),
      nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`.trim(),
      correo: usuario.correo,
      rol: usuario.rol,
      estado: usuario.estado || 'activo',
      fechaRegistro: usuario.fechaRegistro,
      perfil: panelUsuario.perfil || {},
      resumen: {
        estadisticas,
        metas,
        sesiones,
        competencias,
      },
    };
  });

  const resumen = {
    usuarios: usuariosNormalizados.length,
    deportistas: usuariosNormalizados.filter((item) => item.rol === 'deportista').length,
    entrenadores: usuariosNormalizados.filter((item) => item.rol === 'entrenador').length,
    administradores: usuariosNormalizados.filter((item) => item.rol === 'administrador').length,
    activos: usuariosNormalizados.filter((item) => item.estado === 'activo').length,
    inactivos: usuariosNormalizados.filter((item) => item.estado === 'inactivo').length,
    estadisticas: usuariosNormalizados.reduce((acum, item) => acum + item.resumen.estadisticas, 0),
    metas: usuariosNormalizados.reduce((acum, item) => acum + item.resumen.metas, 0),
    sesiones: usuariosNormalizados.reduce((acum, item) => acum + item.resumen.sesiones, 0),
    competencias: usuariosNormalizados.reduce((acum, item) => acum + item.resumen.competencias, 0),
  };

  const actividad = usuariosNormalizados
    .slice()
    .sort((a, b) => {
      const totalA = a.resumen.estadisticas + a.resumen.metas + a.resumen.sesiones + a.resumen.competencias;
      const totalB = b.resumen.estadisticas + b.resumen.metas + b.resumen.sesiones + b.resumen.competencias;
      return totalB - totalA;
    })
    .slice(0, 8);

  return {
    rol: panel.rol,
    perfil: panel.perfil || {},
    estadisticas: [],
    metas: [],
    logros: [],
    competencias: [],
    deportistas: [],
    sesiones: [],
    observaciones: [],
    usuarios: usuariosNormalizados,
    resumenAdmin: resumen,
    actividadAdmin: actividad,
  };
};

const sincronizarMetasDeportista = async (usuarioId, metas = []) => {
  const metasPorId = new Map(
    (metas || [])
      .filter((meta) => meta?.id)
      .map((meta) => [meta.id.toString(), meta])
  );

  if (metasPorId.size === 0) return;

  const entrenadores = await Panel.find({
    rol: 'entrenador',
    'metas.asignados': usuarioId,
  });

  for (const entrenador of entrenadores) {
    let cambio = false;

    entrenador.metas = entrenador.metas.map((meta) => {
      const metaActualizada = metasPorId.get(meta._id.toString());
      if (!metaActualizada) {
        return meta;
      }

      const asignaciones = (meta.asignaciones || []).map((asignacion) => {
        if (asignacion.deportistaId.toString() !== usuarioId.toString()) {
          return asignacion;
        }

        cambio = true;
        const progreso = Number(metaActualizada.progreso) || 0;
        const objetivo = Number(metaActualizada.objetivo || asignacion.objetivo) || 0;
        const estado =
          metaActualizada.estado ||
          (progreso >= objetivo && objetivo > 0 ? 'completada' : 'en progreso');

        return {
          ...asignacion.toObject?.() || asignacion,
          progreso,
          objetivo,
          estado,
        };
      });

      return {
        ...meta.toObject(),
        asignaciones,
        estado: calcularEstadoMeta(asignaciones),
      };
    });

    if (cambio) {
      entrenador.markModified('metas');
      await entrenador.save();
    }
  }
};

const normalizarPanelEntrenador = async (panel) => {
  const ids = panel.deportistas
    .map((item) => item.deportistaId || item.id)
    .filter(Boolean);
  const panelesDeportistas = await Panel.find({ usuarioId: { $in: ids } });
  const mapaPaneles = new Map(
    panelesDeportistas.map((item) => [item.usuarioId.toString(), item])
  );

  return {
    rol: panel.rol,
    perfil: panel.perfil || {},
    estadisticas: [],
    metas: panel.metas.map((item) => ({
      ...mapearDocumento(item),
      asignados: item.asignados?.map((id) => id.toString()) || [],
      asignaciones: (item.asignaciones || []).map((asignacion) => ({
        deportistaId: asignacion.deportistaId?.toString() || '',
        nombre: asignacion.nombre,
        progreso: asignacion.progreso,
        objetivo: asignacion.objetivo,
        estado: asignacion.estado,
      })),
    })),
    logros: panel.logros.map((item) => mapearDocumento(item)),
    competencias: panel.competencias.map((item) => ({
      ...mapearDocumento(item),
      asignados: item.asignados?.map((id) => id.toString()) || [],
    })),
    deportistas: panel.deportistas
      .map((item) => {
      const deportistaId = item.deportistaId?.toString() || item.id?.toString() || '';
      if (!deportistaId) return null;
      const panelDeportista = mapaPaneles.get(deportistaId);
      return {
        ...mapearDeportista(item),
        disciplina: panelDeportista?.perfil?.disciplina || item.disciplina || '',
        progreso: panelDeportista?.estadisticas?.length || item.progreso || 0,
      };
    })
      .filter(Boolean),
    sesiones: panel.sesiones.map((item) => ({
      ...mapearDocumento(item),
      asignados: item.asignados?.map((id) => id.toString()) || [],
    })),
    observaciones: panel.observaciones.map((item) => ({
      ...mapearDocumento(item),
      deportistaId: item.deportistaId?.toString() || '',
    })),
  };
};

const normalizarPanelDeportista = async (panel, usuarioId) => {
  const usuarioIdTexto = usuarioId.toString();
  const nombreDeportista = String(panel.perfil?.nombreCompleto || '').trim().toLowerCase();
  const entrenadores = await Panel.find({
    rol: 'entrenador',
    $or: [
      { 'deportistas.deportistaId': usuarioId },
      { 'metas.asignados': usuarioId },
      { 'sesiones.asignados': usuarioId },
      { 'competencias.asignados': usuarioId },
      { 'observaciones.deportistaId': usuarioId },
    ],
  });

  const metasAsignadas = entrenadores.flatMap((entrenador) =>
    entrenador.metas
      .map((meta) => {
        const asignacion = (meta.asignaciones || []).find(
          (item) => item.deportistaId.toString() === usuarioId.toString()
        );
        if (!asignacion) return null;
        return {
          ...construirAsignacionDeportista(meta, entrenador),
          progreso: asignacion.progreso,
          objetivo: asignacion.objetivo,
          estado: asignacion.estado,
        };
      })
      .filter(Boolean)
  );

  const sesionesAsignadas = entrenadores.flatMap((entrenador) =>
    entrenador.sesiones
      .filter((sesion) => sesion.asignados.some((id) => id.toString() === usuarioId.toString()))
      .map((sesion) => construirAsignacionDeportista(sesion, entrenador))
  );

  const competenciasAsignadas = entrenadores.flatMap((entrenador) =>
    entrenador.competencias
      .filter((competencia) => competencia.asignados.some((id) => id.toString() === usuarioId.toString()))
      .map((competencia) => construirAsignacionDeportista(competencia, entrenador))
  );

  const observacionesAsignadas = entrenadores.flatMap((entrenador) =>
    entrenador.observaciones
      .filter((observacion) => {
        const observacionId = observacion.deportistaId?.toString?.() || String(observacion.deportistaId || '');
        const observacionNombre = String(observacion.deportista || '').trim().toLowerCase();
        return observacionId === usuarioIdTexto || (!!nombreDeportista && observacionNombre === nombreDeportista);
      })
      .map((observacion) => ({
        ...mapearDocumento(observacion),
        deportistaId: observacion.deportistaId?.toString() || '',
        entrenadorId: entrenador.usuarioId.toString(),
        entrenadorNombre: entrenador.perfil?.nombreCompleto || 'Entrenador',
      }))
  );

  const logros = [
    ...panel.logros.map((item) => mapearDocumento(item)),
    ...construirLogrosDesdeMetas(metasAsignadas),
  ];

  return {
    rol: panel.rol,
    perfil: panel.perfil || {},
    estadisticas: panel.estadisticas.map((item) => mapearDocumento(item)),
    metas: metasAsignadas,
    logros,
    competencias: competenciasAsignadas,
    deportistas: [],
    sesiones: sesionesAsignadas,
    observaciones: observacionesAsignadas.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
  };
};

const obtenerPanelBase = async (usuario) => {
  let panel = await Panel.findOne({ usuarioId: usuario._id });

  if (!panel) {
    panel = await Panel.create(crearPanelBase(usuario));
  }

  return migrarPanel(panel, usuario);
};

const obtenerPanel = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const panel = await obtenerPanelBase(usuario);

    const rol = obtenerRolSeguro(usuario.rol);

    if (rol === 'administrador') {
      return res.json(await normalizarPanelAdministrador(panel));
    }

    if (rol === 'entrenador') {
      return res.json(await normalizarPanelEntrenador(panel));
    }

    return res.json(await normalizarPanelDeportista(panel, usuario._id));
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener el panel', error: error.message });
  }
};

const actualizarPanel = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const panelActual = await obtenerPanelBase(usuario);
    const datos = req.body || {};

    const rol = obtenerRolSeguro(usuario.rol);

    if (rol === 'administrador') {
      const panel = await Panel.findOneAndUpdate(
        { usuarioId: usuario._id },
        {
          $set: {
            rol,
            perfil: {
              ...panelActual.perfil,
              ...(datos.perfil || {}),
              nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
            },
          },
        },
        { new: true, runValidators: true }
      );

      return res.json(await normalizarPanelAdministrador(panel));
    }

    if (rol === 'entrenador') {
      const actualizacion = sanitizarPanelEntrenador(datos, panelActual);

      const panel = await Panel.findOneAndUpdate(
        { usuarioId: usuario._id },
        {
          $set: {
            rol,
            ...actualizacion,
            perfil: {
              ...actualizacion.perfil,
              nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
            },
          },
        },
        { new: true, runValidators: true }
      );

      return res.json(await normalizarPanelEntrenador(panel));
    }

    const panel = await Panel.findOneAndUpdate(
      { usuarioId: usuario._id },
      {
        $set: {
          rol,
          perfil: {
            ...panelActual.perfil,
            ...(datos.perfil || {}),
            nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
          },
          estadisticas: Array.isArray(datos.estadisticas)
            ? datos.estadisticas.map((item) => ({
              fecha: item.fecha || '',
              disciplina: item.disciplina || '',
              metrica: item.metrica || '',
              valor: Number(item.valor) || 0,
              competencia: item.competencia || '',
            }))
            : [],
          logros: Array.isArray(datos.logros)
            ? datos.logros.map((item) => ({
              titulo: item.titulo || '',
              descripcion: item.descripcion || '',
              nivel: item.nivel || 'bronce',
            }))
            : panelActual.logros,
        },
      },
      { new: true, runValidators: true }
    );

    await sincronizarMetasDeportista(usuario._id, datos.metas);

    return res.json(await normalizarPanelDeportista(panel, usuario._id));
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al guardar el panel', error: error.message });
  }
};

const vincularDeportista = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    const correo = req.body?.correo?.trim()?.toLowerCase();

    if (!usuario || obtenerRolSeguro(usuario.rol) !== 'entrenador') {
      return res.status(403).json({ mensaje: 'Solo los entrenadores pueden vincular deportistas' });
    }

    if (!correo) {
      return res.status(400).json({ mensaje: 'Debes indicar el correo del deportista' });
    }

    const deportista = await Usuario.findOne({ correo, rol: 'deportista' });

    if (!deportista) {
      return res.status(404).json({ mensaje: 'No existe un deportista registrado con ese correo' });
    }

    const panelEntrenador = await obtenerPanelBase(usuario);

    const yaVinculado = panelEntrenador.deportistas.some(
      (item) => item.deportistaId.toString() === deportista._id.toString()
    );

    if (yaVinculado) {
      return res.status(400).json({ mensaje: 'Ese deportista ya esta vinculado a tu panel' });
    }

    const panelDeportista = await obtenerPanelBase(deportista);

    panelEntrenador.deportistas.push({
      deportistaId: deportista._id,
      nombre: `${deportista.nombre} ${deportista.apellidos}`,
      correo: deportista.correo,
      disciplina: panelDeportista.perfil?.disciplina || '',
      progreso: panelDeportista.estadisticas.length,
      metaActiva: '',
    });

    await panelEntrenador.save();

    return res.status(201).json(await normalizarPanelEntrenador(panelEntrenador));
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al vincular deportista', error: error.message });
  }
};

const actualizarEstadoUsuario = async (req, res) => {
  try {
    const administrador = await Usuario.findById(req.usuario.id);
    const { usuarioId } = req.params;
    const { estado } = req.body || {};

    if (!administrador || obtenerRolSeguro(administrador.rol) !== 'administrador') {
      return res.status(403).json({ mensaje: 'Solo los administradores pueden cambiar el estado de usuarios' });
    }

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ mensaje: 'El estado solicitado no es valido' });
    }

    if (administrador._id.toString() === usuarioId.toString() && estado === 'inactivo') {
      return res.status(400).json({ mensaje: 'No puedes desactivar tu propia cuenta de administrador' });
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      usuarioId,
      { $set: { estado } },
      { new: true }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const panelAdmin = await obtenerPanelBase(administrador);
    return res.json(await normalizarPanelAdministrador(panelAdmin));
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al actualizar el estado del usuario', error: error.message });
  }
};

module.exports = {
  obtenerPanel,
  actualizarPanel,
  vincularDeportista,
  actualizarEstadoUsuario,
};

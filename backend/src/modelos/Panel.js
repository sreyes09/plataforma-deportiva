const mongoose = require('mongoose');

// Subdocumento con la referencia minima de cada deportista vinculado al entrenador.
const referenciaDeportistaSchema = new mongoose.Schema(
  {
    deportistaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    nombre: { type: String, default: '' },
    correo: { type: String, default: '' },
    disciplina: { type: String, default: '' },
    progreso: { type: Number, default: 0 },
    metaActiva: { type: String, default: '' },
  },
  { _id: false }
);

// Subdocumento para cada registro estadistico individual del deportista.
const estadisticaSchema = new mongoose.Schema(
  {
    fecha: { type: String, default: '' },
    disciplina: { type: String, default: '' },
    metrica: { type: String, default: '' },
    valor: { type: Number, default: 0 },
    competencia: { type: String, default: '' },
  },
  { timestamps: true }
);

// Subdocumento para metas, incluyendo asignaciones individuales por deportista.
const metaSchema = new mongoose.Schema(
  {
    titulo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    objetivo: { type: Number, default: 0 },
    estado: { type: String, default: 'en progreso' },
    fechaLimite: { type: String, default: '' },
    asignados: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
      default: [],
    },
    asignadoNombres: {
      type: [String],
      default: [],
    },
    asignaciones: {
      type: [
        new mongoose.Schema(
          {
            deportistaId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Usuario',
              required: true,
            },
            nombre: { type: String, default: '' },
            progreso: { type: Number, default: 0 },
            objetivo: { type: Number, default: 0 },
            estado: { type: String, default: 'en progreso' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Subdocumento de logros o reconocimientos visibles en el panel.
const logroSchema = new mongoose.Schema(
  {
    titulo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    nivel: { type: String, default: 'bronce' },
  },
  { timestamps: true }
);

// Subdocumento para sesiones o entrenamientos programados por entrenador.
const sesionSchema = new mongoose.Schema(
  {
    fecha: { type: String, default: '' },
    tipo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    estado: { type: String, default: 'Programada' },
    asignados: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
      default: [],
    },
    asignadoNombres: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Subdocumento de observaciones de seguimiento sobre un deportista.
const observacionSchema = new mongoose.Schema(
  {
    deportistaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    deportista: { type: String, default: '' },
    nota: { type: String, default: '' },
    prioridad: { type: String, default: 'media' },
  },
  { timestamps: true }
);

// Subdocumento para competencias o eventos deportivos asignados.
const competenciaSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    fecha: { type: String, default: '' },
    estado: { type: String, default: '' },
    ubicacion: { type: String, default: '' },
    resultado: { type: String, default: '' },
    inscritos: { type: Number, default: 0 },
    asignados: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
      default: [],
    },
    asignadoNombres: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Documento principal del panel.
// Reune toda la informacion operativa del usuario segun su rol.
const panelSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      unique: true,
      index: true,
    },
    rol: {
      type: String,
      enum: ['deportista', 'entrenador', 'administrador'],
      required: true,
    },
    perfil: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    estadisticas: {
      type: [estadisticaSchema],
      default: [],
    },
    metas: {
      type: [metaSchema],
      default: [],
    },
    logros: {
      type: [logroSchema],
      default: [],
    },
    competencias: {
      type: [competenciaSchema],
      default: [],
    },
    deportistas: {
      type: [referenciaDeportistaSchema],
      default: [],
    },
    sesiones: {
      type: [sesionSchema],
      default: [],
    },
    observaciones: {
      type: [observacionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Exporta un unico panel por usuario autenticado.
module.exports = mongoose.model('Panel', panelSchema);

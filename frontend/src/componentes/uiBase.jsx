import { useUI } from '../contexto/useUI'

// Tarjeta base reutilizable para login, registro y dashboard.
export function Superficie({ children, className = '' }) {
  const { esOscuro } = useUI()

  return (
    <div
      className={[
        'rounded-[28px] border p-6 shadow-2xl backdrop-blur-xl transition-all',
        esOscuro
          ? 'border-white/10 bg-slate-900/72 shadow-slate-950/35'
          : 'border-slate-200/80 bg-white/88 shadow-cyan-950/10',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

// Botón principal con más contraste y relieve para evitar que la UI se vea plana.
export function BotonPrimario({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={[
        'rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// Variante secundaria para acciones menos críticas.
export function BotonSecundario({ children, className = '', ...props }) {
  const { esOscuro } = useUI()

  return (
    <button
      {...props}
      className={[
        'rounded-2xl px-5 py-3 font-semibold transition duration-200 hover:-translate-y-0.5',
        esOscuro
          ? 'border border-white/14 bg-white/6 text-slate-100 hover:bg-white/10'
          : 'border border-cyan-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(235,247,255,0.96))] text-slate-800 shadow-[0_12px_24px_rgba(14,116,144,0.12)] hover:border-cyan-500 hover:bg-white',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// Entrada visual unificada para mantener consistencia entre formularios.
export function CampoEntrada({ className = '', ...props }) {
  const { esOscuro } = useUI()

  return (
    <input
      {...props}
      className={[
        'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4',
        esOscuro
          ? 'border-white/10 bg-slate-950/70 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/15'
          : 'border-slate-300 bg-white/85 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/15',
        className,
      ].join(' ')}
    />
  )
}

// Select visual compartido para no mezclar estilos distintos en la app.
export function SelectEntrada({ className = '', children, ...props }) {
  const { esOscuro } = useUI()

  return (
    <select
      {...props}
      className={[
        'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4',
        esOscuro
          ? 'border-white/10 bg-slate-950/70 text-white focus:border-cyan-400 focus:ring-cyan-400/15'
          : 'border-slate-300 bg-white/85 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500/15',
        className,
      ].join(' ')}
    >
      {children}
    </select>
  )
}

// Etiqueta pequeña para la barra superior del dashboard y pantallas públicas.
export function ControlPreferencia({ etiqueta, valor, onClick }) {
  const { esOscuro } = useUI()

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] transition',
        esOscuro
          ? 'border-white/12 bg-white/6 text-slate-200 hover:bg-white/10'
          : 'border-cyan-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(237,248,255,0.94))] text-slate-800 shadow-[0_10px_24px_rgba(14,116,144,0.12)] hover:border-cyan-500 hover:bg-white',
      ].join(' ')}
    >
      {etiqueta}: {valor}
    </button>
  )
}

// Spinner simple para marcar las consultas a backend de una forma más visual.
export function IndicadorCarga({ texto }) {
  const { esOscuro } = useUI()

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={[
          'inline-flex h-5 w-5 animate-spin rounded-full border-2 border-transparent',
          esOscuro ? 'border-t-cyan-300 border-r-cyan-500' : 'border-t-cyan-500 border-r-blue-600',
        ].join(' ')}
      />
      <span className={esOscuro ? 'text-slate-200' : 'text-slate-700'}>{texto}</span>
    </div>
  )
}

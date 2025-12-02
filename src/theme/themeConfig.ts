/**
 * CLINISCRIBE DESIGN TOKENS - SYSTEM "PULSE"
 * Fuente de la verdad para colores y estilos.
 * IMPORTANTE: Este archivo DEBE exportar 'BUTTON_VARIANTS'.
 */

export const COLORS = {
  // BRAND: Identidad principal (Suscripciones, Login, Marca)
  brand: {
    primary: 'indigo-600',
    secondary: 'purple-600',
    gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    hover: 'from-indigo-500 to-purple-500',
    light: 'indigo-50',
    dark: 'indigo-900',
  },

  // CLINICAL: Acciones médicas (Generar nota, herramientas)
  clinical: {
    primary: 'sky-600', // El "Azul Médico" estándar
    hover: 'sky-500',
    light: 'sky-50',
    text: 'sky-700',
    darkText: 'sky-300',
  },

  // FUNCTIONAL: Estados del sistema
  functional: {
    success: 'emerald-500', // Audio grabado, éxito
    warning: 'amber-500',   // Alertas medias, features Pro
    danger:  'rose-600',    // Borrar, Stop, Red Flags
    dangerHover: 'rose-500',
    neutral: 'slate-500',
  },

  // UI: Fondos y bordes
  ui: {
    bgLight: 'bg-slate-50',
    bgDark: 'bg-[#0f1115]', // Tu negro azulado profundo actual
    cardLight: 'bg-white',
    cardDark: 'bg-[#1e293b]', // Slate-800
    borderLight: 'border-slate-200',
    borderDark: 'border-slate-800',
  }
};

// --- EXPORTACIÓN CRÍTICA PARA EL BOTÓN ---
export const BUTTON_VARIANTS = {
  // Para acciones principales de marketing/sistema (Login, Upgrade)
  brand: `bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 border-none`,
  
  // Para la acción principal diaria (Generar Nota)
  clinical: `bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20 border-none`,
  
  // Para acciones destructivas (Borrar, Detener)
  danger: `bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 border-none`,
  
  // Para acciones secundarias (Cancelar, Volver)
  ghost: `bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent`,
  
  // Para bordes (Filtros inactivos)
  outline: `bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300`,
};
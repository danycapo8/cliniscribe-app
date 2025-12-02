import React from 'react';
// Rutas relativas ajustadas para estar en src/DesignSystem.tsx
import { Button } from './components/Button';
import { SparklesIcon, TrashIcon, CheckCircleIcon, AlertTriangleIcon, XIcon } from './components/icons';

// Definición local de colores para visualización rápida
const COLORS_PREVIEW = [
  { name: "Brand Primary", class: "bg-indigo-600", hex: "#4F46E5", usage: "Marketing, IA, Premium" },
  { name: "Clinical Action", class: "bg-sky-600", hex: "#0284C7", usage: "Generar, Guardar" },
  { name: "Functional Danger", class: "bg-rose-600", hex: "#E11D48", usage: "Borrar, Detener, Alerta" },
  { name: "Functional Success", class: "bg-emerald-500", hex: "#10B981", usage: "Grabando, Éxito" },
  { name: "Functional Warning", class: "bg-amber-500", hex: "#F59E0B", usage: "Alertas medias" },
  { name: "Dark Surface", class: "bg-[#1e293b]", hex: "#1e293b", usage: "Cards (Dark Mode)" },
];

export const DesignSystem: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 animate-in fade-in duration-200">
      
      {/* Header Fijo */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shadow-sm">
        <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            CliniScribe UI Kit "Pulse"
            </h1>
            <p className="text-xs text-slate-500 mt-1">Sistema de diseño unificado v1.0</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
            <XIcon className="h-6 w-6 text-slate-500" />
        </button>
      </div>

      <div className="p-8 space-y-12 max-w-6xl mx-auto">

        {/* 1. PALETA DE COLORES */}
        <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">01. Paleta Semántica</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {COLORS_PREVIEW.map((color) => (
                <div key={color.name} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-full h-12 rounded-lg shadow-inner ${color.class}`}></div>
                    <div>
                        <p className="font-bold text-sm truncate">{color.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{color.hex}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">{color.usage}</p>
                    </div>
                </div>
            ))}
            </div>
        </section>

        {/* 2. BOTONES */}
        <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">02. Botones e Interacciones</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Variantes */}
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="font-bold text-sm text-slate-500">Variantes Principales</h3>
                    
                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">variant="brand"</code>
                        <Button variant="brand" icon={<SparklesIcon className="w-4 h-4"/>}>IA Magic</Button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">variant="clinical"</code>
                        <Button variant="clinical" icon={<CheckCircleIcon className="w-4 h-4"/>}>Generar Nota</Button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">variant="danger"</code>
                        <Button variant="danger" icon={<TrashIcon className="w-4 h-4"/>}>Eliminar</Button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">variant="ghost"</code>
                        <Button variant="ghost">Cancelar Acción</Button>
                    </div>
                </div>

                {/* Estados */}
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="font-bold text-sm text-slate-500">Estados & Tamaños</h3>
                    
                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">isLoading=true</code>
                        <Button variant="clinical" isLoading>Guardando...</Button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">disabled=true</code>
                        <Button variant="clinical" disabled>Deshabilitado</Button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">size="sm"</code>
                        <Button variant="outline" size="sm">Pequeño</Button>
                    </div>
                     <div className="flex items-center justify-between gap-4">
                        <code className="text-xs text-slate-400">fullWidth=true</code>
                         <div className="w-40">
                            <Button variant="brand" fullWidth size="sm">Full Width</Button>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 3. TIPOGRAFÍA Y BADGES */}
        <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">03. Componentes de UI</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Badges */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold mb-4 text-sm">Badges de Estado</h3>
                <div className="flex flex-wrap gap-2">
                    <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">GRATUITO</span>
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">PROFESIONAL</span>
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 w-fit"><SparklesIcon className="w-3 h-3"/> MAX</span>
                </div>
            </div>

            {/* Alertas */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold mb-4 text-sm">Alertas Clínicas</h3>
                <div className="space-y-2">
                    {/* Red Flag */}
                    <div className="p-3 rounded-lg border flex gap-3 bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30">
                        <AlertTriangleIcon className="w-5 h-5 shrink-0 text-rose-500" />
                        <div>
                            <p className="text-xs font-bold uppercase text-rose-700 dark:text-rose-300">RED FLAG</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Sintomatología compatible con síndrome coronario.</p>
                        </div>
                    </div>
                     {/* Warning */}
                     <div className="p-3 rounded-lg border flex gap-3 bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
                        <AlertTriangleIcon className="w-5 h-5 shrink-0 text-amber-500" />
                        <div>
                            <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">PRECAUCIÓN</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Ajustar dosis por función renal.</p>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </section>

      </div>
    </div>
  );
};
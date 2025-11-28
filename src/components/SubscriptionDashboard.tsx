import React from 'react';
import { CheckIcon, SparklesIcon } from './icons'; // Asegúrate de que la ruta a tus iconos sea correcta
import { SubscriptionTier, PLAN_LIMITS, DashboardProfileProps } from '../types/subscription';

// Definimos una interfaz ligera para el perfil para no depender de todo el objeto User
interface Props {
  profile: DashboardProfileProps; // <--- Usamos el tipo nuevo flexible
  onSelectPlan: (planId: string) => void;
}

export const SubscriptionDashboard: React.FC<Props> = ({ profile, onSelectPlan }) => {
  
  // Normalización de datos para evitar errores si vienen nulos
  const tier = (profile.subscription_tier || 'free') as SubscriptionTier;
  const count = profile.notes_usage_count || 0;
  
  // Obtener límite usando la constante centralizada
  const limit = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
  
  // Cálculo de porcentaje para la barra visual (tope 100%)
  const percentage = Math.min((count / limit) * 100, 100);
  
  // Lógica de colores de la barra según uso
  const getProgressBarColor = () => {
    if (percentage > 90) return 'bg-rose-500';
    if (percentage > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      
      {/* --- SECCIÓN 1: BARRA DE CONSUMO --- */}
      <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tu Consumo Mensual</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {tier === 'pro' ? 'Ilimitado' : `${count} / ${limit} usos`}
            </h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase border ${
             tier === 'pro' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
             tier === 'basic' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 
             'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
             {tier === 'pro' ? 'Plan MAX' : tier === 'basic' ? 'Profesional' : 'Gratuito'}
          </span>
        </div>
        
        {tier !== 'pro' && (
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${getProgressBarColor()}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2 text-right">
           Ciclo se reinicia el: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
        </p>
      </div>

      {/* --- SECCIÓN 2: GRID DE PLANES --- */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
        Planes Disponibles
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* PLAN GRATUITO */}
          <div className={`border rounded-2xl p-5 flex flex-col relative transition-all ${
              tier === 'free' 
              ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' 
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          }`}>
              <h4 className="font-bold text-slate-700 dark:text-white">Gratuito</h4>
              <p className="text-2xl font-black text-slate-900 dark:text-white my-3">$0 <span className="text-xs font-normal text-slate-500">/mes</span></p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 mb-6 flex-1">
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> 20 usos mensuales</li>
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> Notas Clínicas</li>
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> Certificados</li>
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> Derivaciones</li>
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> Alertas Clínicas</li>
              </ul>
              <button disabled={tier === 'free'} className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-default">
                  {tier === 'free' ? 'Tu Plan Actual' : 'Incluido'}
              </button>
          </div>

          {/* PLAN PROFESIONAL (Basic) */}
          <div className={`border rounded-2xl p-5 flex flex-col relative transition-all ${
              tier === 'basic' 
              ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' 
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          }`}>
              {tier === 'basic' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">ACTUAL</span>}
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Profesional</h4>
              <p className="text-2xl font-black text-slate-900 dark:text-white my-3">$19.490 <span className="text-xs font-normal text-slate-500">/mes</span></p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 mb-6 flex-1">
                  <li className="flex gap-2 items-center text-indigo-600 dark:text-indigo-400 font-medium"><CheckIcon className="h-3 w-3"/> 300 usos mensuales</li>
                  <li className="flex gap-2 items-center" title="La IA te sugiere preguntas durante la consulta para no olvidar nada"><CheckIcon className="h-3 w-3 text-emerald-500"/> Sugerencias (IA) ℹ️</li>
                  <li className="flex gap-2 items-center"><CheckIcon className="h-3 w-3 text-emerald-500"/> Todo lo del Gratuito</li>
              </ul>
              {tier === 'basic' ? (
                  <button disabled className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-600 cursor-default">Plan Activo</button>
              ) : (
                  <button onClick={() => onSelectPlan('basic')} className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-transform active:scale-95">Contratar</button>
              )}
          </div>

          {/* PLAN MAX (Pro) */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col relative bg-slate-50 dark:bg-slate-900/50 opacity-70 cursor-not-allowed group">
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                  <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">🚀 Pronto</span>
              </div>
              <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2"><SparklesIcon className="w-3 h-3"/> MAX</h4>
              <p className="text-2xl font-black text-slate-900 dark:text-white my-3">$24.900 <span className="text-xs font-normal text-slate-500">/mes</span></p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 mb-6 flex-1">
                  <li className="flex gap-2 items-center font-bold text-amber-600"><CheckIcon className="h-3 w-3"/> Usos ILIMITADOS</li>
                  <li className="flex gap-2 items-center" title="Sube fotos de exámenes y la IA los interpreta"><CheckIcon className="h-3 w-3 text-slate-400"/> Análisis Exámenes ℹ️</li>
                  <li className="flex gap-2 items-center" title="Revisión de seguridad de tus indicaciones"><CheckIcon className="h-3 w-3 text-slate-400"/> Auditor Clínico ℹ️</li>
              </ul>
              <button disabled className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400">No Disponible</button>
          </div>

      </div>
    </div>
  );
};
import React from 'react';
import { XIcon, SparklesIcon, CheckCircleIcon, LockIcon } from './icons';
import { SubscriptionTier } from '../types/subscription';
// Importamos el nuevo componente Button
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tier: SubscriptionTier;
  limit: number;
  onUpgrade: () => void;
  t: (key: string) => string;
}

export const LimitModal: React.FC<Props> = ({ isOpen, onClose, tier, limit, onUpgrade, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header Visual */}
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-xl relative z-10">
             <LockIcon className="h-10 w-10 text-white" />
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-8 text-center">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {t('limit_reached_title')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {t('limit_reached_desc').replace('{{limit}}', limit.toString())}
          </p>

          {/* Barra de progreso llena */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full mb-2 overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="h-full bg-rose-500 w-full striped-bar"></div>
          </div>
          <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-8 text-right">
            100% {t('usage_consumed')}
          </p>

          {/* Beneficios Rápidos */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-left mb-6 border border-indigo-100 dark:border-indigo-500/30">
            <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-3 flex items-center gap-2">
              <SparklesIcon className="h-3 w-3" /> {t('upgrade_benefits_title')}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                {t('benefit_extended_limits')}
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                {t('benefit_advanced_tools')}
              </li>
            </ul>
          </div>

          {/* CTA Principal REEMPLAZADO */}
          <Button 
            variant="brand" 
            onClick={() => { onClose(); onUpgrade(); }}
            fullWidth
            size="lg"
            className="group" // Para mantener la animación del icono
            icon={<SparklesIcon className="h-5 w-5 group-hover:animate-pulse" />}
          >
            {t('upgrade_now_button')}
          </Button>
          
          <button onClick={onClose} className="mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium underline decoration-slate-300 underline-offset-2 bg-transparent border-none cursor-pointer">
            {t('maybe_later_button')}
          </button>
        </div>
      </div>
    </div>
  );
};
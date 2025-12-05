// src/components/ClinicalAlertsViewer.tsx

import React, { useState } from 'react';
import { 
  AlertTriangleIcon, 
  ChevronRightIcon, 
  CheckCircleIcon 
} from './icons';
import { ClinicalAlert } from '../services/types/gemini.types';

interface Props {
  alerts: ClinicalAlert[];
  t: (key: string) => string;
}

const AlertRow: React.FC<{ alert: ClinicalAlert; t: (key: string) => string }> = ({ alert, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mapeo de severidad a colores (Estilo sutil/borde)
  const severityConfig = {
    Critical: 'border-l-4 border-l-rose-600 bg-rose-50/50 dark:bg-rose-900/10',
    High: 'border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-900/5',
    Medium: 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/5',
    Low: 'border-l-4 border-l-sky-500 bg-sky-50/30 dark:bg-sky-900/5',
  };

  const badgeConfig = {
    Critical: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    High: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    Low: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  };

  const currentSeverity = alert.severity || 'Medium';
  // @ts-ignore
  const containerClass = severityConfig[currentSeverity] || severityConfig.Medium;
  // @ts-ignore
  const badgeClass = badgeConfig[currentSeverity] || badgeConfig.Medium;

  return (
    <div className={`mb-3 rounded-r-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all ${containerClass}`}>
      
      {/* HEADER: Resumen clicable */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} text-slate-400`}>
            <ChevronRightIcon className="h-4 w-4" />
          </div>
          
          <AlertTriangleIcon className={`h-5 w-5 shrink-0 ${currentSeverity === 'Critical' || currentSeverity === 'High' ? 'text-rose-500' : 'text-amber-500'}`} />
          
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-4">
              {alert.title}
            </h4>
            {!isExpanded && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate opacity-80">
                {alert.type}
              </p>
            )}
          </div>
        </div>

        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider shrink-0 ${badgeClass}`}>
          {/* Intentamos traducir, si no existe la clave, usamos el valor directo */}
          {t(`alert_sev_${currentSeverity.toLowerCase()}`) || currentSeverity}
        </span>
      </div>

      {/* BODY: Detalles expandidos */}
      {isExpanded && (
        <div className="px-11 pb-5 pt-0 animate-in slide-in-from-top-1 duration-200">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            {alert.details}
          </p>
          
          <div className="flex gap-2 items-start p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <CheckCircleIcon className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-0.5 uppercase tracking-wide">
                {t('recommendation')}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 italic">
                {alert.recommendation}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ClinicalAlertsViewer: React.FC<Props> = ({ alerts, t }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-8 w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4" />
          {t('clinical_alerts_title')} ({alerts.length})
        </h3>
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
      </div>
      
      <div>
        {alerts.map((alert, idx) => (
          <AlertRow key={idx} alert={alert} t={t} />
        ))}
      </div>
    </div>
  );
};
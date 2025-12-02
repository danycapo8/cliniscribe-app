import React from 'react';
import { SparklesIcon, LightbulbIcon, CheckCircleIcon } from './icons';
import { ExtendedProfile } from '../App';

interface ActiveConsultationViewProps {
  isRecording: boolean;
  hasContent: boolean;
  profile: ExtendedProfile;
  suggestedQuestions: any[];
  onMarkQuestion: (text: string) => void;
  autoSuggestEnabled: boolean;
  onToggleAutoSuggest: () => void;
  isSuggesting: boolean;
  t: (key: string) => string;
}

export const ActiveConsultationView: React.FC<ActiveConsultationViewProps> = ({
  isRecording,
  hasContent,
  profile,
  suggestedQuestions,
  onMarkQuestion,
  autoSuggestEnabled,
  onToggleAutoSuggest,
  isSuggesting,
  t
}) => {

  // ESTADO 1: REPOSO (Idle) - Saludo
  if (!isRecording && !hasContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-sky-200 dark:shadow-sky-900/20 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <SparklesIcon className="h-10 w-10 text-white relative z-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-3">
            {t('greeting_morning')}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">{profile.title} {profile.fullName?.split(' ')[0] || 'Doctor'}</span>.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg font-medium leading-relaxed">
            {t('greeting_subtitle')}
        </p>
      </div>
    );
  }

  // ESTADO 2: ACTIVO - Copiloto y Sugerencias
  // CAMBIOS APLICADOS: justify-start (arriba), padding superior pequeño (pt-4) y gran padding inferior (pb-48)
  return (
    <div className="w-full flex flex-col items-center justify-start pt-4 px-4 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* INDICADOR VISUAL (Badge flotante) */}
        <div className="mb-8 transform transition-all duration-300 hover:scale-105">
            {isRecording ? (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-800/30 px-6 py-3 rounded-full shadow-lg shadow-emerald-100/50 dark:shadow-none">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                        {t('listening_label')}...
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent dark:border-slate-700">
                    <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                    <span className="text-xs font-bold uppercase tracking-wider">Edición Manual</span>
                </div>
            )}
        </div>

        {/* ÁREA DE SUGERENCIAS */}
        <div className="w-full max-w-xl">
            {suggestedQuestions.length === 0 ? (
                <div className="flex justify-center">
                    {/* BOTÓN COPILOTO */}
                    <button 
                        onClick={onToggleAutoSuggest}
                        className={`group relative flex items-center gap-5 p-5 rounded-2xl border-2 border-dashed transition-all duration-300 w-full max-w-md
                            ${autoSuggestEnabled 
                                ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-900/10' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                    >
                        <div className={`p-3 rounded-xl shrink-0 transition-all duration-300 ${autoSuggestEnabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 dark:bg-slate-800'}`}>
                            <LightbulbIcon className={`h-6 w-6 ${isSuggesting ? 'animate-pulse' : ''}`} />
                        </div>
                        
                        <div className="text-left">
                            <h3 className={`text-sm font-bold mb-0.5 ${autoSuggestEnabled ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {isSuggesting ? t('analyzing_for_suggestions') : t('suggest_questions_tooltip')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                                {autoSuggestEnabled 
                                    ? "Escuchando para detectar vacíos clínicos..." 
                                    : "Activar sugerencias en tiempo real."}
                            </p>
                        </div>

                        {/* Switch visual */}
                        <div className={`ml-auto w-10 h-6 rounded-full p-1 transition-colors duration-300 ${autoSuggestEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${autoSuggestEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                    </button>
                </div>
            ) : (
                // LISTA DE SUGERENCIAS
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <LightbulbIcon className="h-3 w-3" /> Sugerencias Activas
                        </span>
                        <button onClick={onToggleAutoSuggest} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline">
                            {autoSuggestEnabled ? 'Pausar' : 'Reanudar'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {suggestedQuestions.filter(q => !q.asked).map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => onMarkQuestion(q.text)}
                                className="relative group text-left p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${q.category.includes('ALERTA') ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}>
                                        {q.category}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors pr-6">
                                    {q.text}
                                </p>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-500">
                                    <CheckCircleIcon className="h-4 w-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
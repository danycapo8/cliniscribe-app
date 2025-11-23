import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
// Asegúrate de que este import apunte correctamente a tu archivo de iconos
import { ThumbsUpIcon, ThumbsDownIcon, CheckIcon, XIcon, AlertTriangleIcon } from './icons';

const TAG_KEYS = ['tag_hallucination', 'tag_missing', 'tag_format', 'tag_tone', 'tag_typo', 'tag_other'];

interface FeedbackWidgetProps {
  userId: string | undefined;
  t: (key: string) => string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ userId, t }) => {
  const [status, setStatus] = useState<'idle' | 'expanded' | 'sending' | 'sent'>('idle');
  const [rating, setRating] = useState<number | null>(null); // 1 = Bien, 0 = Mal
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const handleVote = async (vote: number) => {
    setRating(vote);
    if (vote === 1) {
      // Voto positivo: Envío rápido
      await sendFeedback(1, [], "");
    } else {
      // Voto negativo: Pedir detalles
      setStatus('expanded');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const sendFeedback = async (finalRating: number, tags: string[], userComment: string) => {
    if (!userId) return;
    setStatus('sending');

    try {
      const { error } = await supabase.from('feedback_logs').insert({
        user_id: userId,
        rating: finalRating === 1 ? 5 : 1,
        tags: tags,
        comment: userComment, 
      });

      if (error) throw error;
      setStatus('sent');
      setTimeout(() => {
        setStatus('idle');
        setComment('');
        setSelectedTags([]);
      }, 3000);
      
    } catch (e) {
      console.error("Error logging feedback:", e);
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 animate-in fade-in bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/20">
        <CheckIcon className="h-4 w-4" />
        <span className="text-xs font-bold">{t('feedback_thanks')}</span>
      </div>
    );
  }

  return (
    // CONTENEDOR PRINCIPAL: Ajustado para contraste en modo claro (bg-slate-50 y bordes visibles)
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 mb-6 transition-all shadow-sm dark:shadow-none">
      
      {status === 'idle' && (
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                {t('feedback_title')}
            </span>
            <div className="flex gap-2">
                <button 
                    onClick={() => handleVote(0)}
                    className="p-2 rounded-lg transition-all text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10"
                    title="Reportar problema"
                >
                    <ThumbsDownIcon className="h-5 w-5" />
                </button>
                <button 
                    onClick={() => handleVote(1)}
                    className="p-2 rounded-lg transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10"
                    title="Buen trabajo"
                >
                    <ThumbsUpIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      )}

      {status === 'expanded' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                    {t('feedback_problem_title')}
                </span>
                <button onClick={() => setStatus('idle')} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <XIcon className="h-4 w-4"/>
                </button>
            </div>
            
            {/* TAGS: Fondo blanco en light mode para leer bien el texto */}
            <div className="flex flex-wrap gap-2">
                {TAG_KEYS.map(tagKey => (
                    <div key={tagKey} className="relative group">
                        <button
                            onClick={() => toggleTag(tagKey)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                                selectedTags.includes(tagKey)
                                ? 'bg-rose-500 text-white border-rose-600 shadow-sm' 
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-slate-500 hover:text-rose-600 dark:hover:text-slate-200'
                            }`}
                        >
                            {t(tagKey)}
                        </button>
                        
                        {/* TOOLTIP */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {t(tagKey + '_desc')}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                {/* TEXTAREA: Contraste crítico corregido. Texto negro sobre fondo blanco en light mode. */}
                <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('feedback_placeholder')}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none h-20 placeholder-slate-400 dark:placeholder-slate-600 shadow-inner"
                />
                <div className="flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-500/80 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-500/10">
                    <AlertTriangleIcon className="h-3 w-3 flex-shrink-0" />
                    <span>{t('feedback_privacy_warning')}</span>
                </div>
            </div>

            <button 
                onClick={() => sendFeedback(0, selectedTags, comment)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-rose-500/20 active:scale-[0.98]"
            >
                {t('feedback_report_button')}
            </button>
        </div>
      )}
    </div>
  );
};
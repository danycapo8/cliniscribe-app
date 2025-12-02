import React from 'react';
import { XIcon, FileTextIcon, LockIcon } from './icons'; 
// CORRECCIÓN AQUÍ: Apuntamos a la carpeta 'legal'
import { TermsContent } from './legal/TermsContent';
import { PrivacyContent } from './legal/PrivacyContent';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | null;
  language: 'en' | 'es' | 'pt';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type, language }) => {
  if (!isOpen || !type) return null;

  const config = {
    terms: {
      es: 'Términos y Condiciones',
      en: 'Terms of Use',
      pt: 'Termos de Uso',
      icon: <FileTextIcon className="h-5 w-5 text-indigo-500" />
    },
    privacy: {
      es: 'Política de Privacidad',
      en: 'Privacy Policy',
      pt: 'Política de Privacidade',
      icon: <LockIcon className="h-5 w-5 text-emerald-500" />
    }
  };

  const currentConfig = config[type];
  const title = currentConfig[language];

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f172a] w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              {currentConfig.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/50 dark:bg-[#0b0f19]">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-full">
             {type === 'terms' 
                ? <TermsContent language={language} /> 
                : <PrivacyContent language={language} />
             }
           </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg"
          >
            {language === 'en' ? 'Close' : language === 'pt' ? 'Fechar' : 'Cerrar'}
          </button>
        </div>

      </div>
    </div>
  );
};
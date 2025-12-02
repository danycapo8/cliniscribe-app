import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircleIcon, LockIcon, LogOutIcon } from './icons';
import { Button } from './Button';

// IMPORTACIONES DE CONTENIDO LEGAL
import { TermsContent } from './legal/TermsContent';
import { PrivacyContent } from './legal/PrivacyContent';

// Versiones para control de auditoría
export const CURRENT_TERMS_VERSION = 'v1.0-2025-11-28';

interface TermsModalProps {
  onAcceptSuccess: () => void;
  userName?: string;
  language?: 'en' | 'es' | 'pt';
}

export const TermsModal: React.FC<TermsModalProps> = ({ 
  onAcceptSuccess, 
  userName, 
  language = 'es' 
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const t = {
    es: {
      title: 'Actualización Legal Requerida',
      subtitle: `Hola, ${userName?.split(' ')[0] || 'Doctor'}. Para proteger a tus pacientes y tu práctica, necesitamos tu conformidad.`,
      tabTerms: '1. Términos de Uso',
      tabPrivacy: '2. Política de Privacidad',
      checkbox: (
        <>
          He leído, comprendido y acepto los <strong className="text-slate-900 dark:text-white">Términos y Condiciones</strong> y la <strong className="text-slate-900 dark:text-white">Política de Privacidad</strong>. Entiendo que CliniScribe es una IA de apoyo y soy responsable de la validación clínica final.
        </>
      ),
      btnReject: 'Rechazar y Salir',
      btnAccept: 'Aceptar y Entrar'
    },
    en: {
      title: 'Legal Update Required',
      subtitle: `Hello, ${userName?.split(' ')[0] || 'Doctor'}. To protect your patients and practice, we need your consent.`,
      tabTerms: '1. Terms of Use',
      tabPrivacy: '2. Privacy Policy',
      checkbox: (
        <>
          I have read, understood, and accept the <strong className="text-slate-900 dark:text-white">Terms & Conditions</strong> and <strong className="text-slate-900 dark:text-white">Privacy Policy</strong>. I understand CliniScribe is an AI support tool and I am responsible for final clinical validation.
        </>
      ),
      btnReject: 'Reject & Exit',
      btnAccept: 'Accept & Enter'
    },
    pt: {
      title: 'Atualização Legal Necessária',
      subtitle: `Olá, ${userName?.split(' ')[0] || 'Doutor'}. Para proteger seus pacientes e sua prática, precisamos do seu consentimento.`,
      tabTerms: '1. Termos de Uso',
      tabPrivacy: '2. Política de Privacidade',
      checkbox: (
        <>
          Li, compreendi e aceito os <strong className="text-slate-900 dark:text-white">Termos e Condições</strong> e a <strong className="text-slate-900 dark:text-white">Política de Privacidade</strong>. Entendo que o CliniScribe é uma ferramenta de apoio de IA e sou responsável pela validação clínica final.
        </>
      ),
      btnReject: 'Rejeitar e Sair',
      btnAccept: 'Aceitar e Entrar'
    }
  };

  const text = t[language] || t.es;

  const handleAccept = async () => {
    if (!isAccepted) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let user = null;
      try {
        const response = await supabase.auth.getUser();
        user = response?.data?.user;
      } catch (e) {
        console.warn("Supabase Auth check failed:", e);
      }

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            terms_accepted_at: new Date().toISOString(),
            terms_version: CURRENT_TERMS_VERSION,
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Fallback local por si acaso
        localStorage.setItem('cliniscribe_terms_accepted', 'true');
      }
      
      onAcceptSuccess(); 

    } catch (err: any) {
      console.error("Error terms:", err);
      setErrorMsg("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CORRECCIÓN CRÍTICA AQUÍ ---
  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
        // 1. Cerrar sesión explícitamente
        await supabase.auth.signOut();
        
        // 2. Limpiar cualquier rastro local manualmente para asegurar
        localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
        localStorage.removeItem('cliniscribe_terms_accepted');

        // 3. NO HACEMOS RELOAD.
        // Dejamos que App.tsx detecte el cambio de usuario (onAuthStateChange) 
        // y renderice la Landing Page automáticamente.
        
    } catch(e) { 
        console.error(e); 
        // Solo si falla todo, forzamos recarga al root
        window.location.href = "/";
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LockIcon className="h-5 w-5 text-indigo-500" />
              {text.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {text.subtitle}
            </p>
          </div>
          
          <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'terms' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {text.tabTerms}
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'privacy' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {text.tabPrivacy}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#0f172a] custom-scrollbar"
        >
          {activeTab === 'terms' 
             ? <TermsContent language={language} /> 
             : <PrivacyContent language={language} />
          }
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center gap-4 shrink-0">
          
          {errorMsg && (
            <div className="w-full p-3 bg-rose-100 text-rose-700 text-xs rounded-lg text-center font-bold border border-rose-200 animate-pulse">
              {errorMsg}
            </div>
          )}

          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-start gap-3 max-w-xl">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={isAccepted}
                  onChange={(e) => setIsAccepted(e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
              </div>
              <label htmlFor="accept-terms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none leading-relaxed">
                {text.checkbox}
              </label>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleLogout}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saliendo...' : (
                    <>
                        <LogOutIcon className="h-4 w-4" />
                        {text.btnReject}
                    </>
                )}
              </button>
              <Button
                variant="brand"
                disabled={!isAccepted || isSubmitting}
                onClick={handleAccept}
                isLoading={isSubmitting}
                icon={<CheckCircleIcon className="h-4 w-4" />}
              >
                {text.btnAccept}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
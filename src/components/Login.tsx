import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { SpinnerIcon, ChevronLeftIcon } from './icons'; 
import { Button } from './Button'; 
import loginHeroImage from '../assets/login-hero.webp';
import { LegalModal } from './LegalModal';

interface LoginProps {
  currentLang: string;
  onLanguageChange: (lang: 'en' | 'es' | 'pt') => void;
}

const Login: React.FC<LoginProps> = ({ currentLang, onLanguageChange }) => {
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // ESTADO PARA EL MODAL LEGAL
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  // --- DETECTOR DE URL INTELIGENTE (Legal + Idioma) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const legalParam = params.get('legal');
    const langParam = params.get('lang');

    if (langParam === 'en' || langParam === 'es' || langParam === 'pt') {
        onLanguageChange(langParam as any);
    }

    if (legalParam === 'terms' || legalParam === 'privacy') {
      setActiveLegalDoc(legalParam);
      setLegalModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onLanguageChange]);

  const openLegal = (type: 'terms' | 'privacy') => {
    setActiveLegalDoc(type);
    setLegalModalOpen(true);
  };

  // --- LOGIN CON GOOGLE ---
  const handleLoginGoogle = async () => {
    setLoading('google');
    try {
        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });
        if (error) throw error;
    } catch (error) {
        console.error("Google Login error:", error);
        alert("Error iniciando sesión con Google.");
        setLoading(null);
    }
  };

  // --- LOGIN CON MAGIC LINK ---
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setMessage(null);

    try {
        const redirectTo = window.location.origin;
        
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: redirectTo, 
            }
        });

        if (error) throw error;

        setMessage({ 
            type: 'success', 
            text: "¡Enlace enviado! Revisa tu correo." 
        });

    } catch (error: any) {
        console.error("Email Login error:", error);
        setMessage({ 
            type: 'error', 
            text: error.message || "Error al enviar el enlace." 
        });
    } finally {
        setLoading(null);
    }
  };

  const texts = {
      en: { 
          back: "Back", 
          welcome: "Welcome Back", 
          subtitle: "Access your intelligent clinical assistant.", 
          google_btn: "Sign in with Google", 
          email_label: "Or log in with email", 
          button: "Send Access Link", 
          footer: "Secure and private environment", 
          email_placeholder: "name@clinic.com",
          terms_text: "Terms of Use",
          privacy_text: "Privacy Policy"
      },
      es: { 
          back: "Volver", 
          welcome: "Bienvenido", 
          subtitle: "Accede a tu asistente clínico inteligente.", 
          google_btn: "Iniciar con Google", 
          email_label: "O ingresa con tu correo", 
          button: "Enviar Enlace de Acceso", 
          footer: "Entorno seguro y privado", 
          email_placeholder: "nombre@clinica.com",
          terms_text: "Términos de Uso",
          privacy_text: "Política de Privacidad"
      },
      pt: { 
          back: "Voltar", 
          welcome: "Bem-vindo", 
          subtitle: "Acesse seu assistente clínico inteligente.", 
          google_btn: "Entrar com Google", 
          email_label: "Ou entre com seu e-mail", 
          button: "Enviar Link de Acesso", 
          footer: "Ambiente seguro e privado", 
          email_placeholder: "nome@clinica.com",
          terms_text: "Termos de Uso",
          privacy_text: "Política de Privacidade"
      }
  };

  const t = texts[currentLang as keyof typeof texts] || texts.en;

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans overflow-hidden relative">
        
        {/* --- SECCIÓN IZQUIERDA --- */}
        <div className="flex-1 flex flex-col justify-center min-h-full py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 relative z-10 border-r border-slate-200 bg-white">
            
            {/* === BOTÓN VOLVER (MODIFICADO POR ARQUITECTO) === */}
            <button 
                onClick={() => window.location.href = '/'} 
                className="absolute top-8 left-8 z-20 flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors group"
            >
                <div className="p-2 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                    <ChevronLeftIcon className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold hidden sm:inline">{t.back}</span>
            </button>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="mx-auto w-full max-w-sm lg:w-96 pt-16"> 
                
                {/* === LOGO OFICIAL (SVG Landing Page) === */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-xl shadow-blue-600/20">
                        {/* SVG exacto de la Landing Page */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            <path d="M2 2l7.586 7.586" />
                            <circle cx="11" cy="11" r="2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">CliniScribe</h2>
                    </div>
                </div>

                {/* Textos de Bienvenida */}
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight leading-tight">
                        {t.welcome}
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        {t.subtitle}
                    </p>
                </div>

                <div className="space-y-6">
                    
                    {/* 1. MAGIC LINK */}
                    <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">
                                Email Profesional
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full px-4 py-3.5 border border-slate-300 rounded-xl bg-slate-50 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all shadow-sm"
                                placeholder={t.email_placeholder}
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {message.text}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            variant="brand" 
                            fullWidth 
                            size="lg"
                            isLoading={loading === 'email'}
                            disabled={loading !== null || !email}
                            className="shadow-xl shadow-indigo-500/20 py-4"
                        >
                            {loading === 'email' ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : t.button}
                        </Button>
                    </form>

                    {/* SEPARADOR */}
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">{t.email_label}</span>
                        </div>
                    </div>

                    {/* 2. BOTÓN GOOGLE */}
                    <button
                        onClick={handleLoginGoogle}
                        disabled={loading !== null}
                        className="relative w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading === 'google' ? (
                            <SpinnerIcon className="h-5 w-5 animate-spin text-slate-900" />
                        ) : (
                            <svg className="h-5 w-5 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>{loading === 'google' ? 'Conectando...' : t.google_btn}</span>
                    </button>

                    {/* Footer y Legal */}
                    <div className="flex flex-col gap-6 pt-10 border-t border-slate-100">
                        {/* Selector de Idioma */}
                        <div className="flex justify-start gap-2">
                            {['es', 'en', 'pt'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => onLanguageChange(lang as any)}
                                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition-all border ${
                                        currentLang === lang
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        {/* Footer Legal */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                            <p className="text-slate-400 flex items-center gap-2 font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                {t.footer}
                            </p>
                            
                            <div className="flex gap-4 text-slate-500">
                                <button 
                                    onClick={() => openLegal('terms')}
                                    className="hover:text-indigo-600 transition-colors hover:underline"
                                >
                                    {t.terms_text}
                                </button>
                                <button 
                                    onClick={() => openLegal('privacy')}
                                    className="hover:text-indigo-600 transition-colors hover:underline"
                                >
                                    {t.privacy_text}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN DERECHA: Imagen (Modo Claro) --- */}
        <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-slate-50">
            <div className="absolute inset-0 bg-indigo-900/10 z-10 mix-blend-multiply pointer-events-none"></div>
            <img
                className="absolute inset-0 h-full w-full object-cover opacity-100"
                src={loginHeroImage}
                alt="CliniScribe AI Assistant"
            />
        </div>

        <LegalModal 
            isOpen={legalModalOpen} 
            onClose={() => setLegalModalOpen(false)} 
            type={activeLegalDoc} 
            language={currentLang as 'en' | 'es' | 'pt'} 
        />
    </div>
  );
};

export default Login;
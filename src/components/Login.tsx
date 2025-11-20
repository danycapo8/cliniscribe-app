import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon, SpinnerIcon } from './icons';

interface LoginProps {
  currentLang: string;
  onLanguageChange: (lang: 'en' | 'es' | 'pt') => void;
}

const Login: React.FC<LoginProps> = ({ currentLang, onLanguageChange }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });
        if (error) throw error;
    } catch (error) {
        console.error("Login error:", error);
        alert("Error iniciando sesión. Revisa la consola.");
        setLoading(false);
    }
  };

  const texts = {
      en: { welcome: "Welcome Back", subtitle: "Access your intelligent clinical assistant.", button: "Sign in with Google", footer: "Secure HIPAA-compliant environment" },
      es: { welcome: "Bienvenido", subtitle: "Accede a tu asistente clínico inteligente.", button: "Iniciar con Google", footer: "Entorno seguro y privado (HIPAA)" },
      pt: { welcome: "Bem-vindo", subtitle: "Acesse seu assistente clínico inteligente.", button: "Entrar com Google", footer: "Ambiente seguro e privado" }
  };

  const t = texts[currentLang as keyof typeof texts] || texts.en;

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#020617] font-sans">
        {/* Background Effects (Blobs) */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
            {/* Logo Badge */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
                    <SparklesIcon className="h-3 w-3" />
                    CliniScribe AI v1.0
                </div>
            </div>

            {/* Card */}
            <div className="glass rounded-3xl p-8 shadow-2xl border border-white/10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.welcome}</h1>
                    <p className="text-slate-400">{t.subtitle}</p>
                </div>

                <div className="space-y-6">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <SpinnerIcon className="h-5 w-5 animate-spin text-slate-900" />
                        ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>{loading ? 'Connecting...' : t.button}</span>
                    </button>

                    <div className="flex justify-center gap-3 pt-4 border-t border-slate-800">
                        {['es', 'en', 'pt'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => onLanguageChange(lang as any)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                                    currentLang === lang 
                                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/50' 
                                    : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'
                                }`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-2">
                <i className="w-2 h-2 rounded-full bg-emerald-500"></i>
                {t.footer}
            </p>
        </div>
    </div>
  );
};

export default Login;
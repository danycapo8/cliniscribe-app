import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon, SpinnerIcon } from './icons';
// RUTA Y EXTENSIÓN CORREGIDAS: Apunta al archivo .webp en la carpeta assets
import loginHeroImage from '../assets/login-hero.webp';

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

  // Textos internacionalizados SIN la mención explícita a HIPAA en el footer
  const texts = {
      en: { welcome: "Welcome Back", subtitle: "Access your intelligent clinical assistant.", button: "Sign in with Google", footer: "Secure and private environment" },
      es: { welcome: "Bienvenido", subtitle: "Accede a tu asistente clínico inteligente.", button: "Iniciar con Google", footer: "Entorno seguro y privado" },
      pt: { welcome: "Bem-vindo", subtitle: "Acesse seu assistente clínico inteligente.", button: "Entrar com Google", footer: "Ambiente seguro e privado" }
  };

  const t = texts[currentLang as keyof typeof texts] || texts.en;

  return (
    // Contenedor principal: Flex para pantalla dividida en escritorio
    <div className="min-h-screen flex bg-[#020617] font-sans overflow-hidden">
        
        {/* --- SECCIÓN IZQUIERDA: Formulario y Textos --- */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 relative z-10 border-r border-white/5 bg-[#020617]">
            <div className="mx-auto w-full max-w-sm lg:w-96">
                {/* Logo Badge */}
                <div className="flex justify-start mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
                        <SparklesIcon className="h-3 w-3" />
                        CliniScribe AI v1.0
                    </div>
                </div>

                {/* Textos Principales */}
                <div className="mb-10">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                        {t.welcome}
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed">
                        {t.subtitle}
                    </p>
                </div>

                {/* Botón de Login y Footer */}
                <div className="space-y-8">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                    >
                        {loading ? (
                            <SpinnerIcon className="h-6 w-6 animate-spin text-slate-900" />
                        ) : (
                            <svg className="h-6 w-6" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        )}
                        <span>{loading ? 'Connecting...' : t.button}</span>
                    </button>

                    <div className="flex flex-col gap-6 pt-6 border-t border-slate-800/50">
                        {/* Selector de Idioma */}
                        <div className="flex justify-start gap-3">
                            {['es', 'en', 'pt'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => onLanguageChange(lang as any)}
                                    className={`text-xs font-bold uppercase px-4 py-2 rounded-lg transition-all border ${
                                        currentLang === lang
                                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-[0_0_10px_-3px_rgba(14,165,233,0.4)]'
                                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        {/* Footer de Seguridad */}
                        <p className="text-sm text-slate-500 flex items-center gap-2.5 font-medium">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            {t.footer}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SECCIÓN DERECHA: Imagen de Héroe (Solo Desktop) --- */}
        <div className="hidden lg:block relative w-0 flex-1 overflow-hidden">
            {/* Overlays para integrar la imagen con el fondo oscuro */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/10 z-10 mix-blend-multiply pointer-events-none"></div>
            <div className="absolute inset-0 bg-sky-900/20 z-10 mix-blend-overlay pointer-events-none"></div>
            
            {/* Imagen importada correctamente */}
            <img
                className="absolute inset-0 h-full w-full object-cover"
                src={loginHeroImage}
                alt="CliniScribe AI Assistant"
            />
        </div>
    </div>
  );
};

export default Login;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SparklesIcon, UserIcon, MicrophoneIcon, FileTextIcon, 
  UploadIcon, LockIcon, ChevronRightIcon, XIcon,
  SunIcon, MoonIcon, LightbulbIcon
} from './icons'; 
import { ExtendedProfile } from '../App'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: ExtendedProfile;
  onUpdateProfile: (p: Partial<ExtendedProfile>) => void;
  onRunDemo: () => void;
  t: (key: string) => string;
}

interface StepConfig {
    id: number;
    targetId?: string; 
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    positionPreference?: 'top' | 'bottom'; 
    isForm?: boolean; 
    action?: 'demo' | 'finish';
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose, profile, onUpdateProfile, onRunDemo, t }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties | null>(null);
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties | null>(null);

  // Definición de Pasos
  const steps: StepConfig[] = [
    {
        id: 0,
        title: t('onboard_welcome') || "Bienvenido a CliniScribe",
        desc: t('onboard_subtitle') || "Configuremos tu perfil profesional antes de empezar.",
        icon: <UserIcon className="h-6 w-6 text-white"/>,
        color: "bg-indigo-600",
        isForm: true 
    },
    { 
      id: 1, 
      targetId: 'tour-patient-data', 
      title: t('onboard_tip_1_title'), 
      desc: t('onboard_tip_1_desc'),
      icon: <UserIcon className="h-5 w-5 text-white"/>,
      color: "bg-sky-500",
      positionPreference: 'top'
    },
    { 
      id: 2, 
      targetId: 'tour-mic-button', 
      title: t('onboard_tip_2_title'), 
      desc: t('onboard_tip_2_desc'),
      icon: <MicrophoneIcon className="h-5 w-5 text-white"/>,
      color: "bg-emerald-500",
      positionPreference: 'top'
    },
    { 
      id: 3, 
      targetId: 'tour-text-area', 
      title: t('onboard_tip_3_title'), 
      desc: t('onboard_tip_3_desc'), 
      icon: <FileTextIcon className="h-5 w-5 text-white"/>,
      color: "bg-amber-500",
      positionPreference: 'top'
    },
    { 
      id: 4, 
      targetId: 'tour-attach-btn', 
      title: t('onboard_tip_4_title'), 
      desc: t('onboard_tip_4_desc'), 
      icon: <UploadIcon className="h-5 w-5 text-white"/>,
      color: "bg-purple-500",
      positionPreference: 'top'
    },
    { 
        id: 5, 
        targetId: 'tour-suggestions-btn', 
        title: t('onboard_tip_suggestions_title'), 
        desc: t('onboard_tip_suggestions_desc'), 
        icon: <LightbulbIcon className="h-5 w-5 text-white"/>,
        color: "bg-pink-500",
        positionPreference: 'top'
    },
    {
        id: 6,
        // NO targetId means center modal
        title: t('onboard_tip_privacy_pre_demo_title'),
        desc: t('onboard_tip_privacy_pre_demo_desc'),
        icon: <LockIcon className="h-5 w-5 text-white"/>,
        color: "bg-slate-700",
        isForm: false // Centered alert style
    },
    { 
      id: 7, 
      title: t('onboard_tip_5_title'), 
      desc: t('onboard_tip_5_desc'),
      icon: <SparklesIcon className="h-5 w-5 text-white"/>,
      color: "bg-indigo-600",
      action: 'demo',
      isForm: true // Centered demo launch
    },
    { 
        id: 8, 
        title: t('onboard_tip_6_title'), 
        desc: t('onboard_tip_6_desc'),
        icon: <LockIcon className="h-5 w-5 text-white"/>,
        color: "bg-emerald-600",
        action: 'finish',
        isForm: true // Centered finish
      }
  ];

  const currentStep = steps[currentStepIndex];

  // --- LÓGICA DE POSICIONAMIENTO ---
  const calculatePosition = useCallback(() => {
      // Si es form, demo, finish o el paso de privacidad (id 6), centramos
      const isCentered = currentStep.isForm || !currentStep.targetId;

      if (!isOpen || isCentered) {
          setSpotlightStyle(null);
          setTooltipStyle(null); 
          setArrowStyle(null);
          return;
      }

      const target = document.getElementById(currentStep.targetId!);
      
      if (!target) {
          // Fallback if element missing
          setSpotlightStyle(null); 
          setTooltipStyle(null);
          setArrowStyle(null);
          return;
      }

      const rect = target.getBoundingClientRect();
      // Padding del spotlight: menor en móvil para ser más preciso
      const padding = window.innerWidth < 768 ? 4 : 10; 
      
      setSpotlightStyle({
          position: 'fixed',
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + (padding * 2),
          height: rect.height + (padding * 2),
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0,0,0,0.5)', 
          zIndex: 200,
          pointerEvents: 'none', 
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      // --- UX PROFESIONAL: BOTTOM SHEET EN MÓVIL ---
      const isMobile = window.innerWidth < 768; // Breakpoint estándar tablet/móvil

      if (isMobile) {
          // Estilo "Bottom Sheet" nativo
          setTooltipStyle({
              position: 'fixed',
              left: '0',
              bottom: '0',
              width: '100%',
              maxWidth: '100%',
              zIndex: 202,
              borderRadius: '24px 24px 0 0', // Redondeado solo arriba
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', // Sombra suave hacia arriba
              margin: '0',
              padding: '24px 20px 32px 20px', // Padding interno generoso
              transform: 'none', // Sin transformaciones de centrado
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease' // Animación iOS
          });
          setArrowStyle(null); // Sin flecha en modo bottom sheet
      } else {
          // Estilo Desktop: Tooltip flotante inteligente
          const tooltipHeight = 180; 
          const spaceAbove = rect.top;
          
          let placeTop = true;
          if (currentStep.positionPreference === 'bottom') placeTop = false;
          if (currentStep.positionPreference === 'top' && spaceAbove < tooltipHeight) placeTop = false;

          setTooltipStyle({
              position: 'fixed',
              left: rect.left + (rect.width / 2), 
              transform: 'translateX(-50%)',
              [placeTop ? 'bottom' : 'top']: placeTop ? (window.innerHeight - rect.top + 20) : (rect.bottom + 20),
              width: '320px',
              zIndex: 202,
              borderRadius: '16px', // Redondeado completo en desktop
              transition: 'all 0.4s ease-out'
          });

          setArrowStyle({
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              [placeTop ? 'bottom' : 'top']: '-8px', 
              width: 0, 
              height: 0, 
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              [placeTop ? 'borderTop' : 'borderBottom']: '8px solid white', 
          });
      }

  }, [isOpen, currentStep]);

  useEffect(() => {
      if (isOpen) {
          setTimeout(() => calculatePosition(), 100);
      }
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
      return () => {
          window.removeEventListener('resize', calculatePosition);
          window.removeEventListener('scroll', calculatePosition);
      };
  }, [isOpen, currentStepIndex, calculatePosition]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
        
        {!currentStep.isForm && spotlightStyle && (
            <div style={spotlightStyle} className="animate-in fade-in duration-500 border-2 border-white/30 ring-4 ring-indigo-500/30"></div>
        )}

        {currentStep.isForm && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"></div>
        )}

        <div 
            style={currentStep.isForm ? undefined : tooltipStyle || {}} 
            className={`
                ${currentStep.isForm ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl' : ''}
                bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700
                flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500
                p-6
                ${!currentStep.isForm && window.innerWidth < 768 ? 'border-b-0 border-x-0' : ''} 
            `}
        >
            {!currentStep.isForm && arrowStyle && <div style={arrowStyle}></div>}

            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${currentStep.color} shadow-lg shadow-indigo-500/20`}>
                    {currentStep.icon}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">
                        {currentStep.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {currentStep.desc}
                    </p>
                </div>
            </div>

            {/* --- CONTENIDO ESPECIAL: FORMULARIO (Paso 0) --- */}
            {currentStep.id === 0 && (
                 <div className="mt-2 space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    
                    {/* Nombre y Título */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Título</label>
                            <select 
                                value={profile.title || 'Dr.'}
                                onChange={(e) => onUpdateProfile({title: e.target.value})}
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Dr.">Dr.</option>
                                <option value="Dra.">Dra.</option>
                                <option value="Sr.">Sr.</option>
                                <option value="Sra.">Sra.</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Nombre Completo</label>
                            <input 
                                type="text" 
                                value={profile.fullName || ''}
                                onChange={(e) => onUpdateProfile({fullName: e.target.value})}
                                placeholder={t('onboard_field_name_placeholder')}
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* País y Especialidad */}
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">País</label>
                            {/* PAÍS FIJO CHILE */}
                            <select 
                                disabled
                                value="Chile"
                                className="w-full mt-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                            >
                                <option value="Chile">Chile</option>
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Especialidad</label>
                            <select 
                                value={profile.specialty} 
                                onChange={(e) => onUpdateProfile({specialty: e.target.value})}
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Médico General / Familia">Médico General</option>
                                <option value="Medicina Interna">Medicina Interna</option>
                                <option value="Pediatría">Pediatría</option>
                                <option value="Ginecología y Obstetricia">Ginecología</option>
                                <option value="Cardiología">Cardiología</option>
                                <option value="Traumatología">Traumatología</option>
                                <option value="Psiquiatría">Psiquiatría</option>
                                <option value="Neurología">Neurología</option>
                                <option value="Dermatología">Dermatología</option>
                                <option value="Broncopulmonar">Broncopulmonar</option>
                                <option value="Gastroenterología">Gastroenterología</option>
                                <option value="Urología">Urología</option>
                                <option value="Oftalmología">Oftalmología</option>
                                <option value="Otorrinolaringología">Otorrino</option>
                                <option value="Geriatría">Geriatría</option>
                                <option value="Otro">Otro</option>
                            </select>
                         </div>
                    </div>

                    {/* --- IDIOMA Y TEMA --- */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                        {/* Selector de Idioma DROPDOWN */}
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Idioma</label>
                            <select 
                                value={profile.language} 
                                onChange={(e) => onUpdateProfile({ language: e.target.value as any })}
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="es">Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>

                        {/* Selector de Tema */}
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Tema</label>
                            <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-600 mt-1">
                                <button
                                    onClick={() => onUpdateProfile({ theme: 'light' })}
                                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                                        profile.theme === 'light' 
                                        ? 'bg-amber-100 text-amber-700 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <SunIcon className="h-4 w-4"/>
                                </button>
                                <button
                                    onClick={() => onUpdateProfile({ theme: 'dark' })}
                                    className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                                        profile.theme === 'dark' 
                                        ? 'bg-indigo-900/50 text-indigo-300 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <MoonIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        </div>
                    </div>

                 </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-1.5">
                    {steps.map((s, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-6 bg-slate-800 dark:bg-white' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Saltar
                    </button>

                    {currentStep.action === 'demo' ? (
                        <button 
                            onClick={() => { onClose(); onRunDemo(); }}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <SparklesIcon className="h-4 w-4 animate-pulse"/> Ejecutar Demo
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1))}
                            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            {currentStepIndex === 0 ? "Comenzar Tour" : "Siguiente"}
                            <ChevronRightIcon className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>
            
        </div>
    </div>
  );
};
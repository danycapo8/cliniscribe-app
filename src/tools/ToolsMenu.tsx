import React, { useState } from 'react';
import { WrenchIcon, FileTextIcon, ChevronLeftIcon, ActivityIcon, CheckIcon } from '../components/icons'; 
import { CERTIFICATE_OPTIONS, CertificateType } from '../types/certificates';
import { translations } from '../translations';

interface ToolsMenuProps {
  onSelectTool: (tool: 'certificate', subType?: CertificateType) => void;
  variant: 'header' | 'input'; 
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ onSelectTool, variant }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'certificates'>('main');

  const buttonClass = variant === 'header' 
    ? "flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition border border-indigo-100 dark:border-indigo-500/20"
    : "p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"; 

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentView('main'), 300); // Resetear vista después de cerrar
  };

  // LÓGICA CORREGIDA:
  // Si es 'header', usamos 'left-0' para que el menú crezca hacia la derecha (alejándose del sidebar).
  // Si es 'input', mantenemos 'left-0' pero hacia arriba ('bottom-full').
  const positionClass = variant === 'input' 
    ? 'bottom-full left-0 mb-2' 
    : 'top-full left-0 mt-2'; // CAMBIO: right-0 -> left-0

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={buttonClass} 
        title="Herramientas Clínicas"
      >
        <WrenchIcon className="h-4 w-4" />
        {variant === 'header' && <span>Herramientas</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          {/* CAMBIO: z-50 -> z-[100] para asegurar que flote sobre elementos vecinos */}
          <div className={`absolute z-[100] w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 animate-in fade-in zoom-in-95 ${positionClass}`}>
            
            {/* VISTA PRINCIPAL (CATEGORÍAS) */}
            {currentView === 'main' && (
              <div className="animate-in slide-in-from-left-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Hub Clínico
                  </span>
                </div>
                
                {/* Botón para ir a Certificados */}
                <button
                  onClick={() => setCurrentView('certificates')}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                      <FileTextIcon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Certificados</span>
                  </div>
                  <ChevronLeftIcon className="h-4 w-4 rotate-180 opacity-40" />
                </button>

                {/* Futura funcionalidad: Derivaciones */}
                <button
                  disabled
                  className="w-full text-left px-4 py-3 text-sm text-slate-400 flex items-center justify-between cursor-not-allowed opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50">
                      <ActivityIcon className="h-4 w-4" />
                    </div>
                    <span>Derivaciones (Pronto)</span>
                  </div>
                </button>
              </div>
            )}

            {/* VISTA SECUNDARIA (LISTA DE CERTIFICADOS) */}
            {currentView === 'certificates' && (
              <div className="animate-in slide-in-from-right-2 duration-200">
                <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-800/50 mb-1 flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentView('main')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Tipos de Documento
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {CERTIFICATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => { onSelectTool('certificate', opt.type); handleClose(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400"></span>
                      {opt.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};
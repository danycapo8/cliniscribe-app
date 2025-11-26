import React, { useState } from 'react';
// CORRECCIÓN: Subir un nivel (..) luego entrar a components
import { WrenchIcon, FileTextIcon } from '../components/icons'; 
import { CERTIFICATE_OPTIONS, CertificateType } from '../types/certificates';
// CORRECCIÓN: Subir un nivel (..) para encontrar translations en src/
import { translations } from '../translations';

interface ToolsMenuProps {
  onSelectTool: (tool: 'certificate', subType?: CertificateType) => void;
  variant: 'header' | 'input'; 
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ onSelectTool, variant }) => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClass = variant === 'header' 
    ? "flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition"
    : "p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"; 

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className={buttonClass} title="Herramientas Clínicas">
        <WrenchIcon className="h-4 w-4" />
        {variant === 'header' && <span>Herramientas</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 animate-in fade-in zoom-in-95 ${variant === 'input' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2'}`}>
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Generar Documento
            </div>
            {CERTIFICATE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => { onSelectTool('certificate', opt.type); setIsOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 flex items-center gap-2"
              >
                <FileTextIcon className="h-4 w-4 opacity-70" />
                {opt.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
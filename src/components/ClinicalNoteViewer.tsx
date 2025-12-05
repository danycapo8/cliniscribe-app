import React, { useState, useMemo } from 'react';
import { 
  ChevronRightIcon, 
  CopyIcon, 
  CheckIcon 
} from './icons';

// Tipos para las secciones parseadas
interface NoteSectionData {
  id: string;
  title: string;
  content: string;
}

interface Props {
  note: string;
  t: (key: string) => string;
  // onSectionFeedback eliminado para limpiar la interfaz por sección
}

// Sub-componente para cada Fila del Acordeón
const NoteSectionRow: React.FC<{
  data: NoteSectionData;
  t: (key: string) => string;
  defaultExpanded?: boolean;
}> = ({ data, t, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Limpieza visual del contenido Markdown para mostrarlo limpio
  const cleanContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Renderizar negritas simples (**texto**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} className={`min-h-[1.5em] ${line.startsWith('-') ? 'pl-4' : ''}`}>
          {parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={index} className="font-semibold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>;
            }
            return <span key={index}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* HEADER DE LA SECCIÓN */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center justify-between py-4 px-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-lg select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRightIcon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            {data.title}
          </h3>
        </div>

        {/* ACCIONES (Solo visibles en hover o siempre en móvil) */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Copy Button */}
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
              isCopied 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {isCopied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
            <span className="hidden sm:inline">{isCopied ? t('note_copied') : t('copy_button_title')}</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO (Collapsible) */}
      {isExpanded && (
        <div className="pl-8 pr-4 pb-6 animate-in slide-in-from-top-2 duration-200">
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {cleanContent(data.content)}
          </div>
        </div>
      )}
    </div>
  );
};

export const ClinicalNoteViewer: React.FC<Props> = ({ note, t }) => {
  
  // Lógica de parsing extraída y mejorada
  const parsedSections = useMemo(() => {
    if (!note) return [];
    
    const lines = note.split('\n');
    const sections: NoteSectionData[] = [];
    let currentTitle = '';
    let currentBuffer: string[] = [];

    const flush = () => {
      if (currentTitle && currentBuffer.length > 0) {
        // Filtrar líneas vacías al inicio y final
        const content = currentBuffer.join('\n').trim();
        if (content) {
          sections.push({
            id: currentTitle.toLowerCase().replace(/\s+/g, '-'),
            title: currentTitle,
            content: content
          });
        }
      }
      currentBuffer = [];
    };

    lines.forEach(line => {
      // Detectar headers Markdown (## Título)
      if (line.trim().startsWith('## ')) {
        flush();
        currentTitle = line.replace('## ', '').trim();
      } else {
        // Ignorar bloques JSON o marcadores internos
        if (!line.includes('&&&') && !line.includes('```json')) {
          currentBuffer.push(line);
        }
      }
    });
    flush(); // Última sección

    return sections;
  }, [note]);

  if (!note) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-[#0f1115] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden px-6 py-2">
        {parsedSections.map((section) => (
          <NoteSectionRow 
            key={section.id} 
            data={section} 
            t={t} 
          />
        ))}
      </div>
      
      <div className="text-center mt-4 mb-10">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          {t('pdf_generated_by')} — {t('disclaimer_text')}
        </p>
      </div>
    </div>
  );
};
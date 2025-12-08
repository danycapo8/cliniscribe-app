import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronRightIcon, 
  CopyIcon, 
  CheckIcon,
  QuillIcon // Icono visual para indicar que es editable
} from './icons';
import { searchCIE10 } from '../services/cie10Service';

// Tipos para las secciones parseadas
interface NoteSectionData {
  id: string;
  title: string;
  content: string;
}

interface Props {
  note: string;
  t: (key: string) => string;
  onSectionFeedback?: (section: string, isPositive: boolean) => void;
  // Nueva prop para comunicar cambios hacia arriba
  onNoteChange: (newNote: string) => void;
}

// Sub-componente para cada Fila del Acordeón
const NoteSectionRow: React.FC<{
  data: NoteSectionData;
  t: (key: string) => string;
  defaultExpanded?: boolean;
  onUpdateContent: (newContent: string) => void; // Callback local
}> = ({ data, t, defaultExpanded = true, onUpdateContent }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCopied, setIsCopied] = useState(false);
  
  // ESTADO DE EDICIÓN
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar estado si la data externa cambia (ej: regeneración)
  useEffect(() => {
    setEditValue(data.content);
  }, [data.content]);

  // Auto-foco al entrar en modo edición
  useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        // Ajuste de altura automático básico
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = () => {
      setIsEditing(false);
      // Solo actualizamos si hubo cambios reales
      if (editValue.trim() !== data.content.trim()) {
          onUpdateContent(editValue);
      }
  };

  const handleSearch = async (texto: string) => {
   const resultados = await searchCIE10(texto);
   console.log(resultados); // [{ code: "J00", description: "Rinofaringitis Aguda..." }]
}

  // Limpieza visual del contenido Markdown para mostrarlo limpio (Modo Lectura)
  const cleanContent = (text: string) => {
    return text.split('\n').map((line, i) => {
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
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
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

        {/* ACCIONES */}
        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Indicador visual de edición */}
          {!isEditing && (
             <span className="text-[10px] text-slate-300 dark:text-slate-600 mr-2 flex items-center gap-1">
                <QuillIcon className="h-3 w-3" /> Clic para editar
             </span>
          )}
          
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

      {/* CONTENIDO (Editable vs Lectura) */}
      {isExpanded && (
        <div className="pl-8 pr-4 pb-6 animate-in slide-in-from-top-2 duration-200">
          
          {isEditing ? (
              // MODO EDICIÓN: Textarea simple
              <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => {
                      setEditValue(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onBlur={handleSave} // Guardar al salir del foco
                  className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg p-3 text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-amber-500/20 resize-none overflow-hidden"
                  spellCheck={false}
              />
          ) : (
              // MODO LECTURA: Div formateado con clic para editar
              <div 
                onClick={() => { setIsEditing(true); }}
                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal cursor-text hover:bg-slate-50 dark:hover:bg-white/5 p-2 -ml-2 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                title="Haz clic para editar este texto"
              >
                {cleanContent(data.content)}
              </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export const ClinicalNoteViewer: React.FC<Props> = ({ note, t, onSectionFeedback, onNoteChange }) => {
  
  // Parsear nota a secciones
  const parsedSections = useMemo(() => {
    if (!note) return [];
    
    const lines = note.split('\n');
    const sections: NoteSectionData[] = [];
    let currentTitle = '';
    let currentBuffer: string[] = [];

    const flush = () => {
      if (currentTitle && currentBuffer.length > 0) {
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
      if (line.trim().startsWith('## ')) {
        flush();
        currentTitle = line.replace('## ', '').trim();
      } else {
        if (!line.includes('&&&') && !line.includes('```json')) {
          currentBuffer.push(line);
        }
      }
    });
    flush(); 

    return sections;
  }, [note]);

  // Función crítica: Reconstruir la nota completa cuando se edita una sección
  const handleSectionUpdate = (sectionId: string, newContent: string) => {
      // Reconstruimos el string Markdown completo
      const newFullNote = parsedSections.map(section => {
          if (section.id === sectionId) {
              return `## ${section.title}\n${newContent}`;
          }
          return `## ${section.title}\n${section.content}`;
      }).join('\n\n');

      // Notificamos a la App principal para que actualice el estado global
      onNoteChange(newFullNote);
  };

  if (!note) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-[#0f1115] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden px-6 py-2">
        {parsedSections.map((section) => (
          <NoteSectionRow 
            key={section.id} 
            data={section} 
            t={t} 
            onUpdateContent={(newContent) => handleSectionUpdate(section.id, newContent)}
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
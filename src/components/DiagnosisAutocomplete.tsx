import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { SearchIcon, CheckIcon, XIcon, ChevronDownIcon } from './icons'; // Asegúrate de importar tus iconos
import { searchCIE10, ICD10Code } from '../services/cie10Service';

interface DiagnosisAutocompleteProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: ICD10Code) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const DiagnosisAutocomplete: React.FC<DiagnosisAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar diagnóstico (CIE-10)...",
  autoFocus = false
}) => {
  const [suggestions, setSuggestions] = useState<ICD10Code[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // Para navegación por teclado
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click Outside para cerrar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Solo buscar si el usuario está escribiendo y no ha seleccionado ya algo completo
      if (value.length >= 2 && isOpen) {
        setLoading(true);
        const results = await searchCIE10(value);
        setSuggestions(results);
        setLoading(false);
        setSelectedIndex(-1); // Reset selección
      } else if (value.length < 2) {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, isOpen]);

  // Manejo de Teclado (UX Pro)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
        if (e.key === 'ArrowDown' && value.length >= 2) setIsOpen(true);
        return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: ICD10Code) => {
    const formattedText = `${item.description} (${item.code})`;
    onChange(formattedText); // Actualiza el input visual
    onSelect(item); // Notifica al padre el objeto seleccionado
    setIsOpen(false);
    setSuggestions([]);
  };

  // Resaltar coincidencia (Visual Polish)
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <strong key={i} className="text-indigo-600 dark:text-indigo-400">{part}</strong> 
        : part
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
            ) : (
                <SearchIcon className="h-4 w-4" />
            )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm placeholder-slate-400"
        />

        {value && (
            <button 
                onClick={() => { onChange(''); setSuggestions([]); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
                <XIcon className="h-4 w-4" />
            </button>
        )}
      </div>

      {/* Dropdown de Resultados */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((item, index) => (
            <li key={item.code}>
              <button
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-50 dark:border-slate-700/50 flex items-start gap-3
                  ${index === selectedIndex 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-white' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                <span className="shrink-0 font-mono font-bold text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 mt-0.5">
                    {item.code}
                </span>
                <span className="truncate block">
                    {highlightMatch(item.description, value)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {isOpen && value.length >= 3 && suggestions.length === 0 && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 text-center text-slate-500 text-xs">
              No se encontraron diagnósticos para "{value}".
          </div>
      )}
    </div>
  );
};
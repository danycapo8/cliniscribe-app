// src/components/AppSidebar.tsx

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  QuillIcon, ChevronLeftIcon, TrashIcon, 
  LogOutIcon, UserIcon, NotesIcon 
} from './icons';
import { ToolsMenu } from '../tools/ToolsMenu';
import { ExtendedProfile } from '../App';
import { Session } from '@supabase/supabase-js';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewNote: () => void;
  onSelectTool: (tool: any, subType?: any) => void;
  profile: ExtendedProfile;
  onOpenProfile: () => void;
  onLogout: () => void;
  history: any[];
  viewingHistoryNoteId: string | null;
  onLoadHistoryNote: (note: any) => void;
  onClearHistory: () => void;
  onDeleteNote: (e: React.MouseEvent, id: string) => void;
  t: (key: string) => string;
  session: Session | null;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen, onClose, onNewNote, onSelectTool, profile, onOpenProfile, 
  onLogout, history, viewingHistoryNoteId, onLoadHistoryNote, 
  onClearHistory, onDeleteNote, t, session
}) => {
  
  // Estado para el Tooltip Flotante (Portal)
  const [tooltipData, setTooltipData] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);

  // Helper para renderizar sexo
  const renderSex = (val: string) => {
    if (!val) return "";
    const lower = val.toLowerCase();
    if (lower === 'male' || lower === 'masculino' || lower === 'homem') return "M";
    if (lower === 'female' || lower === 'femenino' || lower === 'mujer' || lower === 'mulher') return "F";
    return val.charAt(0).toUpperCase(); 
  };

  // Manejador del Tooltip
  const handleMouseEnter = (e: React.MouseEvent, text: string) => {
    // FIX 1: Deshabilitar tooltips en móvil (< 768px)
    if (window.innerWidth < 768) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      text,
      // FIX 2: Posicionar ARRIBA del botón (top ajustado + lógica en render)
      top: rect.top - 8, 
      left: rect.left + (rect.width / 2) 
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  return (
    <>
      <aside className={`flex-shrink-0 overflow-hidden bg-white dark:bg-[#02040a] border-r border-slate-200 dark:border-white/5 flex flex-col transition-all duration-300 fixed md:relative z-[100] h-full ${isOpen ? 'w-72 translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:w-0 md:translate-x-0'}`}>
            
            {/* HEADER SIDEBAR */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 h-14 bg-white dark:bg-[#02040a] z-40">
                <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-1.5 rounded-lg shadow-sm">
                        <QuillIcon className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="font-bold tracking-tight text-slate-900 dark:text-white text-sm">{t('sidebar_clinicsribe')}</h1>
                </div>
                <button onClick={onClose} className="md:hidden p-2 text-slate-500 hover:text-slate-800">
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
            </div>

            {/* BODY SIDEBAR */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                
                {/* BOTÓN NUEVA NOTA */}
                <div className="p-3 pb-2 sticky top-0 bg-white dark:bg-[#02040a] z-30 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <button 
                        onClick={() => {
                            onNewNote();
                            // FIX 3: Cerrar sidebar automáticamente en móvil
                            if (window.innerWidth < 768) onClose();
                        }} 
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm font-bold transition-all group"
                    >
                        <span>{t('new_note_button')}</span>
                    </button>
                </div>
                
                {/* MENÚ DE HERRAMIENTAS */}
                <div className="px-3 py-2 z-10">
                    <h3 className="px-2 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                        {t('tools_label')}
                    </h3>
                    <ToolsMenu 
                        onSelectTool={onSelectTool} 
                        variant="sidebar"
                        userTier={profile.subscription_tier}
                        onUpgradeRequest={onOpenProfile}
                        t={t}
                    />
                </div>

                <div className="border-t border-slate-100 dark:border-white/5 mx-4 my-2 z-10"></div>

                {/* HISTORIAL */}
                <div className="px-3 pb-4 z-10">
                    <div className="flex items-center justify-between px-2 mb-2 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                            {t('history_title')}
                        </span>
                        {history.length > 0 && (
                            <button 
                                onClick={onClearHistory} 
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                                title={t('tooltip_clear_history')}
                            >
                                {t('clear_all_history')}
                            </button>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        {history.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl animate-in fade-in duration-300">
                                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">{t('history_empty_title')}</p>
                            </div>
                        ) : (
                            history.map(note => (
                                <div key={note.id} onClick={() => onLoadHistoryNote(note)}
                                    className={`relative p-3 rounded-xl cursor-pointer text-xs group transition-all border ${viewingHistoryNoteId === note.id ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                                    
                                    <div className="pr-7">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold truncate">{note.context.age} {t('pdf_years')}, {renderSex(note.context.sex)}</span>
                                            <span className="text-[10px] opacity-70">{new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="opacity-80 truncate text-[10px]">
                                            {note.profile.specialty}
                                        </div>
                                    </div>
                                        
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-20">
                                        <button 
                                            onClick={(e) => onDeleteNote(e, note.id)} 
                                            onMouseEnter={(e) => handleMouseEnter(e, t('tooltip_delete_note'))}
                                            onMouseLeave={handleMouseLeave}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5"/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FOOTER PROFILE */}
            <div className="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#02040a] shrink-0 z-40 flex flex-col gap-1">
                <div className="flex gap-1">
                    <button 
                        onClick={onOpenProfile} 
                        onMouseEnter={(e) => handleMouseEnter(e, t('tooltip_profile'))}
                        onMouseLeave={handleMouseLeave}
                        className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 transition-colors text-left group relative"
                    >
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs relative overflow-hidden shrink-0">
                                {session?.user?.user_metadata?.avatar_url ? (
                                    <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    profile.fullName?.charAt(0) || <UserIcon className="h-4 w-4"/>
                                )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                {profile.fullName || 'Doctor'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            {profile.subscription_tier === 'pro' ? '⭐ Plan MAX' : profile.subscription_tier === 'basic' ? '⚡ Profesional' : 'Plan Gratuito'}
                            </p>
                        </div>
                    </button>

                    <button 
                        onClick={onLogout}
                        onMouseEnter={(e) => handleMouseEnter(e, t('tooltip_logout'))}
                        onMouseLeave={handleMouseLeave}
                        className="p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors relative group/logout shrink-0 flex items-center justify-center"
                    >
                        <LogOutIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
      </aside>
      
      {/* Overlay Móvil */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[90] md:hidden" onClick={onClose}></div>}

      {/* PORTAL TOOLTIP */}
      {tooltipData && isOpen && ReactDOM.createPortal(
        <div 
            className="fixed z-[9999] px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
            style={{ 
                top: `${tooltipData.top}px`, 
                left: `${tooltipData.left}px`,
                // FIX 2.1: Transformar para subir 100% (arriba del botón) y centrar horizontalmente
                transform: 'translate(-50%, -100%)' 
            }}
        >
            {/* Flechita apuntando hacia ABAJO (border-top coloreado) */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]"></div>
            {tooltipData.text}
        </div>,
        document.body
      )}
    </>
  );
};
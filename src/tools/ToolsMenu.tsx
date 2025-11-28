import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom'; // Import necesario para el Portal
import { 
  FileTextIcon, 
  StethoscopeIcon, 
  LockIcon,
  ActivityIcon,
  MicroscopeIcon,
  ChevronDownIcon
} from '../components/icons'; 
import { SubscriptionTier } from '../types/subscription';
import { CertificateType } from '../types/certificates';

// --- DEFINICIÓN DE ESTRUCTURA JERÁRQUICA ---

interface ToolItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  subType?: CertificateType; 
  minTier?: 'free' | 'basic' | 'pro'; 
  specialBadge?: string; 
  tooltip?: string;
}

interface ToolCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: ToolItem[];
}

interface Props {
  onSelectTool: (type: any, subType?: any) => void;
  variant?: 'sidebar' | 'grid';
  userTier?: SubscriptionTier | string;
  onUpgradeRequest?: () => void;
  t: (key: string) => string;
}

export const ToolsMenu: React.FC<Props> = ({ 
  onSelectTool, 
  userTier = 'free',
  onUpgradeRequest,
  variant = 'sidebar',
  t
}) => {
  // ARQUITECTO: Aquí estaba el error. Cambiado a 'false' para iniciar contraído.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'certs_group': false 
  });

  // Estado para controlar qué ítem está bajo el mouse (necesario para el Portal)
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const TOOL_CATEGORIES: (ToolCategory | ToolItem)[] = useMemo(() => [
    {
      id: 'certs_group',
      label: t('tools_certificates') || 'Certificados',
      icon: <FileTextIcon className="w-4 h-4" />,
      items: [
        { id: 'certificate', subType: 'reposo', label: t('cert_sick_leave'), minTier: 'free' },
        { id: 'certificate', subType: 'alta_deportiva', label: t('cert_sports'), minTier: 'free' },
        { id: 'certificate', subType: 'buena_salud', label: t('cert_health'), minTier: 'free' },
        { id: 'certificate', subType: 'aptitud_laboral', label: t('cert_work'), minTier: 'free' },
      ]
    },
    { 
      id: 'referral', 
      label: t('tools_referral') || 'Derivación', 
      icon: <StethoscopeIcon className="w-4 h-4" />, 
      minTier: 'free'
    },
    {
      id: 'alert_analysis',
      label: t('tool_clinical_auditor'),
      icon: <ActivityIcon className="w-4 h-4" />,
      minTier: 'pro', 
      specialBadge: 'MAX',
      tooltip: t('tooltip_clinical_auditor')
    },
    {
      id: 'exam_analysis',
      label: t('tool_exam_analysis'),
      icon: <MicroscopeIcon className="w-4 h-4" />,
      minTier: 'pro',
      specialBadge: 'MAX',
      tooltip: t('tooltip_exam_analysis')
    }
  ], [t]);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasAccess = (requiredTier?: string) => {
    if (!requiredTier || requiredTier === 'free') return true;
    const levels: Record<string, number> = { 'free': 0, 'basic': 1, 'pro': 2 }; 
    const currentLevel = levels[userTier as string] || 0; 
    const requiredLevel = levels[requiredTier] || 0;
    return currentLevel >= requiredLevel;
  };

  const renderToolItem = (item: ToolItem, isChild = false) => {
    const isLocked = !hasAccess(item.minTier);
    const isMaxFeature = item.specialBadge === 'MAX';
    const finalTooltipText = isLocked ? t('tooltip_plan_max') : item.tooltip;
    const showTooltip = !!finalTooltipText;
    
    // Identificador único para el hover
    const uniqueId = item.id + (item.subType || '');

    return (
      <button
        key={uniqueId}
        onMouseEnter={() => setHoveredId(uniqueId)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (isLocked) {
             if (onUpgradeRequest) onUpgradeRequest();
          } else {
             onSelectTool(item.id, item.subType);
          }
        }}
        className={`
          w-full flex items-center justify-between text-left group transition-all duration-200 relative overflow-visible
          ${isChild ? 'pl-9 pr-3 py-2 text-xs' : 'px-3 py-2.5 rounded-xl mb-1'}
          
          ${isChild 
              ? 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-50 dark:hover:bg-white/5 border-l-2 border-transparent hover:border-sky-200 dark:hover:border-sky-800 ml-3' 
              : isMaxFeature 
                ? 'bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 dark:from-violet-900/10 dark:to-fuchsia-900/10 hover:from-violet-100 hover:to-fuchsia-100 dark:hover:from-violet-900/20 dark:hover:to-fuchsia-900/20 border border-violet-100 dark:border-violet-900/30'
                : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-100 dark:hover:border-slate-800'
          }
          ${isLocked ? 'opacity-60 grayscale-[0.8] cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* --- TOOLTIP CON PORTAL (Solo si es Sidebar y está hover) --- */}
        {showTooltip && hoveredId === uniqueId && variant === 'sidebar' && ReactDOM.createPortal(
            <div 
                className="fixed px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl z-[9999] whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                style={{ 
                    left: '18.5rem', // Posición fija saliendo del sidebar
                    marginTop: '4px',
                }}
                ref={(el) => {
                    if (el && !el.style.top) {
                        const buttonRect = document.getElementById(`tool-btn-${uniqueId}`)?.getBoundingClientRect();
                        if (buttonRect) {
                            el.style.top = `${buttonRect.top + 10}px`;
                        }
                    }
                }}
            >
                {/* Flecha visual (simulada) */}
                <div className="absolute top-3 right-full border-4 border-transparent border-r-[#0f172a]"></div>
                {finalTooltipText}
            </div>,
            document.body
        )}

        {/* --- TOOLTIP NORMAL (Para Grid u otros contextos) --- */}
        {showTooltip && variant !== 'sidebar' && (
             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl z-[50] whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                {finalTooltipText}
                <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]"></div>
            </div>
        )}

        <div id={`tool-btn-${uniqueId}`} className="flex items-center gap-2.5 relative z-10 w-full">
          {!isChild && (
             <div className={`
                p-1.5 rounded-lg shrink-0 transition-colors
                ${isLocked 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                    : isMaxFeature
                        ? 'bg-white dark:bg-white/10 text-violet-600 dark:text-violet-300 shadow-sm'
                        : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                }
             `}>
                {item.icon}
             </div>
          )}
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between w-full">
                <span className={`truncate ${isChild ? 'font-medium' : 'font-bold text-sm text-slate-700 dark:text-slate-200'}`}>
                    {item.label}
                </span>
                
                {isMaxFeature && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-sm uppercase shrink-0">
                        MAX
                    </span>
                )}
                
                {isLocked && !isMaxFeature && (
                    <LockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                )}
            </div>
            
            {isMaxFeature && (
                <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5 opacity-80 font-medium">
                    {item.id === 'alert_analysis' ? 'Segunda Opinión' : 'Interpretación Labs'}
                </span>
            )}
          </div>
        </div>
        
        {isMaxFeature && !isLocked && (
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full select-none space-y-1">
      {TOOL_CATEGORIES.map((categoryOrItem, idx) => {
        if ('items' in categoryOrItem) {
          const category = categoryOrItem as ToolCategory;
          const isOpen = openCategories[category.id];
          const isCertificates = category.id === 'certs_group';
          
          return (
            <div key={category.id} className="pb-2 mb-2 border-b border-slate-50 dark:border-white/5 last:border-0 last:mb-0 last:pb-0">
              <button
                onClick={() => toggleCategory(category.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all
                  hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200
                  group mb-1 relative
                `}
              >
                <div className="flex items-center gap-2.5">
                   <div className={`
                     p-1.5 rounded-lg shrink-0 transition-colors
                     ${isCertificates 
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' 
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'
                     }
                   `}>
                     {category.icon}
                   </div>
                   <span className="text-sm font-bold">{category.label}</span>
                </div>
                <div className={`transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
                   <ChevronDownIcon className="w-3.5 h-3.5" />
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                  {category.items.map(subItem => renderToolItem(subItem, true))}
                </div>
              )}
            </div>
          );
        }

        const isMax = (categoryOrItem as ToolItem).specialBadge === 'MAX';
        const prevItem = TOOL_CATEGORIES[idx - 1];
        const addSeparator = isMax && prevItem && !('specialBadge' in prevItem);

        return (
            <React.Fragment key={categoryOrItem.id}>
                {addSeparator && <div className="h-2" />} 
                {renderToolItem(categoryOrItem as ToolItem, false)}
            </React.Fragment>
        );
      })}
    </div>
  );
};
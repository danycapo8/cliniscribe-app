import React from 'react';
// Importamos la configuración que acabamos de definir arriba
// Asegúrate de que themeConfig.ts exista en src/theme/
import { BUTTON_VARIANTS } from '../theme/themeConfig';
import { SpinnerIcon } from './icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Usamos keyof para asegurar que solo se pasen variantes válidas
  variant?: keyof typeof BUTTON_VARIANTS;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'clinical', 
  isLoading = false,
  icon,
  className = '',
  fullWidth = false,
  size = 'md',
  disabled,
  ...props 
}) => {
  
  // Clases base compartidas
  const baseStyles = "rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  // Tamaños
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  // Obtener estilos del themeConfig (con fallback a 'clinical' por seguridad)
  // Esto evita que la app explote si la variante no existe
  const variantStyles = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS['clinical'];
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`
        ${baseStyles} 
        ${sizeStyles[size]} 
        ${variantStyles} 
        ${widthStyle} 
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          <span>Procesando...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
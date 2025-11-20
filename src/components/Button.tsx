import React from 'react';
import { BaseProps } from '../types';

interface ButtonProps extends BaseProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 shadow-md",
    outline: "border-2 border-gray-200 text-gray-700 hover:border-indigo-600 hover:text-indigo-600 bg-transparent"
  };

  const disabledStyles = "opacity-50 cursor-not-allowed active:scale-100";

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? disabledStyles : ''} ${className}`}
    >
      {children}
    </button>
  );
};
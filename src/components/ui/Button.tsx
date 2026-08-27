import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'lg';
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none",
        {
          'bg-primary text-white hover:bg-blue-800 shadow-sm': variant === 'default',
          'border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-700': variant === 'outline',
          'hover:bg-slate-100 text-slate-700': variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          'h-10 py-2 px-4 text-sm': size === 'default',
          'h-8 px-3 text-xs': size === 'sm',
          'h-12 px-8 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}

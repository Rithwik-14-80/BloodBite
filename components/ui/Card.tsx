import React from 'react';
import { getThemeTokens } from '../../utils/styling.js';
import { ThemeMode } from './MedicalLogo';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'elevated' | 'custom';
  themeMode?: ThemeMode;
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  themeMode = 'light',
  padding = 'lg',
  className = '',
  children,
  ...props
}) => {
  const tokens = getThemeTokens(themeMode);

  const surfaceClass =
    variant === 'glass'
      ? `rounded-2xl ${tokens.glassCard}`
      : variant === 'elevated'
      ? `rounded-2xl ${tokens.elevatedCard}`
      : 'rounded-2xl';

  const padClass =
    padding === 'sm'
      ? 'p-4 sm:p-5'
      : padding === 'md'
      ? 'p-5 sm:p-6'
      : 'p-6 sm:p-8';

  return (
    <div className={`${surfaceClass} ${padClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

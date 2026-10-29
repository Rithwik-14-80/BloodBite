import React from 'react';
import { THEME, getThemeTokens } from '../../utils/styling.js';
import { ThemeMode } from './MedicalLogo';

export type ButtonVariant =
  | 'massivePrimary'
  | 'massiveSubtle'
  | 'massiveSecondary'
  | 'actionVoice'
  | 'actionVoiceActive'
  | 'actionWhatsApp'
  | 'secondaryPill';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  themeMode?: ThemeMode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'massivePrimary',
  themeMode = 'light',
  icon,
  children,
  className = '',
  ...props
}) => {
  const tokens = getThemeTokens(themeMode);
  const sizeKey = variant === 'massiveSecondary' ? 'massiveSubtle' : variant;
  const sizeClasses = THEME.buttons[sizeKey] || THEME.buttons.massivePrimary;

  let colorClasses = '';
  if (variant === 'massivePrimary') {
    colorClasses = tokens.massivePrimaryBtn;
  } else if (variant === 'massiveSubtle' || variant === 'massiveSecondary') {
    colorClasses = tokens.massiveSubtleBtn;
  } else if (variant === 'actionVoice') {
    colorClasses = tokens.voiceBtn;
  } else if (variant === 'secondaryPill') {
    colorClasses = tokens.secondaryPillBtn;
  }

  return (
    <button
      type="button"
      className={`${THEME.buttons.base} ${sizeClasses} ${colorClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

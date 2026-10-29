import React from 'react';
import { getThemeTokens } from '../../utils/styling.js';
import { ThemeMode, ThemeToggle, ThemeToggleProps } from './ThemeToggle';

export type { ThemeMode };
export const ThemeLanguageSwitchers = ThemeToggle;
export type ThemeLanguageSwitchersProps = ThemeToggleProps;

export interface MedicalLogoProps {
  themeMode: ThemeMode;
  language: 'en' | 'te';
  size?: 'md' | 'lg';
}

/**
 * BloodBite Brand Crest & Editorial Wordmark
 * Renders the provided teal ring & cyan medical cross logo (/assets/aistudio/image_dd13e14b.png).
 */
export const MedicalLogo: React.FC<MedicalLogoProps> = ({
  themeMode,
  language,
  size = 'md',
}) => {
  const tokens = getThemeTokens(themeMode);
  const isLarge = size === 'lg';

  const frameBorder =
    themeMode === 'neon'
      ? 'bg-white border-2 border-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.35)]'
      : themeMode === 'dark'
      ? 'bg-white border border-[#22C1DC]/60 shadow-sm'
      : 'bg-white border border-[#DFD9CE] shadow-sm';

  return (
    <div className="inline-flex items-center gap-3.5 select-none">
      {/* Provided BloodBite Logo Crest */}
      <div
        className={`relative rounded-xl overflow-hidden flex items-center justify-center shrink-0 transition-colors duration-200 ${
          isLarge ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-10 h-10 sm:w-11 sm:h-11'
        } ${frameBorder}`}
      >
        <img
          src="/assets/aistudio/image_dd13e14b.png"
          alt="BloodBite Logo"
          className="w-full h-full object-contain scale-125"
        />
      </div>

      {/* Editorial Wordmark & Quiet Clinical Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2.5">
          <span
            className={`font-display font-semibold tracking-tight leading-none ${
              isLarge ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
            } ${tokens.textPrimary}`}
          >
            BloodBite
          </span>
          <span className={`text-xs font-medium ${tokens.textSecondary}`}>
            · {language === 'en' ? 'Clinical Journal' : 'బ్లడ్‌బైట్'}
          </span>
        </div>
        <span className={`text-xs sm:text-sm font-normal mt-0.5 ${tokens.textSecondary}`}>
          {language === 'en'
            ? 'Blood Diagnostics & Indian Plate Reference'
            : 'రక్త పరీక్ష & ఆహార పోషణ విశ్లేషణ'}
        </span>
      </div>
    </div>
  );
};

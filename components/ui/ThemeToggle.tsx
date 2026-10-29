import React, { createContext, useContext, useEffect, useState } from 'react';
import { getThemeTokens } from '../../utils/styling.js';

export type ThemeMode = 'light' | 'dark' | 'neon';

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: 'en' | 'te';
  setLanguage: (lang: 'en' | 'te') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  setThemeMode: () => {},
  language: 'en',
  setLanguage: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('arogyasetu_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'neon') {
        return saved;
      }
    }
    return 'light';
  });

  const [language, setLanguage] = useState<'en' | 'te'>('en');

  useEffect(() => {
    try {
      window.localStorage.setItem('arogyasetu_theme', themeMode);
      document.documentElement.setAttribute('data-theme', themeMode);
    } catch {
      // Ignore storage errors
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useAppTheme() {
  return useContext(ThemeContext);
}

export interface ThemeToggleProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  language: 'en' | 'te';
  onLanguageChange: (lang: 'en' | 'te') => void;
}

const ModeSymbol: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  if (mode === 'light') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="3.2" />
        <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M12.6 3.4L11.5 4.5M4.5 11.5L3.4 12.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13.2 9.8A5.5 5.5 0 0 1 6.2 2.8a5.5 5.5 0 1 0 7 7Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5V13.5" />
      <path d="M8 2.5A5.5 5.5 0 0 1 8 13.5Z" fill="currentColor" />
    </svg>
  );
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  themeMode,
  onThemeChange,
  language,
  onLanguageChange,
}) => {
  const tokens = getThemeTokens(themeMode);

  const modes: { id: ThemeMode; labelEn: string; labelTe: string }[] = [
    { id: 'light', labelEn: 'Paper', labelTe: 'పేపర్' },
    { id: 'dark', labelEn: 'Evening', labelTe: 'డార్క్' },
    { id: 'neon', labelEn: 'Contrast', labelTe: 'కాంట్రాస్ట్' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Reading Surface Switcher (Paper / Evening / Contrast) */}
      <div
        className={`inline-flex items-center p-1 rounded-xl ${tokens.switcherTrack}`}
        role="group"
        aria-label="Reading Surface Mode"
      >
        {modes.map((m) => {
          const isActive = themeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onThemeChange(m.id)}
              aria-pressed={isActive}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-sans text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive ? tokens.switcherActive : tokens.switcherInactive
              }`}
            >
              <ModeSymbol mode={m.id} />
              <span>{language === 'en' ? m.labelEn : m.labelTe}</span>
            </button>
          );
        })}
      </div>

      {/* Bilingual Toggle (English / Telugu) */}
      <div
        className={`inline-flex items-center p-1 rounded-xl ${tokens.switcherTrack}`}
        role="group"
        aria-label="Language Toggle"
      >
        <button
          type="button"
          onClick={() => onLanguageChange('en')}
          aria-pressed={language === 'en'}
          className={`min-h-[36px] px-3 py-1 rounded-lg font-sans text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            language === 'en' ? tokens.switcherActive : tokens.switcherInactive
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => onLanguageChange('te')}
          aria-pressed={language === 'te'}
          className={`min-h-[36px] px-3 py-1 rounded-lg font-sans text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            language === 'te' ? tokens.switcherActive : tokens.switcherInactive
          }`}
        >
          తెలుగు
        </button>
      </div>
    </div>
  );
};

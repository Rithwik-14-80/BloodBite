import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { getThemeTokens } from '../../utils/styling.js';
import { ThemeMode } from './MedicalLogo';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  themeMode?: ThemeMode;
  children: React.ReactNode;
  closeLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  themeMode = 'light',
  children,
  closeLabel = 'Close',
}) => {
  const tokens = getThemeTokens(themeMode);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div className={`w-full max-w-lg rounded-2xl p-6 sm:p-7 relative ${tokens.modalSurface}`}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2
            id="modal-heading"
            className={`font-display text-xl sm:text-2xl font-semibold leading-snug ${tokens.textPrimary}`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${tokens.secondaryPillBtn}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

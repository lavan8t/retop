import React from 'react';
import { SubdirectoryArrowLeft } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface LegacyReturnButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const LegacyReturnButton: React.FC<LegacyReturnButtonProps> = ({
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const handleRelease = (e: React.SyntheticEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        handleRelease(e);
        onClick(e);
      }}
      onMouseUp={handleRelease}
      onPointerUp={handleRelease}
      onMouseEnter={onMouseEnter}
      onMouseLeave={(e) => {
        handleRelease(e);
        if (onMouseLeave) onMouseLeave();
      }}
      className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-99999 pointer-events-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-(--md-sys-color-primary-container) text-(--md-sys-color-on-primary-container) px-3 py-2 sm:px-5 sm:py-4 rounded-full sm:rounded-2xl shadow-lg border-2 border-(--border-main) transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-0 select-none animate-in fade-in slide-in-from-bottom-8"
    >
      <SubdirectoryArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
      <span
        className="font-expanded text-base sm:text-2xl leading-none mt-0.5 sm:mt-1 lowercase"
        style={{
          fontVariationSettings: '"slnt" -10, "wdth" 151, "wght" 700',
        }}
      >
        re.
      </span>
    </button>
  );
};

import React from "react";
import { SubdirectoryArrowLeft } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

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
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
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
      className="fixed bottom-8 right-8 z-99999 pointer-events-auto flex items-center justify-center gap-2 bg-(--md-sys-color-primary-container) text-(--md-sys-color-on-primary-container) px-5 py-4 rounded-2xl shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer border border-transparent outline-none focus:outline-none focus:ring-0 select-none animate-in fade-in slide-in-from-bottom-8"
    >
      <SubdirectoryArrowLeft className="w-6 h-6" />
      <span
        className="font-expanded text-2xl leading-none mt-1 lowercase"
        style={{
          fontVariationSettings: '"slnt" -10, "wdth" 151, "wght" 700',
        }}
      >
        re.
      </span>
    </button>
  );
};

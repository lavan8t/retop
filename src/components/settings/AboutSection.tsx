import React from "react";
import { Language } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Icon } from "@iconify/react";

declare const __BUILD_NUMBER__: string;

export const AboutSection: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-transparent gap-6 w-full max-w-2xl mx-auto">
      {/* retop Signature Logo */}
      <div className="flex flex-col items-center justify-center gap-2">
        <span
          className="retop-about-logo text-6xl md:text-7xl lg:text-8xl cursor-pointer inline-block select-none text-(--text-main) hover:text-(--accent-base)"
          style={{
            fontFamily: "'Google Sans Flex', var(--font-expanded), system-ui, sans-serif",
            fontVariationSettings: "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
          }}
        >
          retop
        </span>
        <p className="text-sm md:text-base font-bold font-expanded text-(--text-muted) max-w-md mt-1">
          uni portal done better.
        </p>
      </div>

      {/* Version & Build Separate Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-(--bg-surface) border-2 border-(--border-dim) text-xs md:text-sm font-bold font-mono text-(--text-muted) shadow-none">
          v
          {(() => {
            try {
              return (
                (typeof chrome !== "undefined" &&
                  chrome.runtime?.getManifest?.()?.version) ||
                "0.3.0"
              );
            } catch {
              return "0.3.0";
            }
          })()}
        </div>
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-(--bg-surface) border-2 border-(--border-dim) text-xs md:text-sm font-bold font-mono text-(--text-muted) shadow-none">
          Build{" "}
          {typeof __BUILD_NUMBER__ !== "undefined"
            ? __BUILD_NUMBER__
            : "dev"}
        </div>
      </div>

      {/* Official Link Buttons — Fully Rounded, No Scale, No Shadows */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
        <a
          href="https://getretop.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full text-sm md:text-base font-bold bg-(--accent-base) text-(--text-inverse) transition-opacity border-0 hover:opacity-90 flex items-center gap-2.5 shadow-none"
        >
          <Language className="w-5 h-5 shrink-0" />
          <span>getretop.web.app</span>
        </a>
        <a
          href="https://github.com/lavan8t/retop"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full text-sm md:text-base font-bold bg-(--bg-surface) text-(--text-main) border-2 border-(--border-dim) transition-colors hover:bg-(--bg-highlight) flex items-center gap-2.5 shadow-none"
        >
          <Icon icon="mdi:github" className="w-5 h-5 shrink-0" />
          <span>lavan8t/retop</span>
        </a>
      </div>
    </div>
  );
};

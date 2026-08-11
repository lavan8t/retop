import React from "react";
import { Language } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Icon } from "@iconify/react";

declare const __BUILD_NUMBER__: string;

export const AboutSection: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-transparent border-2 border-(--border-dim) gap-6 w-full max-w-2xl mx-auto">
      {/* retop Signature Logo */}
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="retop-about-logo text-6xl md:text-7xl lg:text-8xl cursor-pointer inline-block select-none text-(--text-main) hover:text-(--accent-base) lowercase tracking-tighter">
          retop
        </span>
        <p className="text-sm md:text-base font-bold font-expanded text-(--text-muted) max-w-md mt-1">
          uni portal done better.
        </p>
      </div>

      {/* Version & Build Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-(--bg-surface) border-2 border-(--border-dim) text-xs md:text-sm font-bold font-mono text-(--text-muted)">
        <span>
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
        </span>
        <span>•</span>
        <span>
          Build{" "}
          {typeof __BUILD_NUMBER__ !== "undefined"
            ? __BUILD_NUMBER__
            : "dev"}
        </span>
      </div>

      {/* Official Link Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 w-full">
        <a
          href="https://getretop.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 rounded-2xl text-sm md:text-base font-bold bg-(--accent-base) text-(--text-inverse) transition-all border-0 hover:opacity-90 flex items-center gap-2.5 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Language className="w-5 h-5 shrink-0" />
          <span>getretop.web.app</span>
        </a>
        <a
          href="https://github.com/lavan8t/retop"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 rounded-2xl text-sm md:text-base font-bold bg-(--bg-surface) text-(--text-main) border-2 border-(--border-dim) transition-all hover:bg-(--bg-highlight) flex items-center gap-2.5 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Icon icon="mdi:github" className="w-5 h-5 shrink-0" />
          <span>lavan8t/retop</span>
        </a>
      </div>
    </div>
  );
};

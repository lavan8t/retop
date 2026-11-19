import React from 'react';
import { Language } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

declare const __BUILD_NUMBER__: string;

export const AboutSection: React.FC = () => {
  return (
    <section className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl bg-(--bg-surface) gap-6 w-full max-w-2xl mx-auto">
      {/* retop Signature Logo */}
      <div className="flex flex-col items-center justify-center gap-2">
        <span
          className="retop-about-logo text-6xl md:text-7xl lg:text-8xl inline-block select-none text-(--text-main) hover:text-(--accent-base)"
          style={{
            fontFamily:
              "'Google Sans Flex', var(--font-expanded), system-ui, sans-serif",
            fontVariationSettings:
              "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
          }}
        >
          retop
        </span>
        <p className="text-sm md:text-base font-semibold font-expanded text-(--text-muted) max-w-md mt-1">
          uni portal done better.
        </p>
      </div>

      {/* Version & Build */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center min-h-10 px-3.5 rounded-full bg-(--bg-highlight) text-xs md:text-sm font-semibold font-mono text-(--text-muted)">
          v
          {(() => {
            try {
              return (
                (typeof chrome !== 'undefined' &&
                  chrome.runtime?.getManifest?.()?.version) ||
                'dev'
              );
            } catch {
              return 'dev';
            }
          })()}
        </span>
        <span className="inline-flex items-center min-h-10 px-3.5 rounded-full bg-(--bg-highlight) text-xs md:text-sm font-semibold font-mono text-(--text-muted)">
          Build{' '}
          {typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : 'dev'}
        </span>
      </div>

      {/* Official Links */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
        <a
          href="https://getretop.web.app"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 px-6 py-3 rounded-full text-sm font-semibold bg-(--accent-base) text-(--text-inverse) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors border-0 hover:opacity-90 inline-flex items-center gap-2.5"
        >
          <Language className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>getretop.web.app</span>
        </a>
        <a
          href="https://github.com/lavan8t/retop"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 px-6 py-3 rounded-full text-sm font-semibold bg-(--bg-surface) text-(--text-main) border border-(--border-dim) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-colors hover:bg-(--bg-highlight) inline-flex items-center gap-2.5"
        >
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
          </svg>
          <span>lavan8t/retop</span>
        </a>
      </div>
    </section>
  );
};

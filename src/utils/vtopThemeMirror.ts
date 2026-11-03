/**
 * Synchronous mirror of the resolved native-VTOP theme.
 *
 * The real settings live in IndexedDB, which cannot answer at document_start.
 * `applyTheme()` writes the resolved value here and the bootstrapper reads it
 * before VTOP's first paint. This module owns the key for every importer;
 * `content.ts` mirrors the literal because the bootstrapper must stay import
 * free.
 */
export const VTOP_THEME_STORAGE_KEY = 'retop_vtop_theme';

export type MirroredVtopTheme = 'dark' | 'amoled' | 'light' | 'none';

export function writeMirroredVtopTheme(theme: MirroredVtopTheme): void {
  try {
    localStorage.setItem(VTOP_THEME_STORAGE_KEY, theme);
  } catch {}
}

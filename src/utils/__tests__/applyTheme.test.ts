import { beforeEach, describe, expect, it } from 'bun:test';
import { applyTheme, DEFAULT_SETTINGS } from '../settings-store';
import { VTOP_THEME_STORAGE_KEY } from '../vtopThemeMirror';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  delete window.__retopAborted;
});

describe('applyTheme native-page mirror', () => {
  it('mirrors the resolved VTOP theme for the document_start bootstrapper', () => {
    applyTheme({
      ...DEFAULT_SETTINGS,
      themeMode: 'light',
      vtopThemeMode: 'same',
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(VTOP_THEME_STORAGE_KEY)).toBe('light');
  });

  it('mirrors an explicit dark native theme even when retop is light', () => {
    applyTheme({
      ...DEFAULT_SETTINGS,
      themeMode: 'light',
      vtopThemeMode: 'dark',
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(VTOP_THEME_STORAGE_KEY)).toBe('dark');
  });

  it('records none so the bootstrapper leaves the native page alone', () => {
    applyTheme({
      ...DEFAULT_SETTINGS,
      themeMode: 'dark',
      vtopThemeMode: 'none',
    });

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(VTOP_THEME_STORAGE_KEY)).toBe('none');
  });

  it('is a no-op after teardown handed the page back to VTOP', () => {
    window.__retopAborted = true;
    try {
      applyTheme({
        ...DEFAULT_SETTINGS,
        themeMode: 'dark',
        vtopThemeMode: 'dark',
      });

      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
      expect(localStorage.getItem(VTOP_THEME_STORAGE_KEY)).toBeNull();
    } finally {
      delete window.__retopAborted;
    }
  });
});

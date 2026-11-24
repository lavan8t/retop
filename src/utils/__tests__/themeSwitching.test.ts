import { beforeEach, describe, expect, it } from 'bun:test';
import {
  applyTheme,
  DEFAULT_SETTINGS,
  useSettingsStore,
} from '../settings-store';

const setSplashStyle = () => {
  const style = document.createElement('style');
  style.textContent = '#retop-open-loader { background: #09090b !important; }';
  document.head.appendChild(style);
  const splash = document.createElement('div');
  splash.id = 'retop-open-loader';
  document.documentElement.appendChild(splash);
  return splash;
};

describe('theme switching', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="offline-root"></div>';
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('retop-open-loader')?.remove();
  });

  it('applies the selected theme to the app roots', () => {
    applyTheme({ ...DEFAULT_SETTINGS, themeMode: 'light' });

    expect(
      document.getElementById('offline-root')?.getAttribute('data-theme'),
    ).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('updates the app theme when the setting changes', () => {
    useSettingsStore.getState().updateSetting('themeMode', 'light');

    expect(
      document.getElementById('offline-root')?.getAttribute('data-theme'),
    ).toBe('light');
    expect(useSettingsStore.getState().settings.themeMode).toBe('light');
  });

  it('paints the VIT splash in the selected theme', () => {
    const splash = setSplashStyle();

    applyTheme({ ...DEFAULT_SETTINGS, themeMode: 'light' });
    expect(getComputedStyle(splash).backgroundColor).toMatch(
      /rgb\(255,\s*255,\s*255\)|#ffffff/i,
    );

    applyTheme({ ...DEFAULT_SETTINGS, themeMode: 'dark' });
    expect(getComputedStyle(splash).backgroundColor).toMatch(
      /rgb\(9,\s*9,\s*11\)|#09090b/i,
    );
  });
});

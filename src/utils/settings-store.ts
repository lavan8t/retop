import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { getAppRoot } from './bridge';
import { QuickLink } from '../types/vtop';
import {
  argbFromHex,
  hexFromArgb,
  Hct,
  TonalPalette,
  SchemeVibrant,
  SchemeTonalSpot,
  SchemeExpressive,
  SchemeContent,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeRainbow,
  SchemeNeutral,
  SchemeMonochrome,
} from '@material/material-color-utilities';

export type DateFormatPattern =
  | 'DD Mon YYYY'
  | 'DD Mon YY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD.MM.YYYY'
  | 'DD-MM-YYYY';

export type ColorSchemeStyle =
  | 'vibrant'
  | 'tonal'
  | 'expressive'
  | 'content'
  | 'fidelity'
  | 'fruitSalad'
  | 'rainbow'
  | 'neutral'
  | 'monochrome';

export interface AppSettings {
  defaultView: 'modern' | 'legacy';
  themeMode: 'dark' | 'light' | 'amoled' | 'auto';
  vtopThemeMode: 'same' | 'dark' | 'light' | 'amoled' | 'none';
  accentColor:
    | 'grey'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'indigo'
    | 'lime'
    | 'monochrome';
  colorSchemeStyle?: ColorSchemeStyle;
  blurCgpa: boolean;
  pureBlack: boolean;
  pinnedLinks: QuickLink[];
  use24HourTime: boolean;
  timeFormat?: '24h' | '12h' | '12h-ampm';
  animationScale: '1x' | '0.5x' | '0x';
  calendarClassColor: string;
  calendarEventColor: string;
  timetableMode: 'weekly' | 'slot' | 'consolidated' | 'fullMonth';
  dateFormat: DateFormatPattern;
  fontScale: number;
  fontWeight: 'regular' | 'medium' | 'bold';
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultView: 'modern',
  themeMode: 'dark',
  vtopThemeMode: 'same',
  accentColor: 'orange',
  colorSchemeStyle: 'vibrant',
  blurCgpa: false,
  pureBlack: false,
  use24HourTime: false,
  timeFormat: '12h',
  animationScale: '1x',
  calendarClassColor: 'blue',
  calendarEventColor: 'purple',
  timetableMode: 'weekly',
  dateFormat: 'DD Mon YYYY',
  fontScale: 100,
  fontWeight: 'bold',

  pinnedLinks: [
    { title: 'Time Table', url: 'studenttimetable', category: 'Core' },
    { title: 'Marks', url: 'mark', category: 'Core' },
    {
      title: 'Profile',
      url: 'studentprofileallview',
      category: 'System',
    },
  ],
};

export const MATERIAL_ACCENTS: Record<string, string> = {
  grey: '#71717a',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  teal: '#14b8a6',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  rose: '#f43f5e',
  lime: '#84cc16',
  deepOrange: '#ff5722',
};

function createMaterialScheme(
  hct: Hct,
  isDark: boolean,
  style: ColorSchemeStyle = 'vibrant',
) {
  switch (style) {
    case 'tonal':
      return new SchemeTonalSpot(hct, isDark, 0.0);
    case 'expressive':
      return new SchemeExpressive(hct, isDark, 0.0);
    case 'content':
      return new SchemeContent(hct, isDark, 0.0);
    case 'fidelity':
      return new SchemeFidelity(hct, isDark, 0.0);
    case 'fruitSalad':
      return new SchemeFruitSalad(hct, isDark, 0.0);
    case 'rainbow':
      return new SchemeRainbow(hct, isDark, 0.0);
    case 'neutral':
      return new SchemeNeutral(hct, isDark, 0.0);
    case 'monochrome':
      return new SchemeMonochrome(hct, isDark, 0.0);
    case 'vibrant':
    default:
      return new SchemeVibrant(hct, isDark, 0.0);
  }
}

const resolveAccent = (colorKey: string): string =>
  MATERIAL_ACCENTS[colorKey] ||
  (colorKey && colorKey.startsWith('#') ? colorKey : MATERIAL_ACCENTS.blue);

// Tonal palette tones keep the same hue as the chosen accent, so light and dark
// containers stay in sync with the active theme instead of a fixed dark chip.
const accentTone = (
  colorKey: string,
  tone: number,
  fallback: string,
): string => {
  try {
    const palette = TonalPalette.fromHct(
      Hct.fromInt(argbFromHex(resolveAccent(colorKey))),
    );
    return hexFromArgb(palette.tone(tone));
  } catch {
    return fallback;
  }
};

export const getMaterialThemeColor = (
  colorKey: string,
  isDark: boolean = true,
): string => accentTone(colorKey, isDark ? 30 : 90, resolveAccent(colorKey));

export const getMaterialOnThemeColor = (
  colorKey: string,
  isDark: boolean = true,
): string =>
  accentTone(colorKey, isDark ? 90 : 10, isDark ? '#ffffff' : '#000000');

/**
 * Material tonal chip: tinted container with the matching on-colour text.
 * Keeps pills (pending, submitted, course type) on the theme's palette
 * instead of fixed Tailwind colours.
 */
export const getMaterialChipStyle = (
  colorKey: string,
  isDark: boolean = true,
) => {
  const fg = getMaterialOnThemeColor(colorKey, isDark);
  return {
    backgroundColor: `color-mix(in srgb, ${fg} 16%, transparent)`,
    color: fg,
    borderColor: `color-mix(in srgb, ${fg} 32%, transparent)`,
  };
};

export const applyTheme = (settings: AppSettings) => {
  if (typeof document === 'undefined') return;
  const root = getAppRoot();
  const offlineRoot = document.getElementById('offline-root');

  let appliedTheme = settings.themeMode;
  if (appliedTheme === 'auto') {
    const systemDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    appliedTheme = systemDark
      ? settings.pureBlack
        ? 'amoled'
        : 'dark'
      : 'light';
  } else if (appliedTheme === 'dark' && settings.pureBlack) {
    appliedTheme = 'amoled';
  }

  if (root) root.setAttribute('data-theme', appliedTheme);
  if (offlineRoot && offlineRoot !== root)
    offlineRoot.setAttribute('data-theme', appliedTheme);

  let vtopTheme = settings.vtopThemeMode || 'same';
  let appliedVtopTheme = vtopTheme === 'same' ? appliedTheme : vtopTheme;
  if (appliedVtopTheme === 'none') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', appliedVtopTheme);
  }

  const isMonochrome =
    settings.accentColor === 'grey' ||
    (settings as any).accentColor === 'monochrome' ||
    settings.colorSchemeStyle === 'monochrome';
  const baseColor =
    MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.grey;
  const isDark = appliedTheme === 'dark' || appliedTheme === 'amoled';

  const hct = Hct.fromInt(argbFromHex(baseColor));
  const scheme = isMonochrome
    ? new SchemeMonochrome(hct, isDark, 0.0)
    : createMaterialScheme(hct, isDark, settings.colorSchemeStyle || 'vibrant');

  const primaryHex = isMonochrome
    ? isDark
      ? '#a1a1aa'
      : '#52525b'
    : hexFromArgb(scheme.primary);

  const docStyle = document.documentElement.style;
  if (root) root.style.setProperty('--accent-base', primaryHex);
  if (offlineRoot && offlineRoot !== root)
    offlineRoot.style.setProperty('--accent-base', primaryHex);
  docStyle.setProperty('--accent-base', primaryHex);

  // Dark text tone for accent-filled surfaces (login button). Tone 20 of the
  // accent hue stays legible on the light accent tones used in dark themes.
  const accentOnDark = hexFromArgb(Hct.from(hct.hue, hct.chroma, 20).toInt());
  if (root) root.style.setProperty('--accent-on-dark', accentOnDark);
  if (offlineRoot && offlineRoot !== root)
    offlineRoot.style.setProperty('--accent-on-dark', accentOnDark);
  docStyle.setProperty('--accent-on-dark', accentOnDark);

  const makeTonal = (hex: string) => {
    const colorHct = Hct.fromInt(argbFromHex(hex));
    return {
      base: hexFromArgb(
        Hct.from(colorHct.hue, colorHct.chroma, isDark ? 80 : 40).toInt(),
      ),
      onBase: hexFromArgb(
        Hct.from(colorHct.hue, colorHct.chroma, isDark ? 20 : 100).toInt(),
      ),
      container: hexFromArgb(
        Hct.from(colorHct.hue, colorHct.chroma, isDark ? 30 : 90).toInt(),
      ),
      onContainer: hexFromArgb(
        Hct.from(colorHct.hue, colorHct.chroma, isDark ? 90 : 10).toInt(),
      ),
    };
  };

  const success = makeTonal('#22c55e');
  const warning = makeTonal('#f59e0b');
  const info = makeTonal('#0ea5e9');

  const sysColors: Record<string, string> = {
    primary: hexFromArgb(scheme.primary),
    'on-primary': hexFromArgb(scheme.onPrimary),
    'primary-container': hexFromArgb(scheme.primaryContainer),
    'on-primary-container': hexFromArgb(scheme.onPrimaryContainer),
    secondary: hexFromArgb(scheme.secondary),
    'on-secondary': hexFromArgb(scheme.onSecondary),
    'secondary-container': hexFromArgb(scheme.secondaryContainer),
    'on-secondary-container': hexFromArgb(scheme.onSecondaryContainer),
    tertiary: hexFromArgb(scheme.tertiary),
    'on-tertiary': hexFromArgb(scheme.onTertiary),
    'tertiary-container': hexFromArgb(scheme.tertiaryContainer),
    'on-tertiary-container': hexFromArgb(scheme.onTertiaryContainer),
    error: hexFromArgb(scheme.error),
    'on-error': hexFromArgb(scheme.onError),
    'error-container': hexFromArgb(scheme.errorContainer),
    'on-error-container': hexFromArgb(scheme.onErrorContainer),
    background: hexFromArgb(scheme.background),
    'on-background': hexFromArgb(scheme.onBackground),
    surface: hexFromArgb(scheme.surface),
    'on-surface': hexFromArgb(scheme.onSurface),
    'surface-variant': hexFromArgb(scheme.surfaceVariant),
    'on-surface-variant': hexFromArgb(scheme.onSurfaceVariant),
    outline: hexFromArgb(scheme.outline),
    'outline-variant': hexFromArgb(scheme.outlineVariant),
    'inverse-surface': hexFromArgb(scheme.inverseSurface),
    'inverse-on-surface': hexFromArgb(scheme.inverseOnSurface),
    'inverse-primary': hexFromArgb(scheme.inversePrimary),
    'surface-dim': hexFromArgb(scheme.surfaceDim),
    'surface-bright': hexFromArgb(scheme.surfaceBright),
    'surface-container-lowest': hexFromArgb(scheme.surfaceContainerLowest),
    'surface-container-low': hexFromArgb(scheme.surfaceContainerLow),
    'surface-container': hexFromArgb(scheme.surfaceContainer),
    'surface-container-high': hexFromArgb(scheme.surfaceContainerHigh),
    'surface-container-highest': hexFromArgb(scheme.surfaceContainerHighest),
    success: success.base,
    'on-success': success.onBase,
    'success-container': success.container,
    'on-success-container': success.onContainer,
    warning: warning.base,
    'on-warning': warning.onBase,
    'warning-container': warning.container,
    'on-warning-container': warning.onContainer,
    info: info.base,
    'on-info': info.onBase,
    'info-container': info.container,
    'on-info-container': info.onContainer,
  };

  if (appliedTheme === 'amoled') {
    sysColors.background = '#000000';
    sysColors.surface = '#000000';
    sysColors['surface-variant'] = '#000000';
    sysColors['surface-container-lowest'] = '#000000';
    sysColors['surface-container-low'] = '#000000';
    sysColors['surface-container'] = '#000000';
    sysColors['surface-container-high'] = '#050505';
    sysColors['surface-container-highest'] = '#0a0a0a';
    sysColors.outline = '#27272a';
    sysColors['outline-variant'] = '#18181b';
  }

  const extendedTokens: Record<string, string> = {
    '--att-safe': success.base,
    '--att-text-safe': success.onBase,
    '--att-safe-container': success.container,
    '--att-on-safe-container': success.onContainer,

    '--att-warn': warning.base,
    '--att-text-warn': warning.onBase,
    '--att-warn-container': warning.container,
    '--att-on-warn-container': warning.onContainer,

    '--att-danger': hexFromArgb(scheme.error),
    '--att-text-danger': hexFromArgb(scheme.onError),
    '--att-danger-container': hexFromArgb(scheme.errorContainer),
    '--att-on-danger-container': hexFromArgb(scheme.onErrorContainer),

    '--color-success': success.base,
    '--color-warning': warning.base,
    '--color-error': hexFromArgb(scheme.error),
    '--color-info': info.base,
  };

  if (typeof settings.fontScale === 'number' && settings.fontScale > 0) {
    docStyle.fontSize = `${settings.fontScale}%`;
  }

  const wghtMap: Record<string, string> = {
    regular: '400',
    medium: '550',
    bold: '700',
  };
  const wght = wghtMap[settings.fontWeight ?? 'bold'] ?? '700';
  if (root) root.style.setProperty('--app-font-wght', wght);
  if (offlineRoot && offlineRoot !== root)
    offlineRoot.style.setProperty('--app-font-wght', wght);
  docStyle.setProperty('--app-font-wght', wght);

  const animScaleMap: Record<string, string> = {
    '1x': '1',
    '0.5x': '0.5',
    '0x': '0',
  };
  const animScale = animScaleMap[settings.animationScale ?? '1x'] ?? '1';
  if (root) root.style.setProperty('--anim-scale', animScale);
  if (offlineRoot && offlineRoot !== root)
    offlineRoot.style.setProperty('--anim-scale', animScale);
  docStyle.setProperty('--anim-scale', animScale);

  for (const [name, val] of Object.entries(sysColors)) {
    if (root) root.style.setProperty(`--md-sys-color-${name}`, val);
    if (offlineRoot && offlineRoot !== root)
      offlineRoot.style.setProperty(`--md-sys-color-${name}`, val);
    docStyle.setProperty(`--md-sys-color-${name}`, val);
  }

  for (const [name, val] of Object.entries(extendedTokens)) {
    if (root) root.style.setProperty(name, val);
    if (offlineRoot && offlineRoot !== root)
      offlineRoot.style.setProperty(name, val);
    docStyle.setProperty(name, val);
  }
};

interface SettingsStore {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

const encodeStorage = (str: string): string => {
  try {
    return 'enc_' + btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
};

const decodeStorage = (str: string): string => {
  try {
    if (str && str.startsWith('enc_')) {
      return decodeURIComponent(atob(str.slice(4)));
    }
    return str;
  } catch {
    return str;
  }
};

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const indexedDBSettingsStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const rawVal = await idbGet(name);
      if (rawVal !== undefined && rawVal !== null) {
        const strVal =
          typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
        return decodeStorage(strVal);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const encoded = encodeStorage(value);
      await idbSet(name, encoded);
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('retop_settings_channel');
          bc.postMessage({
            type: 'SETTINGS_CHANGED',
            key: name,
            value: encoded,
          });
          bc.close();
        } catch {}
      }
    } catch (e) {
      console.warn('[Settings] IDB write error', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await idbDel(name);
      await idbDel('retop_settings_obj');
    } catch {}
  },
};

let localUpdateTimer: any = null;
let isLocallyUpdating = false;

const setLocalUpdateLock = () => {
  isLocallyUpdating = true;
  if (localUpdateTimer) clearTimeout(localUpdateTimer);
  localUpdateTimer = setTimeout(() => {
    isLocallyUpdating = false;
  }, 1000);
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) => {
        setLocalUpdateLock();
        set((state) => {
          const newSettings = { ...state.settings, [key]: value };
          applyTheme(newSettings);
          return { settings: newSettings };
        });
      },
    }),
    {
      name: 'retop-settings',
      storage: createJSONStorage(() => indexedDBSettingsStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.settings);
        }
      },
    },
  ),
);

export const useSettings = () => {
  return useSettingsStore();
};

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    const bc = new BroadcastChannel('retop_settings_channel');
    bc.onmessage = (event) => {
      if (isLocallyUpdating) return;
      if (event.data?.type === 'SETTINGS_CHANGED') {
        const raw = event.data.value;
        if (raw) {
          try {
            const decoded = decodeStorage(raw);
            const parsed = JSON.parse(decoded);
            const extracted =
              parsed?.state?.settings ||
              parsed?.settings ||
              (parsed?.defaultView ? parsed : null);
            if (extracted) {
              const current = useSettingsStore.getState().settings;
              if (JSON.stringify(current) !== JSON.stringify(extracted)) {
                useSettingsStore.setState({ settings: extracted });
                applyTheme(extracted);
              }
            }
          } catch (e) {
            console.error('Failed to sync settings cross-context', e);
          }
        }
      }
    };
  } catch {}
}

// "Auto" only resolves at apply time, so it must re-run when the OS flips.
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const settings = useSettingsStore.getState().settings;
      if (settings.themeMode !== 'auto') return;
      applyTheme(settings);
      // New object: components that read isDark via the store must re-render.
      useSettingsStore.setState({ settings: { ...settings } });
    });
}

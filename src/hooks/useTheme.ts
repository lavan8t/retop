import { useSettingsStore } from '../utils/settings-store';

export function useIsDark(): boolean {
  const { settings } = useSettingsStore();
  const sysDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    settings.themeMode === 'dark' ||
    settings.themeMode === 'amoled' ||
    (settings.themeMode === 'auto' && sysDark)
  );
}

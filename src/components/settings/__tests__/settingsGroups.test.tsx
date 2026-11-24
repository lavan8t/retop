import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DefaultsSection } from '../DefaultsSection';
import { AppearanceSection } from '../AppearanceSection';
import { DEFAULT_SETTINGS } from '../../../utils/settings-store';

const COLORS = [
  { id: 'blue', hex: '#1B5299', label: 'Blue' },
  { id: 'red', hex: '#C01221', label: 'Red' },
  { id: 'green', hex: '#0F5223', label: 'Green' },
  { id: 'purple', hex: '#7D00B8', label: 'Purple' },
  { id: 'yellow', hex: '#F5B300', label: 'Yellow' },
  { id: 'grey', hex: '#808080', label: 'Monochrome' },
];

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('settings groups', () => {
  let host: HTMLDivElement;
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    root = undefined;
  });

  it('uses segmented M3E lists and keeps time format without date format', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        <DefaultsSection
          settings={DEFAULT_SETTINGS}
          updateSetting={() => {}}
        />,
      );
    });

    expect(host.querySelectorAll('m3e-list[variant="segmented"]')).toHaveLength(
      3,
    );
    expect(host.querySelectorAll('m3e-list-item').length).toBeGreaterThan(0);
    expect(host.textContent).not.toContain('Date Format Pattern');
    expect(host.textContent).toContain('Time Format');
    expect('dateFormat' in DEFAULT_SETTINGS).toBe(false);
  });

  it('uses app accent colors as selectable circles', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    const updateSetting = mock(() => {});

    await act(async () => {
      root!.render(
        <AppearanceSection
          settings={DEFAULT_SETTINGS}
          updateSetting={updateSetting}
          handleThemeChange={() => {}}
          COLORS={COLORS}
        />,
      );
    });

    const chips = Array.from(host.querySelectorAll('m3e-filter-chip'));
    expect(chips).toHaveLength(COLORS.length * 3);
    expect(chips[0].getAttribute('aria-label')).toBe('Blue');

    await act(async () => {
      chips[0].dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
    });
    expect(updateSetting).toHaveBeenCalledWith('accentColor', 'blue');
  });
});

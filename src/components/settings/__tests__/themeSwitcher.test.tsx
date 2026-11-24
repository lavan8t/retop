import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppearanceSection } from '../AppearanceSection';
import { DEFAULT_SETTINGS } from '../../../utils/settings-store';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('shadow-DOM theme switcher', () => {
  let host: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    host.attachShadow({ mode: 'open' });
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host.remove();
  });

  it('uses an M3E button group and fires from inside a shadow root', async () => {
    const handleThemeChange = mock((_e: unknown, _mode: string) => {});
    const container = document.createElement('div');
    host.shadowRoot!.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <AppearanceSection
          settings={{ ...DEFAULT_SETTINGS, themeMode: 'dark' }}
          updateSetting={() => {}}
          handleThemeChange={handleThemeChange}
          COLORS={[]}
        />,
      );
    });

    const group = host.shadowRoot!.querySelector('m3e-button-group');
    const buttons = Array.from(host.shadowRoot!.querySelectorAll('m3e-button'));
    expect(group).not.toBeNull();
    expect(buttons).toHaveLength(3);
    expect(host.shadowRoot!.querySelector('[role="radiogroup"]')).toBeNull();

    const light = buttons.find(
      (button) => button.getAttribute('value') === 'light',
    );
    expect(light).toBeDefined();
    await act(async () => {
      light!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
    });

    expect(handleThemeChange).toHaveBeenCalledTimes(1);
    expect(handleThemeChange.mock.calls[0][1]).toBe('light');
  });
});

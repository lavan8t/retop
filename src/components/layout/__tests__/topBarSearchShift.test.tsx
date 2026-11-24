import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TopBarSearch } from '../TopBarSearch';
import { useAppStore } from '../../../store/appStore';
import type { QuickLink } from '../../../types/vtop';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const timetable: QuickLink = {
  title: 'Time Table',
  url: 'academics/common/StudentTimeTable',
  category: 'Academics',
};

let host: HTMLDivElement;
let root: Root | undefined;
let onNavigate: ReturnType<typeof mock>;

const mount = async (isModernUI: boolean) => {
  useAppStore.getState().setIsModernUI(isModernUI);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <TopBarSearch
        currentView="dashboard"
        isOmniboxOpen={true}
        setIsOmniboxOpen={() => {}}
        menuCategories={[]}
        pinnedLinks={[]}
        onNavigate={onNavigate}
        onTogglePin={() => {}}
        initialQuery="Time Table"
      />,
    );
  });
};

const fire = async (el: Element, type: string, init: MouseEventInit) => {
  await act(async () => {
    el.dispatchEvent(
      new MouseEvent(type, { bubbles: true, composed: true, ...init }),
    );
  });
};

/** The desktop result row (data-index) and the mobile result row both show this link. */
const timetableRows = () =>
  Array.from(host.querySelectorAll('[role="button"]')).filter((el) =>
    el.textContent?.includes('Time Table'),
  );

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  mock.restore();
});

beforeEach(() => {
  onNavigate = mock(() => {});
});

describe('Shift + Timetable opens native VTOP in both UI states', () => {
  for (const isModernUI of [true, false]) {
    const state = isModernUI ? 'retop active' : 'on VTOP page';

    it(`${state}: desktop Shift+mousedown forces legacy`, async () => {
      await mount(isModernUI);
      const button = Array.from(
        host.querySelectorAll<HTMLButtonElement>('button[data-search-index]'),
      ).find((b) => b.textContent?.includes('Time Table'));
      expect(button).toBeDefined();

      await fire(button!, 'mousedown', { shiftKey: true });

      expect(onNavigate).toHaveBeenCalled();
      const [link, forceLegacy] = onNavigate.mock.calls[0];
      expect(link.url).toBe(timetable.url);
      expect(forceLegacy).toBe(true);
    });

    it(`${state}: mobile Shift+click forces legacy`, async () => {
      await mount(isModernUI);
      const row = timetableRows().find(
        (el) =>
          el.getAttribute('role') === 'button' &&
          el.textContent?.includes('Time Table'),
      );
      expect(row).toBeDefined();

      await fire(row!, 'click', { shiftKey: true });

      expect(onNavigate).toHaveBeenCalled();
      const [link, forceLegacy] = onNavigate.mock.calls[0];
      expect(link.url).toBe(timetable.url);
      expect(forceLegacy).toBe(true);
    });

    it(`${state}: Shift+Enter on a focused result row forces legacy`, async () => {
      await mount(isModernUI);
      const row = timetableRows()[0];
      expect(row).toBeDefined();

      await act(async () => {
        row.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            shiftKey: true,
            bubbles: true,
            composed: true,
          }),
        );
      });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      const [link, forceLegacy] = onNavigate.mock.calls[0];
      expect(link.url).toBe(timetable.url);
      expect(forceLegacy).toBe(true);
    });

    it(`${state}: Shift+Enter forces legacy`, async () => {
      await mount(isModernUI);
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            shiftKey: true,
            bubbles: true,
          }),
        );
      });

      expect(onNavigate).toHaveBeenCalled();
      const [link, forceLegacy] = onNavigate.mock.calls[0];
      expect(link.url).toBe(timetable.url);
      expect(forceLegacy).toBe(true);
    });
  }
});

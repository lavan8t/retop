import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TopBar } from '../TopBar';
import { useAppStore } from '../../../store/appStore';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type ViewMode = 'grid' | 'list' | 'week';

let host: HTMLDivElement;
let root: Root | undefined;
let originalModes: { ttViewMode: ViewMode; calViewMode: 'grid' | 'list' };

const mount = async (currentView = 'timetable') => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <TopBar
        currentView={currentView}
        contentTitle={currentView}
        handleLinkClick={() => {}}
        setCurrentView={() => {}}
        pinnedLinks={[]}
      />,
    );
  });
};

const groups = () =>
  Array.from(host.querySelectorAll('m3e-button-group[variant="connected"]'));

const buttonsOf = (group: Element) =>
  Array.from(group.querySelectorAll('m3e-button')) as HTMLElement[];

const isSelected = (button: Element) => {
  const selected = button.getAttribute('selected');
  return selected !== null && selected !== 'false';
};

const selectedButtons = (group: Element) => buttonsOf(group).filter(isSelected);

const selectedValue = (group: Element) =>
  buttonsOf(group).find(isSelected)?.getAttribute('value');

/** happy-dom has no M3E upgrade: mimic its self-toggle so re-taps are covered. */
const simulateM3eClickToggle = () => {
  for (const group of groups()) {
    const items = buttonsOf(group);
    for (const button of items) {
      button.addEventListener('click', () => {
        const wasSelected = isSelected(button);
        items.forEach((item) => item.setAttribute('selected', 'false'));
        if (!wasSelected) button.setAttribute('selected', 'true');
      });
    }
  }
};

const click = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
  });
};

beforeEach(() => {
  originalModes = {
    ttViewMode: useAppStore.getState().ttViewMode,
    calViewMode: useAppStore.getState().calViewMode,
  };
  useAppStore.setState({ ttViewMode: 'grid', calViewMode: 'grid' });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  useAppStore.setState(originalModes);
});

describe('timetable view switcher', () => {
  it('uses connected M3E toggle groups for grid/list/week on desktop and mobile', async () => {
    await mount();
    expect(groups()).toHaveLength(1);

    const openOptions = host.querySelector('[aria-label="Page options"]')!;
    await click(openOptions);
    expect(groups()).toHaveLength(2);

    for (const group of groups()) {
      const buttons = buttonsOf(group);
      expect(buttons.map((button) => button.getAttribute('value'))).toEqual([
        'grid',
        'list',
        'week',
      ]);
      for (const button of buttons) {
        expect(button.hasAttribute('toggle')).toBe(true);
        expect(button.getAttribute('aria-label')).toBeTruthy();
      }
      expect(selectedValue(group)).toBe('grid');
    }
  });

  it('clicking a view updates the store and the selected button in every group', async () => {
    await mount();
    await click(host.querySelector('[aria-label="Page options"]')!);

    for (const mode of ['list', 'week', 'grid'] as ViewMode[]) {
      for (const group of groups()) {
        const button = buttonsOf(group).find(
          (candidate) => candidate.getAttribute('value') === mode,
        )!;
        await click(button);
        expect(useAppStore.getState().ttViewMode).toBe(mode);
        expect(selectedValue(group)).toBe(mode);
      }
    }
  });

  it('re-tapping the selected view leaves one selected button and unchanged state', async () => {
    await mount();
    await click(host.querySelector('[aria-label="Page options"]')!);
    simulateM3eClickToggle();

    for (const group of groups()) {
      for (const value of ['grid', 'list'] as ViewMode[]) {
        const button = buttonsOf(group).find(
          (candidate) => candidate.getAttribute('value') === value,
        )!;
        await click(button);
        expect(useAppStore.getState().ttViewMode).toBe(value);
        await click(button); // M3E would toggle it off; controlled state must win.
        expect(useAppStore.getState().ttViewMode).toBe(value);
        expect(selectedButtons(group)).toEqual([button]);
      }
    }
  });
});

describe('calendar view switcher', () => {
  it('uses connected M3E toggle groups for grid/list on desktop and mobile', async () => {
    await mount('calendar');
    expect(groups()).toHaveLength(1);

    await click(host.querySelector('[aria-label="Page options"]')!);
    expect(groups()).toHaveLength(2);

    for (const group of groups()) {
      expect(
        buttonsOf(group).map((button) => button.getAttribute('value')),
      ).toEqual(['grid', 'list']);
      for (const button of buttonsOf(group)) {
        expect(button.hasAttribute('toggle')).toBe(true);
        expect(button.getAttribute('aria-label')).toBeTruthy();
      }
      expect(selectedValue(group)).toBe('grid');
    }
  });

  it('re-tapping the selected view leaves one selected button and unchanged state', async () => {
    await mount('calendar');
    await click(host.querySelector('[aria-label="Page options"]')!);
    simulateM3eClickToggle();

    for (const group of groups()) {
      for (const value of ['grid', 'list'] as const) {
        const button = buttonsOf(group).find(
          (candidate) => candidate.getAttribute('value') === value,
        )!;
        await click(button);
        expect(useAppStore.getState().calViewMode).toBe(value);
        await click(button); // M3E would toggle it off; controlled state must win.
        expect(useAppStore.getState().calViewMode).toBe(value);
        expect(selectedButtons(group)).toEqual([button]);
      }
    }
  });
});

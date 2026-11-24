import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TimetableWeek } from '../TimetableWeek';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root | undefined;

const buttons = () =>
  Array.from(host.querySelectorAll('m3e-button')) as HTMLElement[];

const isSelected = (button: Element) => {
  const selected = button.getAttribute('selected');
  return selected !== null && selected !== 'false';
};

const selectedValue = () => buttons().find(isSelected)?.getAttribute('value');

const click = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
  });
};

/** happy-dom has no M3E upgrade: mimic its self-toggle so re-taps are covered. */
const simulateM3eClickToggle = () => {
  const items = buttons();
  for (const button of items) {
    button.addEventListener('click', () => {
      const wasSelected = isSelected(button);
      items.forEach((item) => item.setAttribute('selected', 'false'));
      if (!wasSelected) button.setAttribute('selected', 'true');
    });
  }
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host.remove();
  root = undefined;
});

describe('timetable week day selector', () => {
  it('uses one connected M3E group and moves selection on click', async () => {
    await act(async () => {
      root!.render(<TimetableWeek courses={[]} attendance={[]} />);
    });

    const group = host.querySelector('m3e-button-group[variant="connected"]')!;
    expect(group).not.toBeNull();
    expect(buttons().map((button) => button.getAttribute('value'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
    for (const button of buttons()) {
      expect(button.hasAttribute('toggle')).toBe(true);
    }

    await click(buttons()[2]);
    expect(selectedValue()).toBe('2');
  });

  it('re-tapping the selected day leaves exactly one selected button', async () => {
    await act(async () => {
      root!.render(<TimetableWeek courses={[]} attendance={[]} />);
    });
    simulateM3eClickToggle();
    const initial = buttons().find(isSelected)!;

    await click(initial);
    expect(isSelected(initial)).toBe(true);
    expect(buttons().filter(isSelected)).toEqual([initial]);
    expect(selectedValue()).toBe(initial.getAttribute('value'));

    const other = buttons().find((button) => button !== initial)!;
    await click(other);
    await click(other); // M3E would toggle it off; controlled state must win.
    expect(buttons().filter(isSelected)).toEqual([other]);
    expect(selectedValue()).toBe(other.getAttribute('value'));
  });
});

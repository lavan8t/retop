import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TopBar } from '../TopBar';
import { useDataStore } from '../../../store/dataStore';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root | undefined;
let onSync: ReturnType<typeof mock>;
let originalSyncTimes: Record<string, number>;

const mount = async (currentView = 'digitalAssignments') => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <TopBar
        currentView={currentView}
        contentTitle="Assignments"
        handleLinkClick={() => {}}
        setCurrentView={() => {}}
        pinnedLinks={[]}
        onSync={onSync}
      />,
    );
  });
};

const reloadButtons = () =>
  Array.from(host.querySelectorAll<HTMLElement>('[aria-label]')).filter((el) =>
    /reload|refresh|sync/i.test(el.getAttribute('aria-label') || ''),
  );

const tooltip = () => host.querySelector('m3e-tooltip[for="topbar-reload"]');

beforeEach(() => {
  onSync = mock(() => {});
  originalSyncTimes = useDataStore.getState().pageSyncTimes;
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  useDataStore.setState({ pageSyncTimes: originalSyncTimes });
});

describe('single shell reload button', () => {
  it('renders exactly one M3E reload with a matching tooltip', async () => {
    await mount();
    expect(reloadButtons()).toHaveLength(1);
    expect(reloadButtons()[0].tagName.toLowerCase()).toBe('m3e-icon-button');
    expect(tooltip()).not.toBeNull();
  });

  it('reloads through the shell callback, not a page-local refresh', async () => {
    await mount();
    await act(async () => {
      reloadButtons()[0].dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
    });
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('shows the assignments page last-sync age in the tooltip', async () => {
    useDataStore.setState({
      pageSyncTimes: { digitalAssignments: Date.now() - 1 * 60_000 },
    });
    await mount();
    expect(tooltip()?.textContent).toBe('Synced 1m ago');

    await act(async () => {
      useDataStore.setState({
        pageSyncTimes: { digitalAssignments: Date.now() - 2 * 60 * 60_000 },
      });
    });
    expect(tooltip()?.textContent).toBe('Synced 2h ago');
  });
});

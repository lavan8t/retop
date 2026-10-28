/**
 * Retop Navigation Guard
 *
 * Intercepts view switches, back navigation, and page unload whenever critical
 * or time-sensitive work is in progress (e.g., DA upload OTP verification,
 * in-flight file uploads, or multi-step permission applications).
 *
 * Prompts the user using Retop's Material 3 AlertDialog before navigating away.
 */

import { useEffect } from 'react';
import { showAlertDialog } from '../components/ui/AlertDialog';

export interface GuardOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export type GuardChecker = () => GuardOptions | boolean | null;

const activeGuards = new Map<string, GuardOptions | GuardChecker>();
let bypassNextNavigation = false;

/**
 * Registers an active navigation guard.
 * Returns an unregister function.
 */
export function registerNavigationGuard(
  id: string,
  guard: GuardOptions | GuardChecker,
): () => void {
  activeGuards.set(id, guard);
  return () => {
    activeGuards.delete(id);
  };
}

/**
 * Unregisters a navigation guard by its ID.
 */
export function unregisterNavigationGuard(id: string): void {
  activeGuards.delete(id);
}

/**
 * Checks if any navigation guard is currently active.
 * Returns the highest priority GuardOptions if active, otherwise null.
 */
export function getActiveNavigationGuard(): GuardOptions | null {
  for (const [, entry] of activeGuards.entries()) {
    if (typeof entry === 'function') {
      const result = entry();
      if (result) {
        if (typeof result === 'object') return result;
        return {
          title: 'Discard Unsaved Changes?',
          message:
            'You have unsaved changes or an active session. Navigating away will discard your progress. Are you sure you want to exit?',
          confirmText: 'Discard & Exit',
          cancelText: 'Stay',
        };
      }
    } else if (entry) {
      return entry;
    }
  }
  return null;
}

/**
 * If any guard is active, prompts the user via Retop's Material 3 AlertDialog.
 * Returns true if navigation can proceed (either no guard, or user confirmed 'Discard & Exit').
 * Returns false if navigation must be aborted (user chose to stay).
 */
export async function confirmNavigation(): Promise<boolean> {
  if (bypassNextNavigation) {
    bypassNextNavigation = false;
    return true;
  }

  const guard = getActiveNavigationGuard();
  if (!guard) {
    return true;
  }

  const confirmed = await showAlertDialog({
    title: guard.title || 'Discard Unsaved Changes?',
    message: guard.message,
    confirmText: guard.confirmText || 'Discard & Exit',
    cancelText: guard.cancelText || 'Stay',
  });

  if (confirmed) {
    // Clear active guards and temporarily bypass so the subsequent route change proceeds without re-prompting
    activeGuards.clear();
    bypassNextNavigation = true;
    setTimeout(() => {
      bypassNextNavigation = false;
    }, 500);
    return true;
  }

  return false;
}

/**
 * React hook to register a navigation guard while a condition is active.
 * Automatically arms beforeunload to protect against accidental tab close or page reload.
 */
export function useNavigationGuard(
  active: boolean,
  options: GuardOptions | GuardChecker,
  id = 'default',
): void {
  useEffect(() => {
    if (!active) {
      activeGuards.delete(id);
      return;
    }

    activeGuards.set(id, options);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      activeGuards.delete(id);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active, id, options]);
}

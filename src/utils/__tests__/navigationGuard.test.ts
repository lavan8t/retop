import { describe, expect, it, beforeEach } from 'bun:test';
import {
  registerNavigationGuard,
  unregisterNavigationGuard,
  getActiveNavigationGuard,
  confirmNavigation,
} from '../navigationGuard';

describe('navigation guard and unsaved work protection', () => {
  beforeEach(() => {
    unregisterNavigationGuard('test-guard');
    unregisterNavigationGuard('second-guard');
    unregisterNavigationGuard('da-upload-active');
    unregisterNavigationGuard('late-hour-draft');
  });

  it('reports null when no guards are registered', () => {
    expect(getActiveNavigationGuard()).toBeNull();
  });

  it('registers and retrieves an active navigation guard', () => {
    const unregister = registerNavigationGuard('test-guard', {
      title: 'Exit OTP Verification?',
      message: 'Active OTP session will be lost.',
    });

    const active = getActiveNavigationGuard();
    expect(active).not.toBeNull();
    expect(active?.title).toBe('Exit OTP Verification?');
    expect(active?.message).toBe('Active OTP session will be lost.');

    unregister();
    expect(getActiveNavigationGuard()).toBeNull();
  });

  it('supports functional checker guards', () => {
    let shouldBlock = false;
    registerNavigationGuard('checker-guard', () => {
      if (!shouldBlock) return null;
      return {
        title: 'Draft Unsaved',
        message: 'You have a draft.',
      };
    });

    expect(getActiveNavigationGuard()).toBeNull();

    shouldBlock = true;
    const active = getActiveNavigationGuard();
    expect(active).not.toBeNull();
    expect(active?.title).toBe('Draft Unsaved');

    unregisterNavigationGuard('checker-guard');
  });

  it('allows navigation immediately when no guard is active', async () => {
    const canProceed = await confirmNavigation();
    expect(canProceed).toBe(true);
  });
});

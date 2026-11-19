import { describe, expect, it } from 'bun:test';

/**
 * The document_start bootstrapper runs main() at import time and needs Chrome
 * globals, so it cannot be unit-tested in place. These assertions guard the
 * exact fallback policy that was narrowed: keep the slow-mount watchdog gone,
 * keep the hard load timeout and the explicit/bootstrap-only handoffs.
 */
const content = async () =>
  await Bun.file(new URL('../../content.ts', import.meta.url)).text();
const login = async () =>
  await Bun.file(new URL('../../content/login.tsx', import.meta.url)).text();

describe('login takeover fallback policy', () => {
  it('removes the short no-UI watchdog but keeps the 45s hard load timeout', async () => {
    const src = await content();
    expect(src).not.toContain('TAKEOVER_WATCHDOG_MS');
    expect(src).not.toContain('setTimeout(giveUp, 6000)');
    expect(src).toContain('setTimeout(giveUp, 45000)');
  });

  it('keeps the bootstrap-impossibility handoff (import failure reveals native)', async () => {
    const src = await content();
    expect(src).toContain("loadEntry('login.js')");
    expect(src).toContain('[retop] Login takeover failed to load:');
    expect(src).toContain('revealNative(true)');
  });

  it('keeps the explicit reCAPTCHA handoff and the ASCII-art login surface', async () => {
    const src = await login();
    expect(src).toContain('onRecaptchaRequired={useNativeLogin}');
    expect(src).toContain('<AsciiPanel');
    expect(src).toContain('<VtopLoginCard');
    // The old boundary that reloaded into legacy VTOP is now its own module.
    expect(src).not.toContain('class LoginErrorBoundary');
  });
});

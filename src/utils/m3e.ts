/**
 * Ensures the M3E web components used by the Attendance and Grade History
 * screens are registered. Styling comes from --md-sys-* tokens
 * (see styles/m3e-tokens.css).
 *
 * Custom elements must be defined in the MAIN world: the content script's
 * isolated world has a null `customElements`, so importing M3E here throws
 * (`Cannot read properties of null (reading 'get')`). Instead we ask the
 * background to inject `m3e-inject.js` (a standalone IIFE) into the main world,
 * where the registry upgrades the `m3e-*` tags already mounted in the page.
 */
let registration: Promise<void> | undefined;

export function ensureM3eComponents(): Promise<void> {
  if (!registration) {
    registration = new Promise<void>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'INJECT_M3E' }, (res: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success === false) {
            reject(new Error(res.error || 'main-world injection failed'));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    }).catch((err) => {
      // M3E is optional UI: plain HTML controls still work without it.
      // Log the stack so the failing deferred chunk/line is identifiable.
      console.warn(
        '[retop] M3E components could not be registered.',
        err?.stack || err,
      );
    });
  }
  return registration;
}

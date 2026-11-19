/**
 * Registers the M3E web components used by the Attendance and Grade History
 * screens. Styling comes from --md-sys-* tokens (see styles/m3e-tokens.css).
 *
 * Registration is deferred on purpose. These components evaluate Lit and the
 * whole M3E runtime at import time (module-level registerStyleSheet calls and
 * custom-element definitions). When that evaluation throws in a content
 * script, the rejection propagates through `import('dashboard.js')` and the
 * bootstrapper hands the page back to native VTOP. Keeping M3E out of the
 * dashboard entry's static import graph confines any such failure to the two
 * screens that actually use it.
 */
let registration: Promise<void> | undefined;

export function ensureM3eComponents(): Promise<void> {
  if (!registration) {
    registration = Promise.all([
      import('@m3e/web/theme'),
      import('@m3e/web/button'),
      import('@m3e/web/icon-button'),
      import('@m3e/web/icon'),
      import('@m3e/web/list'),
      import('@m3e/web/card'),
      import('@m3e/web/chips'),
      import('@m3e/web/switch'),
      import('@m3e/web/dialog'),
      import('@m3e/web/snackbar'),
      import('@m3e/web/progress-indicator'),
      import('@m3e/web/tabs'),
      import('@m3e/web/segmented-button'),
      import('@m3e/web/form-field'),
      import('@m3e/web/tooltip'),
      import('@m3e/web/split-pane'),
      import('@m3e/web/paginator'),
    ])
      .then(() => undefined)
      .catch((err) => {
        // M3E is optional UI: plain HTML controls still work without it.
        console.warn('[retop] M3E components could not be registered.', err);
      });
  }
  return registration;
}

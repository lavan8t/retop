/**
 * Main-world M3E registration.
 *
 * Custom elements must be defined by the MAIN world's `customElements` registry
 * to upgrade the `m3e-*` tags React mounts into VTOP's document. Content
 * scripts run in an isolated world where `customElements` is null, so this file
 * is built as a standalone IIFE and injected with
 * `chrome.scripting.executeScript({ world: 'MAIN' })`.
 *
 * These are static side-effect imports on purpose: the whole M3E runtime is
 * inlined into this one bundle, with no dynamic imports or chunks at runtime.
 */
import '@m3e/web/theme';
import '@m3e/web/button';
import '@m3e/web/button-group';
import '@m3e/web/icon-button';
import '@m3e/web/icon';
import '@m3e/web/list';
import '@m3e/web/card';
import '@m3e/web/chips';
import '@m3e/web/switch';
import '@m3e/web/dialog';
import '@m3e/web/snackbar';
import '@m3e/web/progress-indicator';
import '@m3e/web/tabs';
import '@m3e/web/segmented-button';
import '@m3e/web/form-field';
import '@m3e/web/tooltip';
import '@m3e/web/split-pane';
import '@m3e/web/paginator';

// The background probes this flag before injecting, so the script normally
// runs once per page. The guard keeps a duplicate injection harmless.
if (typeof window !== 'undefined' && !window.__retopM3eRegistered) {
  window.__retopM3eRegistered = true;
}

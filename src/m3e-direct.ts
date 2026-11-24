/**
 * Direct M3E registration for extension/PWA pages that own the main world.
 * Content scripts must use `ensureM3eComponents()` instead because their
 * `customElements` registry is unavailable in the isolated world.
 */
import '@m3e/web/theme';
import '@m3e/web/button';
import '@m3e/web/button-group';
import '@m3e/web/icon-button';
import '@m3e/web/icon';
import '@m3e/web/list';
import '@m3e/web/card';
import '@m3e/web/badge';
import '@m3e/web/chips';
import '@m3e/web/switch';
import '@m3e/web/checkbox';
import '@m3e/web/dialog';
import '@m3e/web/snackbar';
import '@m3e/web/progress-indicator';
import '@m3e/web/nav-rail';
import '@m3e/web/nav-bar';
import '@m3e/web/fab';
import '@m3e/web/tabs';
import '@m3e/web/form-field';
import '@m3e/web/select';
import '@m3e/web/option';
import '@m3e/web/tooltip';
import '@m3e/web/split-pane';
import '@m3e/web/paginator';

if (typeof window !== 'undefined') {
  window.__retopM3eRegistered = true;
}

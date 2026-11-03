/**
 * Node ids retop injects into the VTOP document.
 *
 * `content.ts` cannot import this module (the bootstrapper must stay import
 * free), so its local fallback list mirrors this array. Every other caller
 * imports from here so teardown and the dashboard cannot drift apart.
 */
export const DARK_STYLESHEET_ID = 'retop-dark-stylesheet';

export const RETOP_NODE_IDS = [
  'retop-host',
  'retop-boot-cloak',
  'retop-early-cloak',
  'retop-open-loader',
  'retop-document-sizing',
  'retop-shadow-reset',
  'retop-global-css',
  DARK_STYLESHEET_ID,
  'retop-material-symbols-style',
  'retop-native-portals',
  'retop-legacy-menu-search-wrapper',
  'retop-session-dialog',
  'retop-halted-banner',
  'retop-hmenu-search-toggle',
  'retop-vtop-search-menu',
  'retop-splash-style',
  'vtop-prelogin-theme',
  'vtop-login-theme',
  'vtop-early-theme',
];

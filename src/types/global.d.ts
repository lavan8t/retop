declare const __BUILD_NUMBER__: string;

interface Window {
  /** Set by teardown once the page has been handed back to VTOP. */
  __retopAborted?: boolean;
  /** Published by the dashboard entry so the bootstrapper can reuse teardown. */
  __retopDismantle?: () => void;
}

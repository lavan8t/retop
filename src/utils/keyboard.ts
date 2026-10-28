/**
 * Retop Keyboard and Input Utilities
 *
 * Provides shadow-DOM-aware input element detection to prevent global hotkeys
 * (0-9, Backspace, Space, '/', etc.) from firing while the user is typing in any
 * input field, textarea, contenteditable, or form control.
 */

/**
 * Recursively inspects the document and any nested open shadow roots to locate
 * the true active/focused element.
 */
export function getDeepActiveElement(
  root: Document | ShadowRoot = document,
): Element | null {
  let active = root.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * Checks whether an element is an editable input, textarea, select, contenteditable,
 * or form control where user keystrokes should be treated as text entry.
 */
export function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;

  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  const htmlEl = el as HTMLElement;
  if (htmlEl.isContentEditable || htmlEl.contentEditable === 'true') {
    return true;
  }

  // Handle ARIA or nested form controls inside web components / shadow DOM
  if (typeof el.closest === 'function') {
    const matched = el.closest(
      "input, textarea, select, [contenteditable='true'], [role='textbox'], [role='searchbox'], [role='combobox']",
    );
    if (matched) return true;
  }

  return false;
}

/**
 * Determines whether a keyboard event originated from typing into an input field,
 * taking into account event retargeting across Shadow DOM boundaries.
 *
 * Checks:
 * 1. e.composedPath() entries to find the real inner target inside Shadow DOM.
 * 2. e.target as fallback.
 * 3. getDeepActiveElement() to check if focus is currently held by an input element.
 */
export function isTypingEvent(e: KeyboardEvent): boolean {
  // 1. Inspect composed path (crucial for Shadow DOM isolation like #retop-host)
  if (typeof e.composedPath === 'function') {
    const path = e.composedPath();
    for (const item of path) {
      if (isInputElement(item)) {
        return true;
      }
    }
  }

  // 2. Direct event target
  if (isInputElement(e.target)) {
    return true;
  }

  // 3. Deep active element
  const deepActive = getDeepActiveElement();
  if (isInputElement(deepActive)) {
    return true;
  }

  return false;
}

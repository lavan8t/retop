/** Page-scoped semester memory for VTOP pages. */
const key = (page: string) => `retop-${page}-selected-sem`;

export const readRememberedSem = (page: string): string => {
  try {
    return localStorage.getItem(key(page)) || '';
  } catch {
    return '';
  }
};

export const rememberSem = (page: string, semId: string): void => {
  if (!semId) return;
  try {
    localStorage.setItem(key(page), semId);
  } catch {}
};

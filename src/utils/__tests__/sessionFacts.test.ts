import { describe, expect, it } from 'bun:test';
import {
  createSessionFacts,
  detectSessionMode,
  extractCsrfFromHtml,
  extractRegNoFromHtml,
  extractSessionFactsFromHtml,
  readSessionFactsFromDocument,
  type SessionMode,
} from '../sessionFacts';

describe('session facts', () => {
  it('extracts csrf from every VTOP HTML rendering', () => {
    expect(
      extractCsrfFromHtml('<input name="_csrf" value="csrf-token-abc">'),
    ).toBe('csrf-token-abc');
    expect(
      extractCsrfFromHtml('<meta name="_csrf" content="csrf-token-meta">'),
    ).toBe('csrf-token-meta');
    expect(extractCsrfFromHtml("var csrfValue = 'csrf-token-var';")).toBe(
      'csrf-token-var',
    );
    expect(extractCsrfFromHtml('<div>no token</div>')).toBeNull();
  });

  it('extracts only the registration number, never the username', () => {
    expect(
      extractRegNoFromHtml('<input id="authorizedIDX" value="21BCE1234">'),
    ).toBe('21BCE1234');
    expect(
      extractRegNoFromHtml('<input name="authorizedID" value="21BCE1234">'),
    ).toBe('21BCE1234');
    // A sign-in form has a username but no registration number yet.
    expect(
      extractRegNoFromHtml('<input name="username" value="21BCE1234">'),
    ).toBeNull();
    expect(extractSessionFactsFromHtml('<div>empty</div>')).toEqual({
      csrf: undefined,
      regNo: undefined,
    });
  });

  it('reads live DOM facts with the last-active-input rule', () => {
    document.body.innerHTML = `
      <input name="_csrf" value="stale-token-1">
      <input name="_csrf" value="fresh-token-2">
      <input id="authorizedIDX" value="21BCE1234">
    `;
    const facts = readSessionFactsFromDocument(document, {});
    expect(facts).toEqual({ csrf: 'fresh-token-2', regNo: '21BCE1234' });
  });

  it('falls back to window globals when the DOM has no inputs', () => {
    document.body.innerHTML = '<div>no inputs</div>';
    expect(
      readSessionFactsFromDocument(document, {
        csrfValue: 'global-token-1',
        authorizedID: '21BCE9999',
      }),
    ).toEqual({ csrf: 'global-token-1', regNo: '21BCE9999' });
  });

  it('reports distinct session modes and mirrors accepted facts', () => {
    const modes: SessionMode[] = ['ambient', 'jar'];
    expect(modes).toContain(detectSessionMode());

    const session = createSessionFacts({ mode: 'jar' });
    expect(session.mode).toBe('jar');
    session.update({ csrf: 'new-token-1', regNo: '21BCE5555' });
    expect(session.csrf).toBe('new-token-1');
    expect(session.regNo).toBe('21BCE5555');
    // Short or missing values never overwrite a good fact.
    session.update({ csrf: 'x', regNo: 'y' });
    expect(session.csrf).toBe('new-token-1');
    expect(session.regNo).toBe('21BCE5555');
  });
});

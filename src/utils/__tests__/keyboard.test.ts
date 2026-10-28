import { describe, expect, it, beforeEach } from 'bun:test';
import {
  isInputElement,
  getDeepActiveElement,
  isTypingEvent,
} from '../keyboard';

describe('keyboard and input event security', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('correctly identifies standard HTML form input elements', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const div = document.createElement('div');
    const button = document.createElement('button');

    expect(isInputElement(input)).toBe(true);
    expect(isInputElement(textarea)).toBe(true);
    expect(isInputElement(select)).toBe(true);
    expect(isInputElement(div)).toBe(false);
    expect(isInputElement(button)).toBe(false);
  });

  it('identifies contenteditable elements as inputs', () => {
    const editableDiv = document.createElement('div');
    editableDiv.contentEditable = 'true';

    expect(isInputElement(editableDiv)).toBe(true);
  });

  it('identifies nested elements inside input controls or role=textbox', () => {
    const roleBox = document.createElement('div');
    roleBox.setAttribute('role', 'textbox');
    const childSpan = document.createElement('span');
    roleBox.appendChild(childSpan);
    document.body.appendChild(roleBox);

    expect(isInputElement(childSpan)).toBe(true);
  });

  it('detects deep active elements inside Shadow DOM', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const innerInput = document.createElement('input');
    innerInput.type = 'text';
    shadow.appendChild(innerInput);

    innerInput.focus();

    const deepActive = getDeepActiveElement();
    expect(deepActive).toBe(innerInput);
    expect(isInputElement(deepActive)).toBe(true);
  });

  it('identifies typing events when event target or composedPath is an input', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: '1',
      bubbles: true,
      composed: true,
    });

    Object.defineProperty(event, 'target', { value: input });
    Object.defineProperty(event, 'composedPath', {
      value: () => [input, document.body, document, window],
    });

    expect(isTypingEvent(event)).toBe(true);
  });

  it('identifies typing events even when retargeted across Shadow DOM boundaries', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const innerOtpInput = document.createElement('input');
    innerOtpInput.type = 'text';
    innerOtpInput.maxLength = 6;
    shadow.appendChild(innerOtpInput);

    // Simulated event retargeted by browser to host element at window level
    const event = new KeyboardEvent('keydown', {
      key: '5',
      bubbles: true,
      composed: true,
    });

    // In native shadow DOM, e.target is retargeted to host, but composedPath[0] is innerOtpInput
    Object.defineProperty(event, 'target', { value: host });
    Object.defineProperty(event, 'composedPath', {
      value: () => [
        innerOtpInput,
        shadow,
        host,
        document.body,
        document,
        window,
      ],
    });

    expect(isTypingEvent(event)).toBe(true);
  });

  it('returns false for events fired on non-input elements', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const event = new KeyboardEvent('keydown', {
      key: '0',
      bubbles: true,
      composed: true,
    });

    Object.defineProperty(event, 'target', { value: container });
    Object.defineProperty(event, 'composedPath', {
      value: () => [container, document.body, document, window],
    });

    expect(isTypingEvent(event)).toBe(false);
  });
});

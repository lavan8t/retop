import { afterEach, describe, expect, it } from 'bun:test';
import { isLiveVtopContext } from '../vtopBridge';

const originalLocation = window.location;

function setHost(hostname: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname },
  });
}

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

const LIVE_HOSTS = [
  'vtop.vit.ac.in',
  'vtopcc.vit.ac.in',
  'vtop.vitap.ac.in',
  'sub.vtop.vitap.ac.in',
];

const FOREIGN_HOSTS = [
  'vtop.vitap.ac.in.evil.com',
  'evilvtop.vit.ac.in',
  'vitap.ac.in',
  'getretop.web.app',
];

describe('isLiveVtopContext', () => {
  it('accepts Vellore, Chennai and AP hosts', () => {
    for (const hostname of LIVE_HOSTS) {
      setHost(hostname);
      expect(isLiveVtopContext()).toBe(true);
    }
  });

  it('rejects lookalike hosts', () => {
    for (const hostname of FOREIGN_HOSTS) {
      setHost(hostname);
      expect(isLiveVtopContext()).toBe(false);
    }
  });
});

// content.ts is the import-free document_start bootstrapper; its local VTOP_HOST
// gate must agree with the bridge. Import with a non-VTOP host so main() returns
// before any side effects, then drive the exported regex directly.
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { hostname: 'example.com' },
});
const { VTOP_HOST } = await import('../../content');
Object.defineProperty(window, 'location', {
  configurable: true,
  value: originalLocation,
});

describe('content.ts VTOP_HOST', () => {
  it('accepts Vellore, Chennai and AP hosts', () => {
    for (const hostname of LIVE_HOSTS) {
      expect(VTOP_HOST.test(hostname)).toBe(true);
    }
  });

  it('rejects lookalike hosts', () => {
    for (const hostname of FOREIGN_HOSTS) {
      expect(VTOP_HOST.test(hostname)).toBe(false);
    }
  });
});

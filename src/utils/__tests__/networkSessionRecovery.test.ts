import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { VTOPNetwork } from '../network';

/**
 * The recovery branch runs after an async diagnostic, so the tests await the
 * handler's promise and drive the diagnostic through a stubbed window.fetch.
 */
describe('session expiry recovery', () => {
  const originalFetch = window.fetch;
  const originalAssign = window.location.assign;
  let assignTarget: string | null;

  const stubFetch = (openPageStatus: number) => {
    window.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes('generate_204')) {
        return new Response(null, { status: 204 });
      }
      return new Response('', { status: openPageStatus });
    }) as typeof fetch;
  };

  beforeEach(() => {
    VTOPNetwork.resetNetworkErrorState();
    assignTarget = null;
    Object.defineProperty(window.location, 'assign', {
      configurable: true,
      value: (url: string) => {
        assignTarget = url;
      },
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    stubFetch(200);
  });

  afterEach(() => {
    window.fetch = originalFetch;
    Object.defineProperty(window.location, 'assign', {
      configurable: true,
      value: originalAssign,
    });
  });

  it('redirects to login when the diagnostic confirms session expiry', async () => {
    stubFetch(401);

    await VTOPNetwork.handleNetworkFailure('HTTP Status 401', true);

    expect(assignTarget).toBe('/vtop/login');
    expect(VTOPNetwork.has404Error).toBe(true);
  });

  it('releases the request latch when the failure is transient', async () => {
    await VTOPNetwork.handleNetworkFailure('HTTP Status 403', true);

    expect(assignTarget).toBe(null);
    expect(VTOPNetwork.has404Error).toBe(false);
  });
});

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  VtopClient,
  RECAPTCHA_REQUIRED,
  type CaptchaData,
  type LoginResult,
} from '../../../utils/vtopClient';

/**
 * Stub the pixel solver: each newly rendered image gets a distinct answer, so
 * a POST that reuses the previous answer is easy to catch.
 */
let solveCount = 0;
mock.module(
  new URL('../../../utils/captchaSolver.ts', import.meta.url).pathname,
  () => ({
    autoSolveCaptcha: async () => (++solveCount === 1 ? 'AAA111' : 'BBB222'),
  }),
);

const first: CaptchaData = {
  captchaImage: 'data:image/png;base64,QUFBQQ==',
  csrf: 'csrf-first',
  jsessionid: 'js-first',
  serverId: 'srv-first',
};
const second: CaptchaData = {
  captchaImage: 'data:image/png;base64,QkJCQg==',
  csrf: 'csrf-second',
  jsessionid: 'js-second',
  serverId: 'srv-second',
};

const success: LoginResult = {
  success: true,
  client: {
    campus: 'vellore',
    registrationNumber: '22ABC1234',
    studentName: 'Test Student',
  } as any,
};

const flush = async (ms = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
};

/** Async retries and React effects need several act flushes to settle. */
const waitFor = async (ready: () => boolean) => {
  for (let i = 0; i < 40 && !ready(); i++) await flush(100);
};

const setValue = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('VtopLoginCard CAPTCHA reload retries', () => {
  let root: Root;
  let container: HTMLDivElement;
  let login: any;

  beforeEach(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    solveCount = 0;
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 1,
    });

    let getCalls = 0;
    spyOn(VtopClient, 'getCaptcha').mockImplementation(async () =>
      ++getCalls === 1 ? first : second,
    );
    spyOn(VtopClient, 'refreshCaptcha').mockImplementation(async () => second);
    login = spyOn(VtopClient, 'login');
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    mock.restore();
  });

  const mount = async () => {
    const { VtopLoginCard } = await import('../VtopLoginCard');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <VtopLoginCard syncAfterLogin={false} onLoginSuccess={() => {}} />,
      );
    });
    await waitFor(
      () =>
        (container.querySelector('#captchaStr') as HTMLInputElement)?.value ===
        'AAA111',
    );
  };

  const submit = async () => {
    await act(async () => {
      setValue(
        container.querySelector('#username') as HTMLInputElement,
        'STUDENT001',
      );
      setValue(
        container.querySelector('#password') as HTMLInputElement,
        'PASSWORD123',
      );
    });
    await act(async () => {
      container
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        );
    });
  };

  const postedCaptchas = () =>
    login.mock.calls.map((call: any[]) => call[0].captcha);

  it('reloads and POSTs the newly solved answer after reCAPTCHA, without handing off', async () => {
    login
      .mockResolvedValueOnce({ success: false, message: RECAPTCHA_REQUIRED })
      .mockResolvedValueOnce(success);
    await mount();

    await submit();
    await waitFor(() => postedCaptchas().length === 2);

    expect(postedCaptchas()).toEqual(['AAA111', 'BBB222']);
    expect(
      (container.querySelector('#captchaImage') as HTMLImageElement).src,
    ).toBe(second.captchaImage);
    expect(
      (container.querySelector('#captchaStr') as HTMLInputElement).value,
    ).toBe('BBB222');
  });

  it('POSTs the fresh answer after an ordinary invalid-CAPTCHA refresh', async () => {
    login
      .mockResolvedValueOnce({ success: false, message: 'Invalid CAPTCHA' })
      .mockResolvedValueOnce(success);
    await mount();

    await submit();
    await waitFor(() => postedCaptchas().length === 2);

    expect(postedCaptchas()).toEqual(['AAA111', 'BBB222']);
    expect(
      (container.querySelector('#captchaImage') as HTMLImageElement).src,
    ).toBe(second.captchaImage);
  });
});

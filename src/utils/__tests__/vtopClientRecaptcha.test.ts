import { describe, expect, it, mock } from 'bun:test';
import {
  RecaptchaRequiredError,
  VtopClient,
  type VtopCaptchaTransport,
} from '../vtopClient';
import type { VtopResponse } from '../vtopBridge';

/**
 * Drive the ambient vs jar handshake with an injected transport. This asserts
 * that /vtop/get/new/captcha is attempted before a reCAPTCHA handoff, on both
 * session models, without touching the real network.
 */
const resp = (overrides: Partial<VtopResponse> = {}): VtopResponse => ({
  status: 200,
  headers: {},
  setCookies: [],
  body: '',
  bodyBase64: '',
  isBinaryImage: false,
  imageMime: '',
  url: '',
  ...overrides,
});

const CAPTCHA_URI = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const CSRF_HTML = '<input name="_csrf" value="csrf-1" />';
const RECAPTCHA_HTML = `captchaType = 2; <form>${CSRF_HTML}</form>`;
const BASE = 'https://vtop.vit.ac.in';

const transportFor = (
  ambient: boolean,
  responses: VtopResponse[],
): { transport: VtopCaptchaTransport; execute: ReturnType<typeof mock> } => {
  let index = 0;
  const execute = mock(() => Promise.resolve(responses[index++]));
  const transport: VtopCaptchaTransport = {
    execute: execute as any,
    isAmbient: () => ambient,
    clearCookies: () => {},
  };
  return { transport, execute };
};

describe('getCaptcha tries the regular CAPTCHA endpoint before reCAPTCHA handoff', () => {
  it('live: serves a regular JPEG on a reCAPTCHA-class setup response', async () => {
    const { transport, execute } = transportFor(true, [
      resp({ body: CSRF_HTML }),
      resp({ body: RECAPTCHA_HTML }),
      resp({ body: `<img src="${CAPTCHA_URI}"/>` }),
    ]);

    const data = await VtopClient.getCaptcha('vellore', transport);

    expect(data.captchaImage).toBe(CAPTCHA_URI);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls.map((c) => c[0].url)).toEqual([
      `${BASE}/vtop/open/page`,
      `${BASE}/vtop/prelogin/setup`,
      `${BASE}/vtop/get/new/captcha`,
    ]);
    expect(execute.mock.calls[2][0].headers.Referer).toBe(
      `${BASE}/vtop/open/page`,
    );
    expect(execute.mock.calls[2][0].headers.Accept).toContain('image/*');
  });

  it('live: throws RecaptchaRequiredError only when the endpoint also fails', async () => {
    const { transport, execute } = transportFor(true, [
      resp({ body: CSRF_HTML }),
      resp({ body: RECAPTCHA_HTML }),
      resp({ body: '<html>no captcha</html>' }),
    ]);

    await expect(
      VtopClient.getCaptcha('vellore', transport),
    ).rejects.toBeInstanceOf(RecaptchaRequiredError);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('keeps the generic parse error for non-reCAPTCHA pages', async () => {
    const { transport } = transportFor(true, [
      resp({ body: CSRF_HTML }),
      resp({ body: CSRF_HTML }),
      resp({ body: '<html>no captcha</html>' }),
    ]);

    await expect(VtopClient.getCaptcha('vellore', transport)).rejects.toThrow(
      'Unable to parse CAPTCHA image from VTOP response',
    );
  });

  it('jar: clears cookies and tries the endpoint before serving a regular JPEG', async () => {
    const clearCookies = mock(() => {});
    const { transport, execute } = transportFor(false, [
      resp({
        body: CSRF_HTML,
        setCookies: ['JSESSIONID=abc123; Path=/vtop', 'SERVERID=s1; Path=/'],
      }),
      resp({ status: 302, headers: { location: '/vtop/login' } }),
      resp({ body: RECAPTCHA_HTML }),
      resp({ body: `<img src="${CAPTCHA_URI}"/>` }),
    ]);
    transport.clearCookies = clearCookies;

    const data = await VtopClient.getCaptcha('vellore', transport);

    expect(clearCookies).toHaveBeenCalledTimes(1);
    expect(data.captchaImage).toBe(CAPTCHA_URI);
    expect(execute).toHaveBeenCalledTimes(4);
    expect(execute.mock.calls[3][0].headers.Referer).toBe(`${BASE}/vtop/login`);
  });

  it('jar: throws only after the endpoint fails on a reCAPTCHA page', async () => {
    const { transport, execute } = transportFor(false, [
      resp({ body: CSRF_HTML, setCookies: ['JSESSIONID=abc123'] }),
      resp({ status: 302, headers: { location: '/vtop/login' } }),
      resp({ body: RECAPTCHA_HTML }),
      resp({ body: '<html>no captcha</html>' }),
    ]);

    await expect(
      VtopClient.getCaptcha('vellore', transport),
    ).rejects.toBeInstanceOf(RecaptchaRequiredError);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});

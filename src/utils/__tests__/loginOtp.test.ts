import { describe, expect, it, mock } from 'bun:test';
import {
  VtopClient,
  isOtpRequiredMessage,
  type VtopCaptchaTransport,
} from '../vtopClient';
import type { VtopResponse } from '../vtopBridge';

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

const responses = (): VtopResponse[] => [
  resp({
    body: JSON.stringify({
      status: 'SUCCESS',
      redirectUrl: '/vtop/login/dashboard',
    }),
  }),
  resp({
    body: '<input id="authorizedIDX" value="21BCE1234" />',
  }),
];

const transportFor = (
  ambient: boolean,
  queue: VtopResponse[],
): { transport: VtopCaptchaTransport; execute: ReturnType<typeof mock> } => {
  let index = 0;
  const execute = mock(() => Promise.resolve(queue[index++]));
  return {
    transport: {
      execute: execute as any,
      isAmbient: () => ambient,
      clearCookies: () => {},
    },
    execute,
  };
};

const submit = (
  transport: VtopCaptchaTransport,
  sessionId: string,
  serverId: string | null,
) =>
  VtopClient.submitLoginOtp(
    {
      campus: 'vellore',
      username: '21BCE1234',
      otp: '123456',
      csrf: 'csrf-1',
      jsessionid: sessionId,
      serverId,
    },
    transport,
  );

describe('login OTP detection', () => {
  it('recognises VTOP verification prompts', () => {
    expect(
      isOtpRequiredMessage(
        'Additional verification required. OTP sent to your registered email.',
      ),
    ).toBe(true);
    expect(
      isOtpRequiredMessage('An OTP has been sent to your registered email'),
    ).toBe(true);
    expect(isOtpRequiredMessage('Please enter the verification code')).toBe(
      true,
    );
  });

  it('ignores unrelated login errors', () => {
    expect(isOtpRequiredMessage('Invalid username or password.')).toBe(false);
    expect(isOtpRequiredMessage('Invalid CAPTCHA. Please try again.')).toBe(
      false,
    );
    expect(isOtpRequiredMessage('')).toBe(false);
  });
});

describe('submitLoginOtp cookie handling', () => {
  it('omits Cookie on both OTP requests in an ambient session', async () => {
    const { transport, execute } = transportFor(true, responses());

    const result = await submit(transport, '', 's1');

    expect(result.success).toBe(true);
    expect(execute.mock.calls).toHaveLength(2);
    for (const call of execute.mock.calls) {
      expect(call[0].headers).not.toHaveProperty('Cookie');
    }
  });

  it('omits a real jar cookie in an ambient session', async () => {
    const { transport, execute } = transportFor(true, responses());

    await submit(transport, 'abc123', 's1');

    for (const call of execute.mock.calls) {
      expect(call[0].headers).not.toHaveProperty('Cookie');
    }
  });

  it('sends the jar cookie on both OTP requests outside an ambient session', async () => {
    const { transport, execute } = transportFor(false, responses());

    await submit(transport, 'abc123', 's1');

    expect(execute.mock.calls.map((c) => c[0].headers.Cookie)).toEqual([
      'JSESSIONID=abc123; SERVERID=s1',
      'JSESSIONID=abc123; SERVERID=s1',
    ]);
  });

  it('omits the SERVERID half of an empty jar cookie', async () => {
    const { transport, execute } = transportFor(false, responses());

    await submit(transport, '', 's1');

    for (const call of execute.mock.calls) {
      expect(call[0].headers).not.toHaveProperty('Cookie');
    }
  });
});

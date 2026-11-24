import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isPwaSyncKey,
  isTrustedPwaSyncSource,
  selectPwaSyncData,
} from '../pwaSyncAllowlist';

const root = resolve(import.meta.dir, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('PWA relay origin boundary', () => {
  it('accepts only the exact web origin or this extension', () => {
    expect(isTrustedPwaSyncSource('https://getretop.web.app')).toBe(true);
    expect(
      isTrustedPwaSyncSource('https://getretop.web.app/u/21BCE0001/home'),
    ).toBe(true);
    expect(
      isTrustedPwaSyncSource(
        'chrome-extension://abcdef/offline.html',
        'chrome-extension://abcdef/',
      ),
    ).toBe(true);

    for (const bad of [
      'https://getretop.web.app.evil.com/',
      'https://evil.com/?next=https://getretop.web.app',
      'http://getretop.web.app/',
      'https://getretop.web.app:8443/',
      'https://getretop.webapp/',
      'not a url',
      undefined,
    ]) {
      expect(isTrustedPwaSyncSource(bad)).toBe(false);
    }
    expect(
      isTrustedPwaSyncSource(
        'chrome-extension://otherid/offline.html',
        'chrome-extension://abcdef/',
      ),
    ).toBe(false);
  });
});

describe('PWA relay allowlist', () => {
  const forbidden = [
    'retop_pin_21bce0001',
    'retop_photo_key_21BCE0001',
    'retop_img_21bce0001',
    '21BCE0001_profileImage',
    'retop_profileImage',
    'retop_cache_21BCE0001_profileImage',
    'retop_cache_dashboard_stats',
    'retop_disabled',
    'some_other_secret',
  ];

  it('allows only identity, settings and cache records', () => {
    expect(isPwaSyncKey('retop_lastAuthId')).toBe(true);
    expect(isPwaSyncKey('retop-settings')).toBe(true);
    expect(isPwaSyncKey('retop_cached_users')).toBe(true);
    expect(isPwaSyncKey('21BCE0001_user_basic_profile')).toBe(true);
    expect(isPwaSyncKey('retop_cache_21BCE0001_vtop_menu')).toBe(true);
    expect(isPwaSyncKey('21BC12345_user_basic_profile')).toBe(true);
    expect(isPwaSyncKey('ABCDEF12_user_basic_profile')).toBe(false);
    for (const key of forbidden) expect(isPwaSyncKey(key)).toBe(false);
  });

  it('drops PIN/photo keys and photo fields but keeps account-switch data', () => {
    const data = selectPwaSyncData({
      retop_lastAuthId: '21BCE0001',
      retop_active_user: '21BCE0001',
      'retop-settings': { state: { settings: { theme: 'dark' } } },
      retop_cached_users: [
        {
          regNo: '21BCE0001',
          username: '21BCE0001',
          name: 'A Student',
          lastActive: 1234,
          profileImgBase64: 'data:image/jpeg;base64,/9j/AAAA',
        },
      ],
      '21BCE0001_user_basic_profile': {
        name: 'A Student',
        regNo: '21BCE0001',
        photoUrl: 'data:image/jpeg;base64,/9j/AAAA',
        campus: 'vellore',
      },
      retop_cache_21BCE0001_vtop_menu: {
        timestamp: 42,
        data: [{ title: 'Menu', image: 'data:image/png;base64,iVBOR' }],
      },
      ...Object.fromEntries(forbidden.map((key) => [key, 'secret'])),
    });

    expect(Object.keys(data).sort()).toEqual(
      [
        'retop_lastAuthId',
        'retop_active_user',
        'retop-settings',
        'retop_cached_users',
        '21BCE0001_user_basic_profile',
        'retop_cache_21BCE0001_vtop_menu',
      ].sort(),
    );
    expect(JSON.stringify(data)).not.toContain('data:image');
    expect(data.retop_cached_users[0]).toEqual({
      regNo: '21BCE0001',
      username: '21BCE0001',
      name: 'A Student',
      lastActive: 1234,
    });
    expect(data['21BCE0001_user_basic_profile']).toEqual({
      name: 'A Student',
      regNo: '21BCE0001',
      campus: 'vellore',
    });
    expect(data['retop-settings'].state.settings.theme).toBe('dark');
    expect(data.retop_cache_21BCE0001_vtop_menu.data).toEqual([
      { title: 'Menu' },
    ]);
  });

  it('keeps a single pull transfer path in the shipped bundles', () => {
    const background = read('src/background.ts');
    const webBridge = read('src/webBridge.ts');
    expect(background).toContain("register(['GET_ALL_SYNC_DATA']");
    expect(webBridge).toContain("action: 'GET_ALL_SYNC_DATA'");
    expect(background).not.toContain('RETOP_PWA_SYNC_PAYLOAD');
    expect(webBridge).not.toContain('RETOP_PWA_SYNC_PAYLOAD');
  });
});

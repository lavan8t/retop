/**
 * The single extension -> PWA transfer contract. Only the pull hydration path
 * uses this: the PWA asks for data on load, and the worker never pushes data.
 */

import { REG_NO_PATTERN } from './loginValidation';
import { isUserScopedCacheKey } from './cache';

export const PWA_WEB_ORIGIN = 'https://getretop.web.app';

/** Non-secret keys the offline surface actually reads. */
export const PWA_SYNC_KEYS = [
  'retop_lastAuthId',
  'retop_active_user',
  'retop_lastName',
  'retop_last_campus',
  'retop-saved-username',
  'retop-settings',
  'retop_cached_users',
] as const;

const SCOPED_PROFILE_KEY = new RegExp(
  `^${REG_NO_PATTERN.source.slice(1, -1)}_user_basic_profile$`,
  'i',
);
const CACHE_KEY = /^retop_cache_(.+)$/;
const SENSITIVE_KEY = /(pin|photo|image|img|avatar|picture)/i;

const isScopedCacheKey = (key: string): boolean => {
  const match = key.match(CACHE_KEY);
  return !!match && isUserScopedCacheKey(match[1]);
};

export const isPwaSyncKey = (key: string): boolean =>
  !SENSITIVE_KEY.test(key) &&
  ((PWA_SYNC_KEYS as readonly string[]).includes(key) ||
    SCOPED_PROFILE_KEY.test(key) ||
    isScopedCacheKey(key));

const isPhotoField = (key: string): boolean => {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    k.includes('photo') ||
    k.includes('image') ||
    k.includes('img') ||
    k.includes('avatar') ||
    k.includes('picture') ||
    k.endsWith('base64')
  );
};

const stripPhotos = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripPhotos);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      if (!isPhotoField(key)) out[key] = stripPhotos(child);
    }
    return out;
  }
  if (typeof value === 'string' && /^data:image\//i.test(value)) return '';
  return value;
};

/** Filter and sanitize in one place so no other caller can relay raw storage. */
export const selectPwaSyncData = (
  items: Record<string, any> | null | undefined,
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(items || {})) {
    if (isPwaSyncKey(key)) out[key] = stripPhotos(value);
  }
  return out;
};

const parseOrigin = (source: string) => {
  try {
    const url = new URL(source);
    if (!url.host) return null;
    return { protocol: url.protocol, host: url.host.toLowerCase() };
  } catch {
    return null;
  }
};

/** Exact origin equality: lookalike hosts and arbitrary senders are rejected. */
export const isTrustedPwaSyncSource = (
  source: string | undefined | null,
  ownExtensionUrl?: string,
): boolean => {
  if (!source || source === 'null') return false;
  const parsed = parseOrigin(source);
  if (!parsed) return false;
  if (
    parsed.protocol === 'https:' &&
    `${parsed.protocol}//${parsed.host}` === PWA_WEB_ORIGIN
  ) {
    return true;
  }
  if (!ownExtensionUrl) return false;
  const own = parseOrigin(ownExtensionUrl);
  return (
    !!own &&
    (own.protocol === 'chrome-extension:' ||
      own.protocol === 'moz-extension:') &&
    parsed.protocol === own.protocol &&
    parsed.host === own.host
  );
};

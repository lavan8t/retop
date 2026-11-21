import type { VtopCampus } from './vtopClient';

/**
 * Campus is locked to the VTOP host — there is no campus selector on live pages.
 * vtopcc = Chennai, vtop.vitap.ac.in = VIT-AP, everything else Vellore.
 */
export function isVtopHost(hostname: string): boolean {
  return /(^|\.)(vtop(cc)?\.vit\.ac\.in|vtop\.vitap\.ac\.in)$/.test(hostname);
}

export function campusFromHost(hostname: string): VtopCampus {
  if (/(^|\.)vtopcc\.vit\.ac\.in$/.test(hostname)) return 'chennai';
  if (/(^|\.)vtop\.vitap\.ac\.in$/.test(hostname)) return 'vitap';
  return 'vellore';
}

/** Host wins on VTOP pages; offline/extension surfaces fall back to stored campus. */
export function deriveCampus(
  hostname: string,
  stored?: string | null,
): VtopCampus {
  if (isVtopHost(hostname)) return campusFromHost(hostname);
  return stored === 'chennai' || stored === 'vitap' ? stored : 'vellore';
}

export function currentCampus(): VtopCampus {
  try {
    return deriveCampus(
      window.location.hostname,
      localStorage.getItem('retop_last_campus') ||
        localStorage.getItem('retop_campus'),
    );
  } catch {
    return 'vellore';
  }
}

export function campusLabel(campus: VtopCampus): string {
  if (campus === 'chennai') return 'CHENNAI';
  if (campus === 'vitap') return 'VIT-AP';
  return 'VELLORE';
}

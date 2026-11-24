const PHOTO_FIELD = /^(photo|photoUrl|profileImg|profileImgBase64)$/i;

const strip = (value: any): any => {
  if (Array.isArray(value)) return value.map(strip);
  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const out: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!PHOTO_FIELD.test(key)) out[key] = strip(child);
  }
  return out;
};

/** Photos belong only in the encrypted `retop_img_*` record, never in page cache. */
export const stripProfilePhotosForCache = <T>(value: T): T => strip(value);

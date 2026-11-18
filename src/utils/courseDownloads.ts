/**
 * Shared planning helpers for bulk course-material downloads.
 * Pure by design: the background worker and the React hook both use these
 * so folder naming and the VTOP POST body cannot drift apart.
 */

export interface CourseDownloadItem {
  fileId: string;
  title: string;
  faculty: string;
  module?: string;
}

export interface CourseDownloadContext {
  semester: string;
  course: string;
  moduleWise: boolean;
}

export const sanitizePathPart = (value: string): string => {
  const cleaned = (value || '')
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Unnamed';
};

export const buildDownloadFilename = (
  item: CourseDownloadItem,
  ctx: CourseDownloadContext,
): string => {
  const extension = /\.pdf$/i.test(item.title) ? '' : '.pdf';
  const base = `retop/coursepage/${sanitizePathPart(
    ctx.semester,
  )}/${sanitizePathPart(ctx.course)}/${sanitizePathPart(item.faculty)}`;
  const moduleFolder =
    ctx.moduleWise && item.module
      ? `/Module ${sanitizePathPart(item.module)}`
      : '';
  return `${base}${moduleFolder}/${sanitizePathPart(item.title)}${extension}`;
};

export const buildDownloadBody = (
  fileId: string,
  csrf: string,
  authorizedId: string,
  x: string = new Date().toUTCString(),
): URLSearchParams => {
  const body = new URLSearchParams();
  body.append('_csrf', csrf);
  body.append('authorizedID', authorizedId);
  body.append('fileId', fileId);
  body.append('x', x);
  return body;
};

export const isVtopDownloadUrl = (url?: string): boolean =>
  /^https:\/\/vtop(cc)?\.vit\.ac\.in\//.test(url || '');

export const isDownloadableMaterial = (category?: string): boolean =>
  !/web\s*(link|material)/i.test(category || '');

export const isPdfContentType = (contentType: string | null): boolean =>
  /application\/pdf/i.test(contentType || '');

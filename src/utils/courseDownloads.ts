/**
 * Course-material download planning.
 *
 * One deep module owns every rule for a course download: which URLs are ours,
 * the VTOP POST body, the retop folder path, and which responses count as a
 * PDF. Both entry points return fully planned work; the worker adapter only
 * executes it, so no naming rule can drift into the worker.
 */

export interface CourseDownloadItem {
  fileId: string;
  title: string;
  faculty: string;
  module?: string;
  category?: string;
}

export interface CourseDownloadContext {
  semester: string;
  course: string;
  moduleWise: boolean;
}

export interface DownloadPlanRequest extends CourseDownloadContext {
  url: string;
  csrf: string;
  authorizedId: string;
}

/** Fully planned work: url, POST body and the exact retop folder path. */
export interface PlannedDownload {
  url: string;
  body: string;
  filename: string;
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

/**
 * VTOP's own course-material form posts exactly these three fields; an extra
 * cache-buster is not part of the request and is left out.
 */
export const buildDownloadBody = (
  fileId: string,
  csrf: string,
  authorizedId: string,
): URLSearchParams => {
  const body = new URLSearchParams();
  body.append('_csrf', csrf);
  body.append('authorizedID', authorizedId);
  body.append('fileId', fileId);
  return body;
};

export const isVtopDownloadUrl = (url?: string): boolean =>
  /^https:\/\/(vtop(cc)?\.vit\.ac\.in|vtop\.vitap\.ac\.in)\//.test(url || '');

export const isDownloadableMaterial = (category?: string): boolean =>
  !/web\s*(link|material)/i.test(category || '');

const planDownload = (
  request: DownloadPlanRequest,
  item: CourseDownloadItem,
): PlannedDownload => ({
  url: request.url,
  body: buildDownloadBody(
    item.fileId,
    request.csrf,
    request.authorizedId,
  ).toString(),
  filename: buildDownloadFilename(item, request),
});

/** Entry point for a single material row. Empty when the URL/item is invalid. */
export const planSingleDownload = (
  request: DownloadPlanRequest,
  item: CourseDownloadItem,
): PlannedDownload[] =>
  isVtopDownloadUrl(request.url) && isDownloadableMaterial(item.category)
    ? [planDownload(request, item)]
    : [];

/** Entry point for select-all / selected / module-wise bulk downloads. */
export const planBulkDownloads = (
  request: DownloadPlanRequest,
  items: CourseDownloadItem[],
): PlannedDownload[] =>
  isVtopDownloadUrl(request.url)
    ? items
        .filter((item) => isDownloadableMaterial(item.category))
        .map((item) => planDownload(request, item))
    : [];

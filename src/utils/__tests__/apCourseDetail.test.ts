import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { VTOPNetwork } from '../network';

describe('VIT-AP course detail endpoint', () => {
  const beforeHost = window.location.hostname;

  beforeEach(() =>
    Object.defineProperty(window.location, 'hostname', {
      configurable: true,
      value: 'vtop.vitap.ac.in',
    }),
  );
  afterEach(() =>
    Object.defineProperty(window.location, 'hostname', {
      configurable: true,
      value: beforeHost,
    }),
  );

  it('posts to the endpoint wired by StudentCoursePage', async () => {
    const network = new VTOPNetwork('csrf', '26BEE7068');
    let endpoint = '';
    let params: Record<string, string> = {};
    (network as any).fetchVtopApi = (
      name: string,
      sent: Record<string, string>,
    ) => {
      endpoint = name;
      params = sent;
      return Promise.resolve('<div id="materialTable"></div>');
    };

    await network.getApCourseDetail(
      'AP2026273000308',
      '4058',
      'BAIJU B V',
      'AP2026273',
    );

    expect(endpoint).toBe('getCourseDetailsForCoursePage');
    expect(params).toMatchObject({
      classId: 'AP2026273000308',
      slotId: '4058',
      faculty: 'BAIJU B V',
      paramReturnId: 'getCourseDetailsForCoursePage',
    });
  });
});

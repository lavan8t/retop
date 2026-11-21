import { describe, expect, it } from 'bun:test';
import { VTOPNetwork } from '../network';

describe('getBiometricHistory campus guard', () => {
  it('returns empty without POSTing on a non-VIT-AP host', async () => {
    // The shared DOM preload runs at https://vtop.vit.ac.in/ (Vellore).
    const network = new VTOPNetwork('csrf-token', '26BEE7068');
    let posted = false;
    (network as any).fetchVtopApi = () => {
      posted = true;
      return Promise.resolve('<table></table>');
    };

    expect(await network.getBiometricHistory('21/11/2026')).toBe('');
    expect(posted).toBe(false);
  });
});

import { describe, expect, it } from 'bun:test';
import { parseBiometricHistory, SCHEMA_VERSION } from '../biometric';
import { PARSER_SCHEMA_VERSIONS } from '../version';

/** Live VIT-AP `/vtop/getStudBioHistory` fragment (reg 26BEE7068, 2026-11-21). */
const HISTORY_HTML = `
<div class="panel-body">
  <table class="table table-bordered">
    <tr>
      <td>Sl.No</td>
      <td>Punch Date</td>
      <td>Punch Time</td>
      <td>Venue</td>
    </tr>
    <tr>
      <td>1</td>
      <td>21/11/2026</td>
      <td>15:28</td>
      <td>AB2-301-FACE</td>
    </tr>
    <tr>
      <td>2</td>
      <td>21/11/2026</td>
      <td>08:47</td>
      <td>AB2-301-FACE</td>
    </tr>
    <tr>
      <td>3</td>
      <td>2/1/2026</td>
      <td>3:28 PM</td>
      <td>  AB1-204 - FACE  </td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </table>
</div>`;

describe('parseBiometricHistory', () => {
  it('skips the header row and empty rows, keeping every punch', () => {
    expect(parseBiometricHistory(HISTORY_HTML)).toEqual([
      {
        slNo: '1',
        punchDate: '21/11/2026',
        punchTime: '15:28',
        venue: 'AB2-301-FACE',
      },
      {
        slNo: '2',
        punchDate: '21/11/2026',
        punchTime: '08:47',
        venue: 'AB2-301-FACE',
      },
      {
        slNo: '3',
        punchDate: '02/01/2026',
        punchTime: '15:28',
        venue: 'AB1-204 - FACE',
      },
    ]);
  });

  it('returns an empty list for empty, non-table or no-record fragments', () => {
    expect(parseBiometricHistory('')).toEqual([]);
    expect(parseBiometricHistory('<div>No records found</div>')).toEqual([]);
  });

  it('exposes a schema version registered in the central map', () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(PARSER_SCHEMA_VERSIONS.biometric).toBe(SCHEMA_VERSION);
  });
});

import { describe, expect, it } from 'bun:test';
import {
  formatBedType,
  formatHostelBlock,
  formatHostelRoom,
  formatMessDetails,
  parseHostelDetailsString,
} from '../hostelFormat';

describe('hostel detail formatting', () => {
  it('splits the block name from a single-letter bracket tag', () => {
    expect(formatHostelBlock('Q Block (Q)')).toEqual({
      displayName: 'Q Block',
      badge: 'Q Block',
    });
    expect(formatHostelBlock('Block Name: A Block (A)')).toEqual({
      displayName: 'A Block',
      badge: 'A Block',
    });
  });

  it('takes whatever is in the brackets as the badge', () => {
    expect(formatHostelBlock('ANX (ANX)')).toEqual({
      displayName: 'ANX Block',
      badge: 'ANX Block',
    });
    expect(formatHostelBlock('Annexe (Q Block)')).toEqual({
      displayName: 'Annexe Block',
      badge: 'Q Block',
    });
  });

  it('keeps MH/LH block tags when there are no brackets', () => {
    expect(formatHostelBlock('MH - A Block')).toEqual({
      displayName: 'MH - A Block',
      badge: 'A Block',
    });
    expect(formatHostelBlock('Q Block')).toEqual({
      displayName: 'Q Block',
      badge: 'Q Block',
    });
  });

  it('formats room and bed type', () => {
    expect(formatHostelRoom('Room No. 512')).toBe('Room 512');
    expect(formatHostelRoom('512')).toBe('Room 512');
    expect(formatBedType('2 Bed AC')).toBe('2-Bed AC');
    expect(formatBedType('3 Bed Non-AC')).toBe('3-Bed Non-AC');
    expect(formatBedType('4')).toBe('4 Bed');
  });

  it('splits mess type from the caterer', () => {
    expect(formatMessDetails('Special Mess - Sodexo [K Block]')).toEqual({
      messType: 'Special Mess',
      caterer: 'Sodexo',
    });
    expect(formatMessDetails('Veg')).toEqual({
      messType: 'Veg Mess',
      caterer: undefined,
    });
  });

  it('extracts every field from a packed Hostel Details string', () => {
    expect(
      parseHostelDetailsString(
        'BLOCK: Q BLOCK (Q), ROOM NO: 512, BED TYPE: 2 BED AC, MESS TYPE: SPECIAL MESS, CATERER: SODEXO',
      ),
    ).toEqual({
      block: 'Q BLOCK (Q)',
      room: '512',
      bedType: '2 BED AC',
      mess: 'SPECIAL MESS',
      caterer: 'SODEXO',
    });
  });

  it('parses packed details without colons', () => {
    expect(parseHostelDetailsString('BLOCK ANX (ANX), ROOM 512')).toEqual({
      block: 'ANX (ANX)',
      room: '512',
    });
  });
});

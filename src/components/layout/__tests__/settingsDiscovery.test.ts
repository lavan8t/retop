import { describe, expect, test } from 'bun:test';
import { ITEM_ALIASES, RETOP_NATIVE_LINKS } from '../TopBarSearch';
import { getDestinationView, hasRetopPage } from '../../../utils/routes';

describe('settings navigation discoverability', () => {
  test('search index contains Settings with the settings destination', () => {
    const settings = RETOP_NATIVE_LINKS.find((l) => l.title === 'Settings');
    expect(settings).toBeDefined();
    expect(settings?.url).toBe('#settings');
    expect(settings?.category).toBe('Made for retop');
    expect(getDestinationView(settings!)).toBe('settings');
    expect(hasRetopPage(settings!)).toBe(true);
  });

  test('omnibox "settings" query matches by title and alias', () => {
    expect(ITEM_ALIASES.settings).toContain('settings');
    const settings = RETOP_NATIVE_LINKS.find((l) => l.title === 'Settings')!;
    const lowerQ = 'settings';
    const titleLower = settings.title.toLowerCase().trim();
    const aliases = ITEM_ALIASES[titleLower] || [];
    expect(titleLower === lowerQ || aliases.includes(lowerQ)).toBe(true);
  });

  test('settings shortcuts classify as the settings view', () => {
    expect(getDestinationView({ title: 'Settings', url: '#settings' })).toBe(
      'settings',
    );
    expect(getDestinationView({ url: '#settings' })).toBe('settings');
    expect(getDestinationView({ title: 'settings' })).toBe('settings');
  });

  test('existing route classification is unchanged', () => {
    expect(getDestinationView({ url: 'examinations/StudentMarkView' })).toBe(
      'marks',
    );
    expect(
      getDestinationView({ url: 'academics/common/StudentTimeTable' }),
    ).toBe('timetable');
    expect(
      getDestinationView({ title: 'Bank Info', url: 'fees/StudentBankInfo' }),
    ).toBe('content');
  });
});

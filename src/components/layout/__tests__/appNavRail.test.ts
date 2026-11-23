import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NAV_DESTINATIONS } from '../../../utils/routes';
import { AppNavRail } from '../AppNavRail';

const root = resolve(import.meta.dir, '../../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

describe('primary navigation destinations', () => {
  test('maps the primary views to distinct M3E Material Symbols names', () => {
    expect(NAV_DESTINATIONS).toHaveLength(11);
    expect(NAV_DESTINATIONS.map((d) => d.view)).toEqual([
      'dashboard',
      'timetable',
      'attendance',
      'digitalAssignments',
      'coursePage',
      'marks',
      'grades',
      'calendar',
      'curriculum',
      'biometric',
      'profile',
    ]);

    expect(NAV_DESTINATIONS.find((d) => d.view === 'attendance')?.icon).toBe(
      'front_hand',
    );
    expect(NAV_DESTINATIONS.find((d) => d.view === 'biometric')?.icon).toBe(
      'face',
    );

    const icons = NAV_DESTINATIONS.map((d) => d.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const destination of NAV_DESTINATIONS) {
      expect(destination.label.length).toBeGreaterThan(0);
      expect(destination.icon).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe('M3E nav source contract', () => {
  test('the rail renders accessible M3E nav items with a search FAB', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(source).toContain('M3eNavRail');
    expect(source).toContain('M3eNavItem');
    expect(source).not.toContain('M3eNavBar');
    expect(source).toContain('M3eFab');
    expect(source).toContain('aria-label="Primary navigation"');
    expect(source).toContain('slot="icon"');
    expect(source).toContain('mode="expanded"');
    expect(source).toContain('M3eNavRailToggle');
    expect(source).toContain('<M3eNavRailToggle for="app-nav-rail" />');
    expect(source).toContain('variant="rounded"');
    expect(source).toContain('nav-rail-icon');
  });

  test('collapsed rail hides labels via the M3E compact custom state', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    const css = read('src/input.css');
    expect(source).toContain(
      '<span className="nav-rail-label">{destination.label}</span>',
    );
    // The toggle changes currentMode, not the `mode` attribute, so the rail's
    // `:state(--compact)` custom state is the only reliable collapsed signal.
    expect(css).toContain(
      '#retop-root m3e-nav-rail:is(:state(--compact), :--compact) .nav-rail-label',
    );
    expect(css).toContain('display: none');
    // The shadow-DOM label wrapper has no ::part; collapsing the inherited M3E
    // item spacing removes the empty wrapper's gap when the slot is hidden.
    expect(css).toContain(
      '#retop-root m3e-nav-rail:is(:state(--compact), :--compact)',
    );
    expect(css).toContain('--m3e-nav-item-spacing: 0px');
  });

  test('compact rail centres chrome and icons on the rail centre line', () => {
    const css = read('src/input.css');
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(css).toContain(
      '#retop-root m3e-nav-rail:is(:state(--compact), :--compact) {\n  --m3e-nav-item-spacing: 0px;\n  --m3e-nav-rail-inline-padding: 0px;\n  --m3e-nav-bar-vertical-item-width: var(--m3e-nav-rail-compact-width, 96px);\n}',
    );
    expect(css).toContain(
      '#retop-root m3e-nav-rail:is(:state(--compact), :--compact) > m3e-fab {\n  margin-inline: auto;\n}',
    );
    expect(css).toContain('> .nav-rail-top-row,');
    expect(css).toContain('> .nav-rail-brand-row {');
    expect(css).toContain('.nav-rail-brand-glyph {');
    expect(css).toContain('padding-inline: 0;\n  justify-content: center;');
    for (const className of [
      'nav-rail-top-row',
      'nav-rail-brand-row',
      'nav-rail-brand-glyph',
    ]) {
      expect(source).toContain(className);
    }
  });

  test('toggle sits in its own row above the brand control', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AppNavRail, {
        currentView: 'dashboard',
        onNavigate: () => {},
        onSearch: () => {},
        onVtop: () => {},
      }),
    );
    const toggle = markup.indexOf('aria-label="Toggle navigation"');
    const brand = markup.indexOf('aria-label="retop home"');
    expect(toggle).toBeGreaterThan(-1);
    expect(brand).toBeGreaterThan(toggle);
    // The toggle's enclosing div closes before the brand row opens.
    const toggleRow = markup.slice(
      markup.lastIndexOf('<div', toggle),
      markup.indexOf('</div>', toggle) + '</div>'.length,
    );
    expect(toggleRow).toContain('aria-label="Toggle navigation"');
    expect(toggleRow).not.toContain('aria-label="retop home"');
  });

  test('selected icons drive M3E filled state, not host FILL CSS', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    const css = read('src/input.css');
    expect(source).toContain('filled={currentView === destination.view}');
    expect(css).not.toContain("font-variation-settings: 'FILL' 1");
  });

  test('every nav-rail icon resolves to the rounded Material Symbols variant', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    const icons = [...source.matchAll(/<M3eIcon\b[^>]*>/g)].map((m) => m[0]);
    expect(icons.length).toBeGreaterThanOrEqual(4);
    for (const icon of icons) {
      expect(icon).toContain('variant="rounded"');
      expect(icon).not.toContain('variant="sharp"');
      expect(icon).not.toContain('variant="outlined"');
    }
  });

  test('brand control dissolves re. into Times New Roman VTOP in place', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(source).toContain('re.');
    expect(source).toContain('VTOP');
    expect(source).toContain("font-['IDCardTimes',Times,serif]!");
    expect(source).not.toContain('font-vtop');
    expect(source).not.toContain('<svg');
    expect(source).toContain('onMouseEnter');
    expect(source.indexOf('Open native VTOP')).toBeLessThan(
      source.indexOf('size="small"'),
    );
    expect(source).toContain('var(--md-sys-color-secondary-container)');
    expect(source).toContain('var(--md-sys-color-on-secondary-container)');
  });

  test('the left rail has no VIT wordmark above the brand control', () => {
    const source = read('src/components/layout/AppNavRail.tsx');
    expect(source).not.toContain('vitLogo.svg');
    expect(source).not.toContain('WebkitMaskImage');
    expect(source).toContain('retop home');
    expect(source).toContain('Open native VTOP');
  });

  test('rendered DOM slots label spans and fills only the selected icon', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AppNavRail, {
        currentView: 'attendance',
        onNavigate: () => {},
        onSearch: () => {},
        onVtop: () => {},
      }),
    );
    const icons = [...markup.matchAll(/<m3e-icon(?=[\s>])[^>]*>/g)].map(
      (m) => m[0],
    );
    // One rail icon per destination, plus the search and toggle icons. M3E
    // renders a boolean `filled` attribute only on the selected rail icon.
    expect(icons.filter((icon) => icon.includes('filled=""'))).toHaveLength(1);
    expect(markup).not.toContain('<m3e-nav-bar');
    for (const icon of icons) {
      expect(icon).toContain('variant="rounded"');
    }
    expect(markup).toContain('<span class="nav-rail-label">Attendance</span>');
    expect(markup).toContain('aria-label="Primary navigation"');
  });

  test('nav tags are registered in the main world and aliased', () => {
    const inject = read('src/m3e-inject.ts');
    for (const mod of ['nav-rail', 'nav-bar', 'fab']) {
      expect(inject).toContain(`import '@m3e/web/${mod}'`);
    }

    const tags = read('src/components/attendance/m3eTags.ts');
    for (const tag of [
      'm3e-nav-rail',
      'm3e-nav-item',
      'm3e-nav-rail-toggle',
      'm3e-nav-bar',
      'm3e-fab',
      'm3e-icon',
    ]) {
      expect(tags).toContain(`'${tag}'`);
    }
  });
});

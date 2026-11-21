import { describe, expect, it } from 'bun:test';
import {
  campusFromHost,
  campusLabel,
  deriveCampus,
  isVtopHost,
} from '../campus';
import { asciiTypesForCampus, getAsciiConfig } from '../../components/asciiArt';

describe('VIT-AP campus derivation', () => {
  it('maps the AP host to campus vitap and its label', () => {
    expect(campusFromHost('vtop.vitap.ac.in')).toBe('vitap');
    expect(campusFromHost('sub.vtop.vitap.ac.in')).toBe('vitap');
    expect(campusLabel('vitap')).toBe('VIT-AP');
  });

  it('keeps Vellore and Chennai, rejects lookalikes and honours stored campus', () => {
    expect(campusFromHost('vtopcc.vit.ac.in')).toBe('chennai');
    expect(campusFromHost('vtop.vit.ac.in')).toBe('vellore');
    expect(campusLabel('chennai')).toBe('CHENNAI');
    expect(campusLabel('vellore')).toBe('VELLORE');

    expect(isVtopHost('vtop.vitap.ac.in.evil.com')).toBe(false);
    expect(deriveCampus('vtop.vitap.ac.in.evil.com', 'chennai')).toBe(
      'chennai',
    );
    expect(deriveCampus('getretop.web.app', 'vitap')).toBe('vitap');
    expect(deriveCampus('getretop.web.app')).toBe('vellore');
  });

  it('maps each campus to its ASCII art pool', () => {
    expect(asciiTypesForCampus('vitap')).toEqual(['AP']);
    expect(asciiTypesForCampus('chennai')).toEqual(['CC']);
    expect(asciiTypesForCampus('vellore')).toEqual(['TT', 'SMV', 'MGR']);
    expect(getAsciiConfig('AP')).toBeDefined();
  });
});

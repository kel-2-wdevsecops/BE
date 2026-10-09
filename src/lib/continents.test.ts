import { describe, expect, it } from 'vitest';
import { CONTINENTS, COUNTRIES, continentOf, countriesIn } from './continents';

describe('continents', () => {
  it('memetakan 27 negara sesuai PRD §6', () => {
    expect(COUNTRIES).toHaveLength(27);
    expect(CONTINENTS.map((c) => countriesIn(c).length)).toEqual([1, 6, 16, 2, 2]);
    for (const country of COUNTRIES) expect(continentOf(country)).not.toBeNull();
  });

  it('men-trim nama negara dari dump', () => {
    expect(continentOf('Norway  ')).toBe('Europe');
  });

  it('Russia dan Israel di Asia (Q2)', () => {
    expect(continentOf('Russia')).toBe('Asia');
    expect(continentOf('Israel')).toBe('Asia');
  });

  it('negara tak dikenal = null', () => {
    expect(continentOf('Mars')).toBeNull();
  });
});

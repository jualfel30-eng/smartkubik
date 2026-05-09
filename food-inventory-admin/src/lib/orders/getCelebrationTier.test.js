import { describe, it, expect } from 'vitest';
import { getCelebrationTier } from './getCelebrationTier';

describe('getCelebrationTier', () => {
  it('returns "subtle" for amount <= 0 or invalid', () => {
    expect(getCelebrationTier({ amount: 0 })).toBe('subtle');
    expect(getCelebrationTier({ amount: -10 })).toBe('subtle');
    expect(getCelebrationTier({ amount: NaN })).toBe('subtle');
    expect(getCelebrationTier({})).toBe('subtle');
  });

  describe('without weeklyMaxAmount (fallback)', () => {
    it('returns "subtle" for < $100', () => {
      expect(getCelebrationTier({ amount: 50 })).toBe('subtle');
      expect(getCelebrationTier({ amount: 99.99 })).toBe('subtle');
    });

    it('returns "standard" for $100..$500', () => {
      expect(getCelebrationTier({ amount: 100 })).toBe('standard');
      expect(getCelebrationTier({ amount: 500 })).toBe('standard');
    });

    it('returns "milestone" for > $500', () => {
      expect(getCelebrationTier({ amount: 500.01 })).toBe('milestone');
      expect(getCelebrationTier({ amount: 1000 })).toBe('milestone');
    });
  });

  describe('with weeklyMaxAmount', () => {
    it('returns "milestone" only when amount > weeklyMaxAmount', () => {
      expect(getCelebrationTier({ amount: 250, weeklyMaxAmount: 200 })).toBe('milestone');
    });

    it('returns "standard" when amount in [100, weeklyMaxAmount]', () => {
      expect(getCelebrationTier({ amount: 150, weeklyMaxAmount: 300 })).toBe('standard');
      expect(getCelebrationTier({ amount: 300, weeklyMaxAmount: 300 })).toBe('standard');
    });

    it('returns "subtle" when amount < $100 even with weeklyMaxAmount', () => {
      expect(getCelebrationTier({ amount: 50, weeklyMaxAmount: 300 })).toBe('subtle');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { calculateSplit } from './splitCalc';

function sumOwed(lines: { owedAmountMinorUnits: number }[]) {
  return lines.reduce((sum, l) => sum + l.owedAmountMinorUnits, 0);
}

describe('calculateSplit — EQUAL', () => {
  it('splits evenly when it divides cleanly', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EQUAL',
      participants: [{ userId: 'a' }, { userId: 'b' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toEqual([
      { userId: 'a', owedAmountMinorUnits: 500 },
      { userId: 'b', owedAmountMinorUnits: 500 },
    ]);
  });

  it('distributes the remainder deterministically by userId for an odd split', () => {
    // $10.00 / 3 = 333.33... -> 334/333/333, extra cent to the lowest userId
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EQUAL',
      participants: [{ userId: 'c' }, { userId: 'a' }, { userId: 'b' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sumOwed(result.lines)).toBe(1000);
    const byUser = Object.fromEntries(result.lines.map((l) => [l.userId, l.owedAmountMinorUnits]));
    expect(byUser).toEqual({ a: 334, b: 333, c: 333 });
  });

  it('gives the same result regardless of participant submission order', () => {
    const participants = [{ userId: 'c' }, { userId: 'a' }, { userId: 'b' }];
    const reordered = [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }];
    const result1 = calculateSplit({ totalAmountMinorUnits: 1000, splitType: 'EQUAL', participants });
    const result2 = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EQUAL',
      participants: reordered,
    });
    if (!result1.ok || !result2.ok) throw new Error('expected both to succeed');
    const norm = (r: typeof result1) =>
      [...r.lines].sort((a, b) => (a.userId < b.userId ? -1 : 1));
    expect(norm(result1)).toEqual(norm(result2));
  });
});

describe('calculateSplit — EXACT', () => {
  it('accepts amounts that sum exactly to the total', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EXACT',
      participants: [{ userId: 'a', value: 600 }, { userId: 'b', value: 400 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sumOwed(result.lines)).toBe(1000);
  });

  it('rejects amounts that do not sum to the total', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EXACT',
      participants: [{ userId: 'a', value: 600 }, { userId: 'b', value: 300 }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('calculateSplit — PERCENTAGE', () => {
  it('handles the canonical 33.34/33.33/33.33 split', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'PERCENTAGE',
      participants: [
        { userId: 'a', value: 33.34 },
        { userId: 'b', value: 33.33 },
        { userId: 'c', value: 33.33 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sumOwed(result.lines)).toBe(1000);
  });

  it('rejects percentages that do not sum to 100', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'PERCENTAGE',
      participants: [{ userId: 'a', value: 50 }, { userId: 'b', value: 40 }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('calculateSplit — SHARES', () => {
  it('weights by share count', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 900,
      splitType: 'SHARES',
      participants: [{ userId: 'a', value: 2 }, { userId: 'b', value: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byUser = Object.fromEntries(result.lines.map((l) => [l.userId, l.owedAmountMinorUnits]));
    expect(byUser).toEqual({ a: 600, b: 300 });
  });

  it('gives a 0-share participant exactly 0 owed', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'SHARES',
      participants: [{ userId: 'a', value: 1 }, { userId: 'b', value: 0 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const b = result.lines.find((l) => l.userId === 'b');
    expect(b?.owedAmountMinorUnits).toBe(0);
    expect(sumOwed(result.lines)).toBe(1000);
  });

  it('rejects when every participant has 0 shares', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'SHARES',
      participants: [{ userId: 'a', value: 0 }, { userId: 'b', value: 0 }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('calculateSplit — general validation', () => {
  it('rejects duplicate participants', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EQUAL',
      participants: [{ userId: 'a' }, { userId: 'a' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects fewer than 2 participants', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 1000,
      splitType: 'EQUAL',
      participants: [{ userId: 'a' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-positive amount', () => {
    const result = calculateSplit({
      totalAmountMinorUnits: 0,
      splitType: 'EQUAL',
      participants: [{ userId: 'a' }, { userId: 'b' }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('calculateSplit — property: shares always sum to the total', () => {
  const splitTypes = ['EQUAL', 'PERCENTAGE', 'SHARES'] as const;

  it('holds across randomized inputs for every allocation-based split type', () => {
    for (let i = 0; i < 200; i++) {
      const splitType = splitTypes[Math.floor(Math.random() * splitTypes.length)]!;
      const n = 2 + Math.floor(Math.random() * 5);
      const totalAmountMinorUnits = 1 + Math.floor(Math.random() * 100_000);
      const participants = Array.from({ length: n }, (_, idx) => {
        const userId = `user-${idx}`;
        if (splitType === 'EQUAL') return { userId };
        if (splitType === 'SHARES') return { userId, value: Math.floor(Math.random() * 5) };
        // PERCENTAGE: random weights normalized to sum to exactly 100.00
        return { userId, value: 0 };
      });

      if (splitType === 'PERCENTAGE') {
        const weights = participants.map(() => 1 + Math.floor(Math.random() * 10));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const bps = weights.map((w) => Math.floor((w * 10000) / totalWeight));
        const usedBp = bps.reduce((a, b) => a + b, 0);
        bps[0] = bps[0]! + (10000 - usedBp); // fix up rounding so it sums to exactly 10000
        participants.forEach((p, idx) => {
          p.value = bps[idx]! / 100;
        });
      }
      if (splitType === 'SHARES' && participants.every((p) => (p.value ?? 0) === 0)) {
        participants[0]!.value = 1;
      }

      const result = calculateSplit({ totalAmountMinorUnits, splitType, participants });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(sumOwed(result.lines)).toBe(totalAmountMinorUnits);
    }
  });
});

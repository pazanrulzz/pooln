export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface SplitParticipantInput {
  userId: string;
  /**
   * Meaning depends on splitType: EXACT = minor units owed, PERCENTAGE =
   * percent (0-100, up to 2 decimals), SHARES = a non-negative share count.
   * Ignored for EQUAL.
   */
  value?: number;
}

export interface SplitLine {
  userId: string;
  owedAmountMinorUnits: number;
  sharePercentBp?: number;
  shareUnits?: number;
}

export type SplitCalcResult = { ok: true; lines: SplitLine[] } | { ok: false; error: string };

interface Weighted {
  userId: string;
  weight: number;
}

/**
 * Floor each share, then hand out the leftover minor units one at a time to
 * the entries with the largest fractional remainder. Ties broken by userId
 * ascending so the result doesn't depend on the order participants happen
 * to be submitted in.
 */
function largestRemainderAllocate(total: number, weights: Weighted[]): Map<string, number> {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  const shares = weights.map((w) => {
    const raw = totalWeight === 0 ? 0 : (total * w.weight) / totalWeight;
    const floor = Math.floor(raw);
    return { userId: w.userId, floor, remainder: raw - floor };
  });

  const allocated = shares.reduce((sum, s) => sum + s.floor, 0);
  const leftover = total - allocated;

  const order = [...shares].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  const result = new Map(shares.map((s) => [s.userId, s.floor]));
  for (let i = 0; i < leftover; i++) {
    const entry = order[i]!;
    result.set(entry.userId, (result.get(entry.userId) ?? 0) + 1);
  }
  return result;
}

export function calculateSplit(input: {
  totalAmountMinorUnits: number;
  splitType: SplitType;
  participants: SplitParticipantInput[];
}): SplitCalcResult {
  const { totalAmountMinorUnits, splitType, participants } = input;

  if (!Number.isInteger(totalAmountMinorUnits) || totalAmountMinorUnits <= 0) {
    return { ok: false, error: 'Amount must be a positive whole number of minor units' };
  }
  if (participants.length < 2) {
    return { ok: false, error: 'An expense needs at least 2 participants' };
  }
  const userIds = participants.map((p) => p.userId);
  if (new Set(userIds).size !== userIds.length) {
    return { ok: false, error: 'Each participant can only appear once' };
  }

  switch (splitType) {
    case 'EQUAL': {
      const allocation = largestRemainderAllocate(
        totalAmountMinorUnits,
        participants.map((p) => ({ userId: p.userId, weight: 1 })),
      );
      return {
        ok: true,
        lines: participants.map((p) => ({
          userId: p.userId,
          owedAmountMinorUnits: allocation.get(p.userId) ?? 0,
        })),
      };
    }

    case 'EXACT': {
      const values = participants.map((p) => (p.value === undefined ? NaN : Math.round(p.value)));
      if (values.some((v) => !Number.isFinite(v) || v < 0)) {
        return { ok: false, error: 'Every participant needs a non-negative exact amount' };
      }
      const sum = values.reduce((a, b) => a + b, 0);
      if (sum !== totalAmountMinorUnits) {
        return {
          ok: false,
          error: `Exact amounts must sum to ${totalAmountMinorUnits}, got ${sum}`,
        };
      }
      return {
        ok: true,
        lines: participants.map((p, i) => ({
          userId: p.userId,
          owedAmountMinorUnits: values[i]!,
        })),
      };
    }

    case 'PERCENTAGE': {
      const bps = participants.map((p) => (p.value === undefined ? NaN : Math.round(p.value * 100)));
      if (bps.some((v) => !Number.isFinite(v) || v < 0)) {
        return { ok: false, error: 'Every participant needs a non-negative percentage' };
      }
      const sumBp = bps.reduce((a, b) => a + b, 0);
      if (sumBp !== 10000) {
        return { ok: false, error: `Percentages must sum to 100, got ${(sumBp / 100).toFixed(2)}` };
      }
      const allocation = largestRemainderAllocate(
        totalAmountMinorUnits,
        participants.map((p, i) => ({ userId: p.userId, weight: bps[i]! })),
      );
      return {
        ok: true,
        lines: participants.map((p, i) => ({
          userId: p.userId,
          owedAmountMinorUnits: allocation.get(p.userId) ?? 0,
          sharePercentBp: bps[i]!,
        })),
      };
    }

    case 'SHARES': {
      const shareCounts = participants.map((p) => (p.value === undefined ? NaN : Math.round(p.value)));
      if (shareCounts.some((v) => !Number.isFinite(v) || v < 0)) {
        return { ok: false, error: 'Every participant needs a non-negative share count' };
      }
      const totalShares = shareCounts.reduce((a, b) => a + b, 0);
      if (totalShares < 1) {
        return { ok: false, error: 'At least one participant must have more than 0 shares' };
      }
      const allocation = largestRemainderAllocate(
        totalAmountMinorUnits,
        participants.map((p, i) => ({ userId: p.userId, weight: shareCounts[i]! })),
      );
      return {
        ok: true,
        lines: participants.map((p, i) => ({
          userId: p.userId,
          owedAmountMinorUnits: allocation.get(p.userId) ?? 0,
          shareUnits: shareCounts[i]!,
        })),
      };
    }
  }
}

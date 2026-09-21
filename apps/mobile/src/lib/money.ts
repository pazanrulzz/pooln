/**
 * Text input ("12.50") <-> minor units (1250). Uses Math.round on the
 * scaled value rather than parseFloat-then-truncate, which avoids classic
 * float-representation bugs (e.g. 1.005 * 100 !== 100.5 in IEEE 754).
 */
export function textToMinorUnits(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function minorUnitsToText(amount: number): string {
  return (amount / 100).toFixed(2);
}

/**
 * Interprets a split-editor field's raw text as calculateSplit expects it
 * for the given split type. EXACT's text is a dollar amount ("6.00") that
 * needs converting to minor units; PERCENTAGE/SHARES text *is* already the
 * value calculateSplit wants (percent points / share counts).
 */
export function parseSplitValue(
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES',
  text: string | undefined,
): number | undefined {
  if (text === undefined || text === '') return undefined;
  if (splitType === 'EXACT') return textToMinorUnits(text) ?? undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

export function formatMoney(amountMinorUnits: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${minorUnitsToText(amountMinorUnits)}`;
}

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

export const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'INR', 'LKR', 'SEK'] as const;

const formatters = new Map<string, Intl.NumberFormat>();

// Minor units are always hundredths in this app's data model (JPY included),
// so fraction digits are pinned to 2 rather than using each currency's default.
function formatterFor(currency: string) {
  let f = formatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      f = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    formatters.set(currency, f);
  }
  return f;
}

export function formatMoney(amountMinorUnits: number, currency: string): string {
  return formatterFor(currency).format(amountMinorUnits / 100);
}

export function currencySymbol(currency: string): string {
  const part = formatterFor(currency)
    .formatToParts(0)
    .find((p) => p.type === 'currency');
  return part?.value ?? currency;
}

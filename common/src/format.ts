// Shared formatting helpers used by both the live preview and the Word export.

export interface FormattedNumber {
  text: string;
  negative: boolean;
}

// Dollars are stored as plain dollar amounts and reported in millions with 3
// decimals. Format string reference: "#,0,,.000;(#,0,,.000);.."
//   - positive: 1,234.567 (millions)
//   - negative: (1,234.567) and rendered in red by the caller
//   - zero: ".."
export function formatDollars(value: number | null | undefined): FormattedNumber {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return { text: "..", negative: false };
  }
  const millions = value / 1_000_000;
  const abs = Math.abs(millions);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  if (millions < 0) {
    return { text: `(${formatted})`, negative: true };
  }
  return { text: formatted, negative: false };
}

// FTEs are reported with a single decimal point. Zero is shown as "..".
export function formatFte(value: number | null | undefined): FormattedNumber {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return { text: "..", negative: false };
  }
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (value < 0) {
    return { text: `(${formatted})`, negative: true };
  }
  return { text: formatted, negative: false };
}

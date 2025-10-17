/**
 * ──────────────────────────────────────────────────────────────────────────────
 * TECHNICAL ANALYSIS UTILITIES
 * ──────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calculate Exponential Moving Average
 * @param values - Array of price values
 * @param period - EMA period
 * @returns EMA value
 */
export function ema(values: number[], period: number): number {
  if (values.length === 0) return NaN;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param closes - Array of closing prices
 * @param period - RSI period (default 14)
 * @returns RSI value (0-100)
 */
export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return NaN;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate simple slope of a price series
 * @param series - Array of price values
 * @param lookback - Number of periods to look back (default 10)
 * @returns Normalized slope value
 */
export function simpleSlope(series: number[], lookback = 10): number {
  if (series.length < lookback) return 0;
  const seg = series.slice(-lookback);
  return (seg[seg.length - 1] - seg[0]) / Math.max(seg[0], 1e-9);
}
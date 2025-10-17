/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SYNTHETIC DATA GENERATOR
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { Candle } from '../types.js';

/**
 * Generate synthetic OHLCV data for testing
 * @param n - Number of candles to generate
 * @param start - Starting price
 * @returns Array of synthetic candles
 */
export function makeSyntheticSeries(n = 100, start = 1.0000): Candle[] {
  const out: Candle[] = [];
  let price = start;
  const now = Math.floor(Date.now() / 1000);

  for (let i = n; i > 0; i--) {
    const t = now - i * 60; // 1-min bars
    // Random walk with slight upward drift
    const drift = 0.00002;
    const noise = (Math.random() - 0.5) * 0.0006;
    const open = price;
    const close = Math.max(0.00001, open * (1 + drift + noise));
    const high = Math.max(open, close) * (1 + Math.random() * 0.0003);
    const low  = Math.min(open, close) * (1 - Math.random() * 0.0003);
    price = close;
    out.push({ 
      time: t, 
      open, 
      high, 
      low, 
      close, 
      volume: 100 + Math.random() * 50 
    });
  }
  return out;
}
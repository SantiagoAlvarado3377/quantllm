/**
 * ──────────────────────────────────────────────────────────────────────────────
 * RISK AGENT
 * ──────────────────────────────────────────────────────────────────────────────
 * Uses fixed stop-loss value ρ = 0.0005 to reflect short-term price movements
 * 
 * Features:
 * - Fixed stop-loss: ρ = 0.0005 (0.05% of price)
 * - Dynamic risk multiplier: r ∈ [1.2, 1.8] based on market context
 * - Take-profit calculation: R = r * ρ
 * - Context-aware risk adjustment using other agent outputs
 * - Optional LLM-based intelligent risk tuning
 */

import 'dotenv/config';
import { AgentContext, RiskOut } from '../types.js';

/**
 * RiskAgent: Fixed rho + LLM/heuristic r in [1.2, 1.8]
 * 
 * Guidance:
 * - Strong Uptrend + Bullish + BullishEngulfing → r ≈ 1.7–1.8
 * - Sideways/uncertain → r ≈ 1.5
 * - Downtrend/Bearish/BearishEngulfing → r ≈ 1.2–1.3
 * 
 * @param ctx - Agent context containing other agent outputs
 * @returns Promise<RiskOut> - JSON with rho, rMultiplier, takeProfit, commentary
 */
export async function RiskAgent(ctx: AgentContext): Promise<RiskOut> {
  // Fixed stop-loss value reflecting short-term price movements
  const rho = 0.0005; // 0.05% stop-loss
  
  const useLLM = !!process.env.OPENAI_API_KEY;

  // Build context summary from other agents
  const summary = {
    indicator: ctx.indicator,
    pattern: ctx.pattern,
    trend: ctx.trend
  };

  let rMultiplier = 1.5; // Conservative fallback
  let commentary = 'Heuristic risk selection based on market context.';

  if (useLLM) {
    try {
      rMultiplier = await getLLMRiskMultiplier(summary);
      commentary = 'LLM-selected risk multiplier based on market analysis.';
    } catch (err) {
      rMultiplier = getHeuristicRiskMultiplier(ctx);
      commentary = `LLM fallback to heuristic: ${String(err).slice(0, 50)}...`;
    }
  } else {
    rMultiplier = getHeuristicRiskMultiplier(ctx);
  }

  const takeProfit = rMultiplier * rho;
  
  return { 
    rho, 
    rMultiplier, 
    takeProfit, 
    commentary 
  };
}

/**
 * Get risk multiplier using LLM analysis
 * @param summary - Context summary from other agents
 * @returns Promise<number> - Risk multiplier between 1.2 and 1.8
 */
async function getLLMRiskMultiplier(summary: any): Promise<number> {
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = `
You are RiskAgent. Choose r in [1.2, 1.8] (float with 2 decimals) for take-profit R = r * rho.
Fixed stop-loss: ρ = 0.0005 (0.05%)

Market Context:
${JSON.stringify(summary, null, 2)}

Guidance:
- Strong uptrend + bullish signals → r near 1.7–1.8
- Sideways/uncertain conditions → r around 1.5  
- Downtrend or bearish signals → r near 1.2–1.3

Consider:
- RSI regime and overbought/oversold conditions
- Detected candlestick patterns
- Trend strength and direction
- Overall market confidence

Return ONLY the number (e.g., 1.65).
  `.trim();

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3 // Low temperature for consistent risk decisions
  });

  const raw = (resp.choices[0]?.message?.content || '').trim();
  const parsed = Number.parseFloat(raw);
  
  if (!Number.isNaN(parsed) && parsed >= 1.2 && parsed <= 1.8) {
    return Math.round(parsed * 100) / 100;
  }
  
  throw new Error(`Invalid LLM response: ${raw}`);
}

/**
 * Get risk multiplier using heuristic analysis
 * @param ctx - Agent context
 * @returns number - Risk multiplier between 1.2 and 1.8
 */
function getHeuristicRiskMultiplier(ctx: AgentContext): number {
  // Base multiplier
  let multiplier = 1.5;
  
  // Indicator bias
  if (ctx.indicator?.regime === 'Bullish') multiplier += 0.15;
  else if (ctx.indicator?.regime === 'Bearish') multiplier -= 0.15;
  
  // Trend bias
  if (ctx.trend?.trend === 'Uptrend') multiplier += 0.1;
  else if (ctx.trend?.trend === 'Downtrend') multiplier -= 0.1;
  
  // Pattern bias
  if (ctx.pattern?.pattern === 'BullishEngulfing') multiplier += 0.05;
  else if (ctx.pattern?.pattern === 'BearishEngulfing') multiplier -= 0.05;
  
  // Confidence adjustment
  if (ctx.indicator?.confidence && ctx.indicator.confidence > 0.7) {
    multiplier += 0.05; // Higher confidence = slightly more aggressive
  }
  
  // Strength adjustment
  if (ctx.trend?.strength && ctx.trend.strength > 0.6) {
    multiplier += ctx.trend.trend === 'Uptrend' ? 0.05 : -0.05;
  }
  
  // Clamp to valid range
  return Math.min(1.8, Math.max(1.2, multiplier));
}

/**
 * Standalone function to run RiskAgent with market context
 * @param indicator - Indicator agent output
 * @param pattern - Pattern agent output  
 * @param trend - Trend agent output
 * @returns Promise<RiskOut> - Risk analysis results
 */
export async function runRiskAgent(
  indicator?: any, 
  pattern?: any, 
  trend?: any
): Promise<RiskOut> {
  return RiskAgent({ 
    candles: [], 
    indicator, 
    pattern, 
    trend 
  });
}

/**
 * Calculate position size based on risk parameters
 * @param accountBalance - Total account balance
 * @param riskPercentage - Risk percentage per trade (e.g., 0.02 for 2%)
 * @param entryPrice - Entry price for the position
 * @param riskOut - Risk agent output
 * @returns Position size
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  riskOut: RiskOut
): number {
  const riskAmount = accountBalance * riskPercentage;
  const stopLossDistance = entryPrice * riskOut.rho;
  return riskAmount / stopLossDistance;
}
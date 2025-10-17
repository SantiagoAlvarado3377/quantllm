/**
 * ──────────────────────────────────────────────────────────────────────────────
 * QUANTLLM ORCHESTRATOR
 * ──────────────────────────────────────────────────────────────────────────────
 * Main pipeline that coordinates all agents and generates market narratives
 */

import { Candle, AgentContext } from './types.js';
import { IndicatorAgent, PatternAgent, TrendAgent, RiskAgent } from './agents/index.js';

/**
 * Run the complete QuantLLM pipeline
 * @param candles - Array of OHLCV candles
 * @returns Analysis context and narrative
 */
export async function runPipeline(candles: Candle[]) {
  const ctx: AgentContext = { candles };

  // Run all agents sequentially, building context
  ctx.indicator = await IndicatorAgent(ctx);
  ctx.pattern   = await PatternAgent(ctx);
  ctx.trend     = await TrendAgent(ctx);
  ctx.risk      = await RiskAgent(ctx);

  // Generate human-readable narrative
  const narrative = generateNarrative(ctx);

  return { ctx, narrative };
}

/**
 * Generate a human-readable market story
 * @param ctx - Complete agent context
 * @returns Formatted narrative string
 */
function generateNarrative(ctx: AgentContext): string {
  if (!ctx.indicator || !ctx.pattern || !ctx.trend || !ctx.risk) {
    return 'Incomplete analysis - missing agent outputs';
  }

  const last = ctx.candles.at(-1);
  if (!last) return 'No candle data available';

  // Emoji indicators
  const dirEmoji =
    ctx.indicator.regime === 'Bullish' ? '📈' :
    ctx.indicator.regime === 'Bearish' ? '📉' : '➖';

  // Build narrative sections
  const timestamp = `Time: ${new Date(last.time * 1000).toISOString()}`;
  
  const indicatorLine = 
    `${dirEmoji} Indicator: RSI=${ctx.indicator.rsi?.toFixed(1)} ` +
    `(${ctx.indicator.regime}${ctx.indicator.overbought ? ', Overbought' : ''}${ctx.indicator.oversold ? ', Oversold' : ''}); ` +
    `confidence=${ctx.indicator.confidence.toFixed(2)}`;
  
  const patternLine = 
    `🕯️ Pattern: ${ctx.pattern.pattern} (strength=${ctx.pattern.strength.toFixed(2)})`;
  
  const trendLine = 
    `📊 Trend: ${ctx.trend.trend} (EMA12=${ctx.trend.emaFast.toFixed(5)}, EMA26=${ctx.trend.emaSlow.toFixed(5)}, strength=${ctx.trend.strength.toFixed(2)})`;
  
  const riskLine = 
    `🛡️ Risk: ρ=${ctx.risk.rho.toFixed(5)}, r=${ctx.risk.rMultiplier.toFixed(2)} ⇒ take-profit R=${ctx.risk.takeProfit.toFixed(5)} (${ctx.risk.commentary})`;

  return [timestamp, indicatorLine, patternLine, trendLine, riskLine].join('\n');
}

/**
 * Generate JSON output for API responses
 * @param candles - Array of OHLCV candles
 * @returns Complete analysis in JSON format
 */
export async function runAnalysis(candles: Candle[]) {
  const { ctx } = await runPipeline(candles);
  
  return {
    timestamp: new Date().toISOString(),
    indicator: ctx.indicator,
    pattern: ctx.pattern,
    trend: ctx.trend,
    risk: ctx.risk,
    summary: {
      bullishSignals: countBullishSignals(ctx),
      bearishSignals: countBearishSignals(ctx),
      overallSentiment: getOverallSentiment(ctx)
    }
  };
}

/**
 * Count bullish signals across all agents
 */
function countBullishSignals(ctx: AgentContext): number {
  let count = 0;
  if (ctx.indicator?.regime === 'Bullish') count++;
  if (ctx.pattern?.pattern === 'BullishEngulfing') count++;
  if (ctx.trend?.trend === 'Uptrend') count++;
  return count;
}

/**
 * Count bearish signals across all agents
 */
function countBearishSignals(ctx: AgentContext): number {
  let count = 0;
  if (ctx.indicator?.regime === 'Bearish') count++;
  if (ctx.pattern?.pattern === 'BearishEngulfing') count++;
  if (ctx.trend?.trend === 'Downtrend') count++;
  return count;
}

/**
 * Determine overall market sentiment
 */
function getOverallSentiment(ctx: AgentContext): 'Bullish' | 'Bearish' | 'Neutral' {
  const bullish = countBullishSignals(ctx);
  const bearish = countBearishSignals(ctx);
  
  if (bullish > bearish) return 'Bullish';
  if (bearish > bullish) return 'Bearish';
  return 'Neutral';
}
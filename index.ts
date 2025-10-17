/**
 * ──────────────────────────────────────────────────────────────────────────────
 * QUANTLLM - MAIN EXPORTS
 * ──────────────────────────────────────────────────────────────────────────────
 * Clean exports for library usage
 */

// Core functionality
export { runPipeline, runAnalysis } from './src/orchestrator.js';

// Individual agents
export {
  IndicatorAgent,
  PatternAgent,
  TrendAgent,
  RiskAgent,
  runIndicatorAgent,
  runPatternAgent,
  runTrendAgent,
  runRiskAgent
} from './src/agents/index.js';

// Types
export type {
  Candle,
  IndicatorOut,
  PatternOut,
  TrendOut,
  RiskOut,
  AgentContext
} from './src/types.js';

// Utilities
export { ema, rsi, simpleSlope } from './src/utils/technical.js';
export { makeSyntheticSeries } from './src/utils/synthetic.js';
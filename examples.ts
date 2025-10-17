/**
 * ──────────────────────────────────────────────────────────────────────────────
 * AGENT USAGE EXAMPLES
 * ──────────────────────────────────────────────────────────────────────────────
 * Examples showing how to use each agent individually
 */

import { 
  runIndicatorAgent, 
  runPatternAgent, 
  runTrendAgent, 
  runRiskAgent 
} from './src/agents/index.js';
import { makeSyntheticSeries } from './src/utils/synthetic.js';

async function demonstrateAgents() {
  console.log('🤖 Demonstrating Individual Agents\n');
  
  // Generate sample data
  const candles = makeSyntheticSeries(50, 1.0000);
  console.log(`📊 Generated ${candles.length} candles for analysis\n`);

  // 1. IndicatorAgent - Market regime analysis
  console.log('1️⃣ IndicatorAgent - RSI & Market Regime');
  const indicator = await runIndicatorAgent(candles);
  console.log(`   RSI: ${indicator.rsi?.toFixed(2)}`);
  console.log(`   Regime: ${indicator.regime}`);
  console.log(`   Overbought: ${indicator.overbought}, Oversold: ${indicator.oversold}`);
  console.log(`   Confidence: ${indicator.confidence.toFixed(2)}\n`);

  // 2. PatternAgent - Candlestick patterns
  console.log('2️⃣ PatternAgent - Candlestick Patterns');
  const pattern = await runPatternAgent(candles);
  console.log(`   Pattern: ${pattern.pattern}`);
  console.log(`   Strength: ${pattern.strength.toFixed(2)}\n`);

  // 3. TrendAgent - Trend analysis
  console.log('3️⃣ TrendAgent - Trend Analysis');
  const trend = await runTrendAgent(candles);
  console.log(`   Trend: ${trend.trend}`);
  console.log(`   EMA12: ${trend.emaFast.toFixed(5)}`);
  console.log(`   EMA26: ${trend.emaSlow.toFixed(5)}`);
  console.log(`   Slope: ${trend.slope.toFixed(6)}`);
  console.log(`   Strength: ${trend.strength.toFixed(2)}\n`);

  // 4. RiskAgent - Risk management
  console.log('4️⃣ RiskAgent - Risk Management');
  const risk = await runRiskAgent(indicator, pattern, trend);
  console.log(`   Stop-loss (ρ): ${risk.rho.toFixed(5)}`);
  console.log(`   Risk multiplier (r): ${risk.rMultiplier.toFixed(2)}`);
  console.log(`   Take-profit (R): ${risk.takeProfit.toFixed(5)}`);
  console.log(`   Commentary: ${risk.commentary}\n`);

  // Summary
  console.log('📋 Analysis Summary:');
  console.log(`   Market appears ${indicator.regime.toLowerCase()}`);
  console.log(`   ${pattern.pattern} pattern detected`);
  console.log(`   Trend is ${trend.trend.toLowerCase()}`);
  console.log(`   Risk multiplier suggests ${risk.rMultiplier > 1.5 ? 'aggressive' : 'conservative'} positioning`);
}

// Run demonstration
if (process.argv[1] && process.argv[1].endsWith('examples.ts')) {
  demonstrateAgents().catch(console.error);
}
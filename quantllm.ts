/**
 * ──────────────────────────────────────────────────────────────────────────────
 * QUANTLLM - MULTI-AGENT QUANTITATIVE TRADING ANALYSIS
 * ──────────────────────────────────────────────────────────────────────────────
 * Modular multi-agent system for real-time market analysis
 */

import 'dotenv/config';
import { runPipeline, runAnalysis } from './src/orchestrator.js';
import { makeSyntheticSeries } from './src/utils/synthetic.js';

// Export types and agents for external use
export * from './src/types.js';
export * from './src/agents/index.js';
export * from './src/orchestrator.js';
export * from './src/utils/technical.js';
export * from './src/utils/synthetic.js';

// Run demo if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('quantllm.ts')) {
  (async () => {
    console.log('🚀 Starting QuantLLM Multi-Agent Analysis...\n');
    
    // Generate synthetic market data
    const candles = makeSyntheticSeries(120, 1.0000);
    
    // Run complete pipeline
    const { narrative } = await runPipeline(candles);
    
    console.log('=== QuantLLM Story ===');
    console.log(narrative);
    console.log('\n✅ Analysis complete!\n');
    
    // Also generate JSON output for API use
    const jsonOutput = await runAnalysis(candles);
    console.log('📊 JSON Output Sample:');
    console.log(JSON.stringify(jsonOutput.summary, null, 2));
  })();
}

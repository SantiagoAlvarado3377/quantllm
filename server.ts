/**
 * ──────────────────────────────────────────────────────────────────────────────
 * QUANTLLM WEB SERVER
 * ──────────────────────────────────────────────────────────────────────────────
 * Express server providing web interface for QuantLLM analysis
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runPipeline, runAnalysis } from './src/orchestrator.js';
import { makeSyntheticSeries } from './src/utils/synthetic.js';
import { runIndicatorAgent, runPatternAgent, runTrendAgent, runRiskAgent } from './src/agents/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Store latest analysis for dashboard
let latestAnalysis: any = null;
let isAnalyzing = false;

/**
 * Generate fresh analysis data
 */
async function generateAnalysis() {
  if (isAnalyzing) return latestAnalysis;
  
  isAnalyzing = true;
  try {
    const candles = makeSyntheticSeries(120, 1.0000);
    const { ctx, narrative } = await runPipeline(candles);
    const jsonOutput = await runAnalysis(candles);
    
    latestAnalysis = {
      timestamp: new Date().toISOString(),
      narrative,
      data: {
        indicator: ctx.indicator,
        pattern: ctx.pattern,
        trend: ctx.trend,
        risk: ctx.risk,
        summary: jsonOutput.summary
      },
      candles: candles.slice(-20) // Last 20 candles for chart
    };
    
    return latestAnalysis;
  } finally {
    isAnalyzing = false;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/api/analysis', async (req, res) => {
  try {
    const analysis = await generateAnalysis();
    res.json(analysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate analysis', details: errorMessage });
  }
});

app.get('/api/analysis/fresh', async (req, res) => {
  try {
    latestAnalysis = null; // Force fresh analysis
    const analysis = await generateAnalysis();
    res.json(analysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate fresh analysis', details: errorMessage });
  }
});

app.get('/api/agents/:agent', async (req, res) => {
  try {
    const { agent } = req.params;
    const candles = makeSyntheticSeries(100, 1.0000);
    
    let result;
    switch (agent) {
      case 'indicator':
        result = await runIndicatorAgent(candles);
        break;
      case 'pattern':
        result = await runPatternAgent(candles);
        break;
      case 'trend':
        result = await runTrendAgent(candles);
        break;
      case 'risk':
        const indicator = await runIndicatorAgent(candles);
        const pattern = await runPatternAgent(candles);
        const trend = await runTrendAgent(candles);
        result = await runRiskAgent(indicator, pattern, trend);
        break;
      default:
        return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      agent,
      timestamp: new Date().toISOString(),
      result,
      candles: candles.slice(-10) // Last 10 candles
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to run ${req.params.agent} agent`, details: errorMessage });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    agents: ['indicator', 'pattern', 'trend', 'risk']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 QuantLLM Web Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/analysis`);
  console.log(`🤖 Individual agents: http://localhost:${PORT}/api/agents/{indicator|pattern|trend|risk}`);
  
  // Generate initial analysis
  generateAnalysis().then(() => {
    console.log('✅ Initial analysis ready');
  }).catch(err => {
    console.error('❌ Failed to generate initial analysis:', err.message);
  });
});
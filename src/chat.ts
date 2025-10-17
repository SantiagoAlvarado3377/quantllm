/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CHAT SERVICE - AI Trading Assistant
 * ──────────────────────────────────────────────────────────────────────────────
 * Intelligent c    // Use AI for general questions and responses
    try {
      const geminiResponse = await this.geminiService.generateResponse(input, {
        chatState: 'welcome',
        conversationHistory: this.messages.slice(-4).map(m => ({role: m.role, content: m.content}))
      });
      return { content: geminiResponse };
    } catch (error) {
      console.error('AI response failed:', error);
      // Fallback to structured responses
    }

    // Handle general questions (fallback)
    if (input.includes('help') || input.includes('what can you do')) {
      return {
        content: `🤖 I'm your QuantLLM Trading Assistant! Here's what I can do:

📊 **Multi-Agent Analysis**: I run 4 specialized agents to analyze specific markets:
- **IndicatorAgent**: RSI analysis and market regime detection
- **PatternAgent**: Candlestick pattern recognition
- **TrendAgent**: EMA-based trend analysis  
- **RiskAgent**: Dynamic risk management (ρ=0.0005 stop-loss)

🎯 **Trading Categories**: Choose from:
${tradingCategories.map(cat => `${cat.icon} ${cat.name}`).join(' | ')}

💡 **How it works:**
1. Choose a category (crypto, forex, stocks, etc.)
2. Select a specific asset from that category
3. Get detailed multi-agent analysis!

Try asking: "I want to analyze crypto" or "Show me forex options"`
      };
    }

    if (input.includes('categories') || input.includes('options')) {
      return {
        content: `📋 **Available Trading Categories:**

${tradingCategories.map(cat => 
  `${cat.icon} **${cat.name}**\n   ${cat.description}\n   Available: ${cat.markets.slice(0, 3).join(', ')}${cat.markets.length > 3 ? ` +${cat.markets.length - 3} more` : ''}`
).join('\n\n')}

Which category would you like to explore? Just type its name!`
      };
    }

    // Default response
    return {
      content: `👋 Welcome! Let's find the perfect market for you to analyze.

🎯 **Choose a trading category:**

${tradingCategories.map(cat => `${cat.icon} **${cat.name}** - ${cat.description}`).join('\n')}

💬 **Just type the category name you're interested in!**

Examples:
- "crypto" or "cryptocurrency"  
- "forex" or "currencies"
- "stocks" or "equities"
- "commodities" or "gold"
- "indices" or "market indices"

Or type "help" for more information!`
    };
  }t helps users explore different trading categories
 */

import { runPipeline, runAnalysis, runRealTimeAnalysis, getPopularSymbols, validateSymbol } from './orchestrator.js';
import { makeSyntheticSeries } from './utils/synthetic.js';
import { runIndicatorAgent, runPatternAgent, runTrendAgent, runRiskAgent } from './agents/index.js';
import { GeminiService } from './gemini.js';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: any;
};

export type TradingCategory = {
  id: string;
  name: string;
  description: string;
  markets: string[];
  icon: string;
};

export type ChatState = 'welcome' | 'category_selected' | 'asset_selected' | 'analysis_complete';

const tradingCategories: TradingCategory[] = [
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum, and other digital assets',
    markets: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'DOGE/USDT', 'MATIC/USDT'],
    icon: '₿'
  },
  {
    id: 'forex',
    name: 'Foreign Exchange',
    description: 'Major currency pairs and cross-rates',
    markets: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF', 'EUR/GBP'],
    icon: '💱'
  },
  {
    id: 'stocks',
    name: 'Stock Market',
    description: 'Individual stocks and equity indices',
    markets: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'SPY', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD'],
    icon: '📈'
  },
  {
    id: 'commodities',
    name: 'Commodities',
    description: 'Gold, oil, agricultural products',
    markets: ['GOLD', 'CRUDE OIL', 'SILVER', 'WHEAT', 'COPPER', 'NATURAL GAS', 'CORN', 'SOYBEANS'],
    icon: '🥇'
  },
  {
    id: 'indices',
    name: 'Market Indices',
    description: 'S&P 500, NASDAQ, Dow Jones, etc.',
    markets: ['S&P 500', 'NASDAQ', 'DOW', 'FTSE 100', 'DAX', 'NIKKEI', 'RUSSELL 2000', 'VIX'],
    icon: '📊'
  }
];

export class ChatService {
  private messages: ChatMessage[] = [];
  private currentCategory: TradingCategory | null = null;
  private selectedAsset: string | null = null;
  private chatState: ChatState = 'welcome';
  private geminiService: GeminiService;

  constructor() {
    // Initialize Gemini Pro service (required)
    try {
      this.geminiService = new GeminiService();
      console.log('🤖 QuantLLM AI powered by Gemini Pro is ready!');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      throw error;
    }
    
    // Initialize with AI-powered welcome message
    this.addMessage('assistant', this.getWelcomeMessage());
  }

  private addMessage(role: 'user' | 'assistant', content: string, analysis?: any): ChatMessage {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      analysis
    };
    this.messages.push(message);
    return message;
  }

  private getWelcomeMessage(): string {
    return `👋 Hello! I'm your **QuantLLM AI Trading Assistant** powered by Google Gemini Pro! 🤖

🎯 **Let's find the perfect market to analyze!**

I specialize in detailed, **asset-specific analysis** using our multi-agent system enhanced with AI intelligence:

**Step 1:** Choose a trading category
**Step 2:** Select a specific asset  
**Step 3:** Get comprehensive AI-powered analysis!

🚀 **Available Categories:**

${tradingCategories.map(cat => 
  `${cat.icon} **${cat.name}** - ${cat.markets.length} assets available`
).join('\n')}

💬 **Ready to start?** Just type a category name like "crypto", "forex", "stocks", "commodities", or "indices"!

I'll show you all available assets in that category and run our full analysis suite:
- 📊 Technical indicators (RSI, market regime)
- 🕯️ Candlestick pattern analysis  
- 📈 Trend analysis (EMA crossovers)
- 🛡️ Risk management recommendations

✨ *Powered by Google Gemini Pro for intelligent, educational conversations*`;
  }

  async processUserMessage(userInput: string): Promise<ChatMessage> {
    // Add user message
    this.addMessage('user', userInput);

    // Process the input with Gemini enhancement
    const response = await this.generateResponse(userInput);
    
    return this.addMessage('assistant', response.content, response.analysis);
  }

  private async generateResponse(input: string): Promise<{ content: string; analysis?: any }> {
    const lowerInput = input.toLowerCase();

    // Handle different states of the conversation
    switch (this.chatState) {
      case 'welcome':
        return this.handleWelcomeState(lowerInput);
      
      case 'category_selected':
        return this.handleAssetSelection(lowerInput);
      
      case 'asset_selected':
      case 'analysis_complete':
        return this.handleAnalysisState(lowerInput);
      
      default:
        return this.handleWelcomeState(lowerInput);
    }
  }

  private async handleWelcomeState(input: string): Promise<{ content: string; analysis?: any }> {
    // Check if user mentioned a category
    const mentionedCategory = tradingCategories.find(cat => 
      input.includes(cat.id) || 
      input.includes(cat.name.toLowerCase()) ||
      cat.markets.some(market => input.includes(market.toLowerCase()))
    );

    if (mentionedCategory) {
      this.currentCategory = mentionedCategory;
      this.chatState = 'category_selected';
      
      // Get AI-enhanced response for category selection
      let response = '';
      try {
        response = await this.geminiService.generateResponse(input, {
          currentCategory: mentionedCategory.name,
          chatState: 'category_selected',
          conversationHistory: this.messages.slice(-4).map(m => ({role: m.role, content: m.content}))
        });
        
        // Add market list to AI response
        response += `\n\n📋 **Available ${mentionedCategory.name} markets:**\n\n`;
        response += mentionedCategory.markets.map((market, index) => 
          `${index + 1}. **${market}**`
        ).join('\n');
        response += `\n\n🎯 **Which specific asset would you like me to analyze?**`;
        
      } catch (error) {
        console.error('AI response failed:', error);
        response = `${mentionedCategory.icon} Great choice! You selected **${mentionedCategory.name}**.

📋 **Available ${mentionedCategory.name} markets:**

${mentionedCategory.markets.map((market, index) => 
  `${index + 1}. **${market}**`
).join('\n')}

🎯 **Which specific asset would you like me to analyze?**

Just type the name or number from the list above, and I'll run our full multi-agent analysis system to give you:
- 📊 Technical indicators (RSI, market regime)
- 🕯️ Candlestick pattern analysis  
- 📈 Trend analysis (EMA crossovers)
- 🛡️ Risk management recommendations

*Example: Type "1" for ${mentionedCategory.markets[0]} or just type "${mentionedCategory.markets[0]}"*`;
      }
      
      return { content: response };
    }

    // Handle general questions
    if (input.includes('help') || input.includes('what can you do')) {
      return {
        content: `🤖 I'm your QuantLLM Trading Assistant! Here's what I can do:

📊 **Multi-Agent Analysis**: I run 4 specialized agents to analyze specific markets:
- **IndicatorAgent**: RSI analysis and market regime detection
- **PatternAgent**: Candlestick pattern recognition
- **TrendAgent**: EMA-based trend analysis  
- **RiskAgent**: Dynamic risk management (ρ=0.0005 stop-loss)

🎯 **Trading Categories**: Choose from:
${tradingCategories.map(cat => `${cat.icon} ${cat.name}`).join(' | ')}

� **How it works:**
1. Choose a category (crypto, forex, stocks, etc.)
2. Select a specific asset from that category
3. Get detailed multi-agent analysis!

Try asking: "I want to analyze crypto" or "Show me forex options"`
      };
    }

    if (input.includes('categories') || input.includes('options')) {
      return {
        content: `📋 **Available Trading Categories:**

${tradingCategories.map(cat => 
  `${cat.icon} **${cat.name}**\n   ${cat.description}\n   Available: ${cat.markets.slice(0, 3).join(', ')}${cat.markets.length > 3 ? ` +${cat.markets.length - 3} more` : ''}`
).join('\n\n')}

Which category would you like to explore? Just type its name!`
      };
    }

    // Default response
    return {
      content: `👋 Welcome! Let's find the perfect market for you to analyze.

🎯 **Choose a trading category:**

${tradingCategories.map(cat => `${cat.icon} **${cat.name}** - ${cat.description}`).join('\n')}

💬 **Just type the category name you're interested in!**

Examples:
- "crypto" or "cryptocurrency"  
- "forex" or "currencies"
- "stocks" or "equities"
- "commodities" or "gold"
- "indices" or "market indices"

Or type "help" for more information!`
    };
  }

  private async handleAssetSelection(input: string): Promise<{ content: string; analysis?: any }> {
    if (!this.currentCategory) {
      this.chatState = 'welcome';
      return this.handleWelcomeState(input);
    }

    // Check for "back" or "change category"
    if (input.includes('back') || input.includes('change') || input.includes('different category')) {
      this.currentCategory = null;
      this.chatState = 'welcome';
      return {
        content: `🔄 No problem! Let's choose a different category.

${tradingCategories.map(cat => `${cat.icon} **${cat.name}**`).join(' | ')}

Which category would you like to explore?`
      };
    }

    // Try to match by number
    const numberMatch = input.match(/\b(\d+)\b/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < this.currentCategory.markets.length) {
        this.selectedAsset = this.currentCategory.markets[index];
        this.chatState = 'asset_selected';
        return this.runAssetAnalysis();
      }
    }

    // Try to match by asset name
    const mentionedAsset = this.currentCategory.markets.find(market => 
      input.includes(market.toLowerCase()) ||
      market.toLowerCase().includes(input) ||
      input.replace(/\W/g, '').includes(market.replace(/\W/g, '').toLowerCase())
    );

    if (mentionedAsset) {
      this.selectedAsset = mentionedAsset;
      this.chatState = 'asset_selected';
      return this.runAssetAnalysis();
    }

    // Asset not found
    return {
      content: `🤔 I couldn't find "${input}" in our ${this.currentCategory.name} markets.

📋 **Available ${this.currentCategory.name} options:**

${this.currentCategory.markets.map((market, index) => 
  `${index + 1}. **${market}**`
).join('\n')}

Please try:
- Typing a number (1-${this.currentCategory.markets.length})
- Typing the exact asset name
- Or type "back" to choose a different category`
    };
  }

  private async handleAnalysisState(input: string): Promise<{ content: string; analysis?: any }> {
    // Check for new analysis requests
    if (input.includes('analyze') || input.includes('different') || input.includes('another') || input.includes('new')) {
      // Check if they want a different category
      const mentionedCategory = tradingCategories.find(cat => 
        input.includes(cat.id) || 
        input.includes(cat.name.toLowerCase())
      );

      if (mentionedCategory && mentionedCategory !== this.currentCategory) {
        this.currentCategory = mentionedCategory;
        this.selectedAsset = null;
        this.chatState = 'category_selected';
        
        return {
          content: `${mentionedCategory.icon} Switching to **${mentionedCategory.name}**!

📋 **Available markets:**

${mentionedCategory.markets.map((market, index) => 
  `${index + 1}. **${market}**`
).join('\n')}

Which ${mentionedCategory.name.toLowerCase()} asset would you like to analyze?`
        };
      }

      // Same category, different asset
      if (this.currentCategory) {
        this.selectedAsset = null;
        this.chatState = 'category_selected';
        
        return {
          content: `📋 **Choose another ${this.currentCategory.name} asset:**

${this.currentCategory.markets.map((market, index) => 
  `${index + 1}. **${market}**`
).join('\n')}

Which one would you like to analyze next?`
        };
      }
    }

    // Reset to welcome
    if (input.includes('start over') || input.includes('restart') || input.includes('categories')) {
      this.currentCategory = null;
      this.selectedAsset = null;
      this.chatState = 'welcome';
      return this.handleWelcomeState(input);
    }

    // Provide helpful guidance
    return {
      content: `🤖 Here's what you can do next:

🔄 **Analyze something new:**
- "Analyze another crypto" (same category)
- "Show me forex options" (different category)  
- "Start over" (choose new category)

💡 **Ask for help:**
- "Help" - See what I can do
- "Categories" - View all trading categories

📊 **Current analysis:** ${this.selectedAsset || 'None'} in ${this.currentCategory?.name || 'No category'}

What would you like to explore next?`
    };
  }

  private async runAssetAnalysis(): Promise<{ content: string; analysis?: any }> {
    if (!this.currentCategory || !this.selectedAsset) {
      return { content: 'Error: Missing category or asset information.' };
    }

    // Generate analysis for the specific asset
    const analysis = await this.runAnalysisForAsset(this.currentCategory, this.selectedAsset);
    this.chatState = 'analysis_complete';
    
    // Get AI-enhanced explanation
    try {
      const aiExplanation = await this.geminiService.explainAnalysis(analysis.data, this.selectedAsset);
      return {
        content: aiExplanation,
        analysis
      };
    } catch (error) {
      console.error('AI explanation failed:', error);
      return {
        content: this.formatAssetAnalysisResponse(this.currentCategory, this.selectedAsset, analysis),
        analysis
      };
    }
  }

  private async runAnalysisForAsset(category: TradingCategory, asset: string): Promise<any> {
    try {
      // Try to get real market data first
      const symbolMapping = this.getSymbolForAsset(category, asset);
      
      if (symbolMapping) {
        console.log(`🔍 Fetching real market data for ${symbolMapping}...`);
        try {
          const realAnalysis = await runRealTimeAnalysis(symbolMapping, 'daily', 100);
          console.log(`✅ Real market data analysis complete for ${symbolMapping}`);
          
          return {
            category: category.name,
            asset: asset,
            symbol: symbolMapping,
            isRealData: true,
            narrative: realAnalysis.narrative,
            data: realAnalysis.analysis,
            marketSummary: realAnalysis.marketSummary,
            recentData: realAnalysis.recentData?.slice(-5), // Last 5 data points
            timestamp: new Date().toISOString()
          };
        } catch (apiError) {
          const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
          console.warn(`⚠️ Real data failed for ${symbolMapping}, falling back to synthetic:`, errorMessage);
        }
      }
      
      // Fallback to synthetic data if real data fails
      console.log(`📊 Using synthetic data for ${asset}...`);
      const candles = this.generateAssetData(category, asset);
      
      // Run full pipeline analysis
      const { ctx, narrative } = await runPipeline(candles);
      const jsonOutput = await runAnalysis(candles);

      return {
        category: category.name,
        asset: asset,
        symbol: symbolMapping || 'SYNTHETIC',
        isRealData: false,
        narrative,
        data: {
          indicator: ctx.indicator,
          pattern: ctx.pattern,
          trend: ctx.trend,
          risk: ctx.risk,
          summary: jsonOutput.summary
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Analysis failed for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Map asset names to trading symbols for real market data
   */
  private getSymbolForAsset(category: TradingCategory, asset: string): string | null {
    const assetLower = asset.toLowerCase();
    
    switch (category.id) {
      case 'crypto':
        if (assetLower.includes('bitcoin') || assetLower.includes('btc')) return 'BTC';
        if (assetLower.includes('ethereum') || assetLower.includes('eth')) return 'ETH';
        if (assetLower.includes('cardano') || assetLower.includes('ada')) return 'ADA';
        if (assetLower.includes('solana') || assetLower.includes('sol')) return 'SOL';
        if (assetLower.includes('polkadot') || assetLower.includes('dot')) return 'DOT';
        if (assetLower.includes('litecoin') || assetLower.includes('ltc')) return 'LTC';
        if (assetLower.includes('ripple') || assetLower.includes('xrp')) return 'XRP';
        if (assetLower.includes('dogecoin') || assetLower.includes('doge')) return 'DOGE';
        if (assetLower.includes('polygon') || assetLower.includes('matic')) return 'MATIC';
        if (assetLower.includes('avalanche') || assetLower.includes('avax')) return 'AVAX';
        break;
        
      case 'stocks':
        if (assetLower.includes('apple') || assetLower.includes('aapl')) return 'AAPL';
        if (assetLower.includes('google') || assetLower.includes('googl')) return 'GOOGL';
        if (assetLower.includes('microsoft') || assetLower.includes('msft')) return 'MSFT';
        if (assetLower.includes('amazon') || assetLower.includes('amzn')) return 'AMZN';
        if (assetLower.includes('tesla') || assetLower.includes('tsla')) return 'TSLA';
        if (assetLower.includes('nvidia') || assetLower.includes('nvda')) return 'NVDA';
        if (assetLower.includes('meta') || assetLower.includes('facebook')) return 'META';
        if (assetLower.includes('netflix') || assetLower.includes('nflx')) return 'NFLX';
        if (assetLower.includes('amd')) return 'AMD';
        if (assetLower.includes('intel') || assetLower.includes('intc')) return 'INTC';
        break;
        
      case 'forex':
        if (assetLower.includes('eur') && assetLower.includes('usd')) return 'EURUSD';
        if (assetLower.includes('gbp') && assetLower.includes('usd')) return 'GBPUSD';
        if (assetLower.includes('usd') && assetLower.includes('jpy')) return 'USDJPY';
        if (assetLower.includes('usd') && assetLower.includes('chf')) return 'USDCHF';
        if (assetLower.includes('aud') && assetLower.includes('usd')) return 'AUDUSD';
        if (assetLower.includes('usd') && assetLower.includes('cad')) return 'USDCAD';
        if (assetLower.includes('nzd') && assetLower.includes('usd')) return 'NZDUSD';
        break;
        
      case 'commodities':
        if (assetLower.includes('gold')) return 'XAUUSD';
        if (assetLower.includes('silver')) return 'XAGUSD';
        if (assetLower.includes('oil') && assetLower.includes('crude')) return 'USOIL';
        if (assetLower.includes('oil') && assetLower.includes('brent')) return 'UKOIL';
        if (assetLower.includes('copper')) return 'COPPER';
        break;
        
      case 'indices':
        if (assetLower.includes('s&p') || assetLower.includes('sp500')) return 'SPY';
        if (assetLower.includes('nasdaq')) return 'QQQ';
        if (assetLower.includes('dow') || assetLower.includes('djia')) return 'DIA';
        if (assetLower.includes('russell')) return 'IWM';
        if (assetLower.includes('ftse')) return 'FTSE';
        break;
    }
    
    return null;
  }

  private generateAssetData(category: TradingCategory, asset: string) {
    // Customize synthetic data based on specific asset
    let startPrice = 1.0000;
    let volatility = 0.0006;

    switch (category.id) {
      case 'crypto':
        if (asset.includes('BTC')) {
          startPrice = 45000;
          volatility = 0.002;
        } else if (asset.includes('ETH')) {
          startPrice = 2800;
          volatility = 0.0025;
        } else if (asset.includes('SOL')) {
          startPrice = 95;
          volatility = 0.003;
        } else {
          startPrice = 1.50; // Alt coins
          volatility = 0.004;
        }
        break;
      case 'stocks':
        if (asset === 'AAPL') {
          startPrice = 175;
          volatility = 0.0012;
        } else if (asset === 'TSLA') {
          startPrice = 240;
          volatility = 0.003;
        } else if (asset === 'SPY') {
          startPrice = 450;
          volatility = 0.0008;
        } else {
          startPrice = 150;
          volatility = 0.0015;
        }
        break;
      case 'forex':
        if (asset === 'EUR/USD') {
          startPrice = 1.0800;
          volatility = 0.0004;
        } else if (asset === 'GBP/USD') {
          startPrice = 1.2500;
          volatility = 0.0005;
        } else {
          startPrice = 1.0000;
          volatility = 0.0006;
        }
        break;
      case 'commodities':
        if (asset === 'GOLD') {
          startPrice = 1950;
          volatility = 0.0008;
        } else if (asset === 'CRUDE OIL') {
          startPrice = 85;
          volatility = 0.0015;
        } else {
          startPrice = 25;
          volatility = 0.001;
        }
        break;
      case 'indices':
        if (asset === 'S&P 500') {
          startPrice = 4200;
          volatility = 0.0007;
        } else if (asset === 'NASDAQ') {
          startPrice = 13500;
          volatility = 0.001;
        } else {
          startPrice = 3000;
          volatility = 0.0008;
        }
        break;
    }

    return makeSyntheticSeries(100, startPrice);
  }

  private formatAssetAnalysisResponse(category: TradingCategory, asset: string, analysis: any): string {
    const data = analysis.data;
    const dataSourceIcon = analysis.isRealData ? '📊' : '🎲';
    const dataSourceText = analysis.isRealData ? 'Real Market Data' : 'Synthetic Data';
    const symbol = analysis.symbol || 'N/A';
    
    let marketInfo = '';
    if (analysis.isRealData && analysis.marketSummary) {
      const ms = analysis.marketSummary;
      marketInfo = `\n💰 **Market Info** (${symbol}):
• Current Price: $${ms.currentPrice?.toFixed(4)}
• Change: ${ms.change >= 0 ? '+' : ''}${ms.change?.toFixed(4)} (${ms.changePercent?.toFixed(2)}%)
• Volume: ${ms.volume?.toLocaleString()}
• 52W High/Low: $${ms.high52w?.toFixed(2)} / $${ms.low52w?.toFixed(2)}\n`;
    }
    
    return `${category.icon} **${asset} Analysis Complete!**

${dataSourceIcon} **Data Source**: ${dataSourceText}${analysis.isRealData ? ` (Symbol: ${symbol})` : ''}
${marketInfo}
🎯 **Asset**: ${asset} (${category.name})
📊 **Analysis Summary**: ${analysis.narrative}

💡 **Key Metrics**:
• **RSI**: ${data.indicator.rsi?.toFixed(1)} - ${data.indicator.regime} market
• **Pattern**: ${data.pattern.pattern} (Strength: ${(data.pattern.strength * 100)?.toFixed(1)}%)
• **Trend**: ${data.trend.trend} 
• **Risk Multiplier**: ${data.risk.rMultiplier}x

📈 **Market Assessment**:
- **Overall Sentiment**: ${data.summary.overallSentiment}
- **Bullish Signals**: ${data.summary.bullishSignals}
- **Bearish Signals**: ${data.summary.bearishSignals}

${analysis.isRealData ? '🔄 **Live Data**: This analysis uses real-time market data from Alpha Vantage!' : '⚠️ **Note**: Real market data unavailable, using high-quality synthetic data.'}

🎯 **Ready for next analysis?**
Type "analyze another ${category.name.toLowerCase()}" for more ${category.name} assets, or "categories" to explore different markets!`;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getCurrentCategory(): TradingCategory | null {
    return this.currentCategory;
  }

  getSelectedAsset(): string | null {
    return this.selectedAsset;
  }

  getChatState(): ChatState {
    return this.chatState;
  }

  getCategories(): TradingCategory[] {
    return tradingCategories;
  }

  isGeminiEnabled(): boolean {
    return true; // Always enabled since API key is required
  }

  async refreshGeminiStatus(): Promise<void> {
    // No longer needed since Gemini is always enabled
    return;
  }

  clearChat(): void {
    this.messages = [];
    this.currentCategory = null;
    this.selectedAsset = null;
    this.chatState = 'welcome';
    this.addMessage('assistant', this.getWelcomeMessage());
  }
}
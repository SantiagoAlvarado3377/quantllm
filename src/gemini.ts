/**
 * ──────────────────────────────────────────────────────────────────────────────
 * GEMINI AI SERVICE - Enhanced Chat Intelligence
 * ──────────────────────────────────────────────────────────────────────────────
 * Google Gemini integration for intelligent trading conversations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private modelId: string = '';
  private systemPrompt: string;

  constructor(config: GeminiConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required. Please set your Gemini Pro API key in the environment variables.');
    }

  // Initialize client; SDK will use its default API version. We'll handle model fallbacks ourselves.
  this.genAI = new GoogleGenerativeAI(apiKey);

    const preferredModel = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.setModel(preferredModel);

    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    console.log('🤖 Gemini Pro AI initialized successfully');
  }

  private setModel(modelId: string) {
    this.modelId = modelId;
    this.model = this.genAI!.getGenerativeModel({ model: modelId });
  }

  private getDefaultSystemPrompt(): string {
    return `You are QuantLLM AI, an advanced financial trading assistant powered by Google Gemini Pro, specializing in multi-agent quantitative analysis.

CORE IDENTITY:
- Expert financial AI with deep knowledge of technical analysis, market dynamics, and trading strategies
- Conversational, educational, and encouraging personality
- Powered by sophisticated multi-agent analysis system (Indicator, Pattern, Trend, Risk agents)
- Focus on making complex trading concepts accessible and actionable

EXPERTISE AREAS:
- Technical Analysis: RSI, EMA crossovers, candlestick patterns, market regimes
- Risk Management: Dynamic stop-loss strategies, position sizing, risk multipliers
- Multi-asset Markets: Cryptocurrency, Forex, Stocks, Commodities, Market Indices
- Educational Support: Explaining concepts, building trading knowledge

CONVERSATION STYLE:
- Professional yet approachable - like talking to a knowledgeable trading mentor
- Use relevant emojis strategically (📊📈💎🚀💱🥇⚡️🎯)
- Provide context and reasoning, not just raw data
- Encourage learning and skill development
- Be conversational while maintaining expertise

RESPONSE APPROACH:
1. Acknowledge user's interest/question warmly
2. Provide clear, educational explanations
3. Connect technical data to practical insights
4. Suggest logical next steps or considerations
5. Maintain encouraging, confidence-building tone

TRADING CATEGORIES SPECIALIZATION:
- Cryptocurrency: Bitcoin, Ethereum, altcoins - high volatility, 24/7 markets
- Forex: Major pairs, cross-rates - global economics, central bank impacts
- Stocks: Individual equities, growth vs value - company fundamentals, market sentiment
- Commodities: Gold, oil, agricultural - supply/demand, macro factors
- Indices: Market baskets - broad market trends, economic indicators

IMPORTANT GUIDELINES:
- Always emphasize educational purpose - "for learning and analysis"
- Never provide direct investment advice or guarantees
- Focus on technical analysis and risk management principles
- Encourage users to do their own research and consider multiple factors
- Be supportive of both beginners and experienced traders

CURRENT CONTEXT: User is interacting with a sophisticated web-based trading analysis platform that provides real multi-agent analysis results for their selected assets.`;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available since API key is required
  }

  async generateResponse(
    userMessage: string, 
    context: {
      currentCategory?: string;
      selectedAsset?: string;
      chatState?: string;
      recentAnalysis?: any;
      conversationHistory?: Array<{role: string, content: string}>;
    }
  ): Promise<string> {
    
    try {
      const prompt = this.buildPrompt(userMessage, context);
      return await this.tryGenerateWithFallback(prompt, () => this.getFallbackResponse(userMessage, context));
    } catch (error) {
      console.error('Gemini API error:', error);
      // Return a graceful fallback response instead of throwing
      return this.getFallbackResponse(userMessage, context);
    }
  }

  private buildPrompt(userMessage: string, context: any): string {
    let prompt = this.systemPrompt + '\n\n';

    // Add context information
    if (context.currentCategory) {
      prompt += `Current Category: ${context.currentCategory}\n`;
    }
    
    if (context.selectedAsset) {
      prompt += `Selected Asset: ${context.selectedAsset}\n`;
    }
    
    if (context.chatState) {
      prompt += `Chat State: ${context.chatState}\n`;
    }

    // Add recent analysis if available
    if (context.recentAnalysis) {
      prompt += `Recent Analysis Results:\n`;
      prompt += `- RSI: ${context.recentAnalysis.data?.indicator?.rsi?.toFixed(1)} (${context.recentAnalysis.data?.indicator?.regime})\n`;
      prompt += `- Pattern: ${context.recentAnalysis.data?.pattern?.pattern}\n`;
      prompt += `- Trend: ${context.recentAnalysis.data?.trend?.trend}\n`;
      prompt += `- Risk Multiplier: ${context.recentAnalysis.data?.risk?.rMultiplier}x\n`;
    }

    // Add conversation history (last few messages)
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += '\nRecent conversation:\n';
      const recentMessages = context.conversationHistory.slice(-4); // Last 4 messages
      recentMessages.forEach((msg: {role: string, content: string}) => {
        prompt += `${msg.role}: ${msg.content.substring(0, 200)}\n`;
      });
    }

    prompt += `\nUser Message: ${userMessage}\n\n`;
    prompt += `Please provide a helpful, engaging response that guides the user through the QuantLLM trading analysis process. Keep it concise but informative.`;

    return prompt;
  }

  private getFallbackResponse(userMessage: string, context: any): string {
    const lowerInput = userMessage.toLowerCase();

    // Smart fallbacks based on context
    if (context.chatState === 'welcome') {
      if (lowerInput.includes('crypto') || lowerInput.includes('bitcoin')) {
        return `₿ **Cryptocurrency Analysis!** 

I can help you analyze specific crypto assets like BTC/USDT, ETH/USDT, and more! 

Which crypto would you like me to analyze? Just let me know and I'll run our full multi-agent system to give you technical indicators, pattern analysis, trend data, and risk management insights! 🚀`;
      }
      
      if (lowerInput.includes('stock') || lowerInput.includes('equity')) {
        return `📈 **Stock Market Analysis!**

I can analyze specific stocks like AAPL, TSLA, GOOGL and more!

Which stock interests you? I'll provide RSI analysis, candlestick patterns, EMA trends, and risk assessments! 📊`;
      }

      return `🤖 **Welcome to QuantLLM!**

I'm your AI trading assistant powered by advanced analysis agents! 

🎯 **What I can help with:**
- Crypto analysis (BTC, ETH, etc.)
- Stock analysis (AAPL, TSLA, etc.) 
- Forex pairs (EUR/USD, etc.)
- Commodities (Gold, Oil, etc.)

Just tell me what you'd like to analyze! 🚀`;
    }

    if (context.chatState === 'category_selected') {
      return `Great choice on ${context.currentCategory}! 

Which specific asset would you like me to analyze? I can provide detailed technical analysis including RSI, patterns, trends, and risk management for any asset in this category.

Just type the asset name or number from the list! 📊`;
    }

    return `I'm here to help with your trading analysis! What would you like to explore? 🤖📈`;
  }

  async explainAnalysis(analysisData: any, asset: string): Promise<string> {
    try {
      const prompt = `As an expert trading AI, explain this technical analysis for ${asset} in engaging, educational terms:

RSI: ${analysisData.indicator?.rsi?.toFixed(1)} (${analysisData.indicator?.regime})
Pattern: ${analysisData.pattern?.pattern}
Trend: ${analysisData.trend?.trend}
Risk Multiplier: ${analysisData.risk?.rMultiplier}x

Provide a conversational explanation focusing on:
1. What these indicators mean in simple terms
2. Market sentiment and what it suggests
3. Key insights for traders
4. Risk considerations and strategy tips

Keep it educational, engaging, and use relevant emojis. Be encouraging and help the user learn. Max 300 words.`;

      return await this.tryGenerateWithFallback(prompt, () => this.getBasicAnalysisExplanation(analysisData, asset));
    } catch (error) {
      console.error('Gemini analysis explanation error:', error);
      // Fall back to deterministic explanation
      return this.getBasicAnalysisExplanation(analysisData, asset);
    }
  }

  // Try generation and automatically fall back across supported models and API versions if needed.
  private async tryGenerateWithFallback(prompt: string, fallback: () => string): Promise<string> {
    const candidates = [
      this.modelId || 'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro'
    ];

    let lastError: any = null;
    for (const id of candidates) {
      try {
        if (id !== this.modelId) {
          this.setModel(id);
        }
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (err: any) {
        lastError = err;
        const msg = `${err?.status || ''} ${err?.statusText || ''} ${String(err)}`;
        // On 404 or model-not-found errors, continue to next fallback model
        if (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('supported')) {
          continue;
        }
        // On other errors (e.g., network), break and return fallback
        break;
      }
    }

    console.warn('Gemini generation failed across models, using fallback. Last error:', lastError);
    return fallback();
  }

  private getBasicAnalysisExplanation(analysisData: any, asset: string): string {
    const rsi = analysisData.indicator?.rsi?.toFixed(1);
    const regime = analysisData.indicator?.regime;
    const pattern = analysisData.pattern?.pattern;
    const trend = analysisData.trend?.trend;

    return `📊 **${asset} Analysis Summary**

**RSI ${rsi}**: ${regime === 'Bullish' ? '🟢 Strong buying momentum' : regime === 'Bearish' ? '🔴 Selling pressure' : '🟡 Neutral territory'}

**Pattern**: ${pattern} detected - this suggests ${pattern === 'Doji' ? 'market indecision' : 'potential price movement'}

**Trend**: ${trend} - the market is moving ${trend.toLowerCase()}

💡 **Key insight**: This combination suggests ${regime.toLowerCase()} sentiment with ${trend.toLowerCase()} momentum. Always consider your risk management strategy!`;
  }
}
# QuantLLM - Gemini AI Integration Setup

## 🤖 Enhanced Chat with Google Gemini

To enable AI-powered conversations, you'll need a Google AI Studio API key:

### 1. Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free tier available)
3. Copy your API key

### 2. Set Up Environment Variable

#### Option A: Environment File (Recommended)

Create a `.env` file in your project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

#### Option B: Terminal Export

```bash
export GEMINI_API_KEY=your_api_key_here
npx tsx server.ts
```

#### Option C: Inline (macOS/Linux)

```bash
GEMINI_API_KEY=your_api_key_here npx tsx server.ts
```

### 3. Restart the Server

After adding your API key, restart the server to enable AI features.

## ✨ What You Get with Gemini AI

- **Natural Conversations**: More human-like responses
- **Context Awareness**: Remembers your conversation history
- **Smart Analysis Explanations**: AI-powered explanations of technical analysis
- **Adaptive Responses**: Responses adapt to your experience level
- **Educational Insights**: Learn about trading concepts as you explore

## 🛡️ Without Gemini API Key

The system works perfectly fine without Gemini - you'll get:

- Structured, informative responses
- Full multi-agent analysis capability
- All trading categories and assets
- Technical analysis results

The AI enhancement is completely optional! 🚀

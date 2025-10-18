/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ALPHA VANTAGE API SERVICE FOR REAL MARKET DATA
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { Candle } from '../types.js';
import { makeSyntheticSeries } from '../utils/synthetic.js';
import dotenv from 'dotenv';

dotenv.config();

export interface AlphaVantageTimeSeriesData {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

export interface AlphaVantageResponse {
  'Meta Data'?: {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)'?: AlphaVantageTimeSeriesData;
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string; // For rate limit messages
}

export interface AlphaVantageIntradayResponse {
  'Meta Data'?: {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string; // For rate limit messages
  [key: string]: AlphaVantageTimeSeriesData | any;
}

export interface AlphaVantageCryptoData {
  [date: string]: {
    '1a. open (USD)': string;
    '1b. open (USD)': string;
    '2a. high (USD)': string;
    '2b. high (USD)': string;
    '3a. low (USD)': string;
    '3b. low (USD)': string;
    '4a. close (USD)': string;
    '4b. close (USD)': string;
    '5. volume': string;
    '6. market cap (USD)': string;
    [key: string]: string;
  };
}

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private useMockData: boolean;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    // Check if API key is empty or is a placeholder value
    const isPlaceholder = !this.apiKey || 
                         this.apiKey === 'your_alpha_vantage_api_key_here' ||
                         this.apiKey.includes('your_') ||
                         this.apiKey.length < 10;
    
    this.useMockData = isPlaceholder;
    
    if (this.useMockData) {
      console.warn('⚠️  ALPHA_VANTAGE_API_KEY not found or invalid - using mock data for development');
      console.warn('   To use real market data, get a free API key from: https://www.alphavantage.co/support/#api-key');
    } else {
      console.log('✅ Alpha Vantage API key found - using real market data');
    }
  }

  /**
   * Fetch daily OHLCV data for a given symbol
   */
  async getDailyOHLCV(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<Candle[]> {
    // Return mock data if no API key is available
    if (this.useMockData) {
      return this.generateMockData(symbol, outputSize === 'full' ? 500 : 100, 'daily');
    }

    try {
      const response = await axios.get<AlphaVantageResponse>(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          outputsize: outputSize,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage API Rate Limit: ${response.data['Note']}`);
      }

      // Check for rate limit message in "Information" field
      if (response.data['Information'] && response.data['Information'].includes('rate limit')) {
        console.warn('⚠️  Alpha Vantage API rate limit reached - falling back to mock data');
        return this.generateMockData(symbol, outputSize === 'full' ? 500 : 100, 'daily');
      }

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No time series data found in response');
      }

      return this.convertToCandles(timeSeries);
    } catch (error) {
      console.error('Error fetching daily OHLCV data:', error);
      throw error;
    }
  }

  /**
   * Fetch intraday OHLCV data for a given symbol
   */
  async getIntradayOHLCV(
    symbol: string, 
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min',
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<Candle[]> {
    // Return mock data if no API key is available
    if (this.useMockData) {
      return this.generateMockData(symbol, outputSize === 'full' ? 1000 : 200, 'intraday');
    }

    try {
      const response = await axios.get<AlphaVantageIntradayResponse>(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol,
          interval: interval,
          outputsize: outputSize,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage API Rate Limit: ${response.data['Note']}`);
      }

      // Check for rate limit message in "Information" field
      if (response.data['Information'] && response.data['Information'].includes('rate limit')) {
        console.warn('⚠️  Alpha Vantage API rate limit reached - falling back to mock data');
        return this.generateMockData(symbol, outputSize === 'full' ? 1000 : 200, 'intraday');
      }

      const timeSeriesKey = `Time Series (${interval})`;
      const timeSeries = response.data[timeSeriesKey];
      if (!timeSeries) {
        throw new Error(`No time series data found for interval ${interval}`);
      }

      return this.convertToCandles(timeSeries);
    } catch (error) {
      console.error('Error fetching intraday OHLCV data:', error);
      throw error;
    }
  }

  /**
   * Fetch cryptocurrency daily data
   */
  async getCryptoDailyOHLCV(symbol: string, market: string = 'USD'): Promise<Candle[]> {
    // Return mock data if no API key is available
    if (this.useMockData) {
      return this.generateMockData(symbol, 100, 'daily');
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'DIGITAL_CURRENCY_DAILY',
          symbol: symbol,
          market: market,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage API Rate Limit: ${response.data['Note']}`);
      }

      // Check for rate limit message in "Information" field
      if (response.data['Information'] && response.data['Information'].includes('rate limit')) {
        console.warn('⚠️  Alpha Vantage API rate limit reached - falling back to mock data');
        return this.generateMockData(symbol, 100, 'daily');
      }

      const timeSeries = response.data['Time Series (Digital Currency Daily)'];
      if (!timeSeries) {
        throw new Error('No crypto time series data found in response');
      }

      return this.convertCryptoToCandles(timeSeries, market);
    } catch (error) {
      console.error('Error fetching crypto daily OHLCV data:', error);
      throw error;
    }
  }

  /**
   * Convert Alpha Vantage time series data to Candle format
   */
  private convertToCandles(timeSeries: AlphaVantageTimeSeriesData): Candle[] {
    const candles: Candle[] = [];
    
    for (const [date, data] of Object.entries(timeSeries)) {
      const timestamp = new Date(date).getTime() / 1000; // Convert to epoch seconds
      
      candles.push({
        time: timestamp,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseFloat(data['5. volume']),
      });
    }

    // Sort by time (oldest first)
    return candles.sort((a, b) => a.time - b.time);
  }

  /**
   * Convert Alpha Vantage crypto time series data to Candle format
   */
  private convertCryptoToCandles(timeSeries: AlphaVantageCryptoData, market: string): Candle[] {
    const candles: Candle[] = [];
    
    for (const [date, data] of Object.entries(timeSeries)) {
      const timestamp = new Date(date).getTime() / 1000; // Convert to epoch seconds
      
      candles.push({
        time: timestamp,
        open: parseFloat(data[`1a. open (${market})`] || data['1a. open (USD)']),
        high: parseFloat(data[`2a. high (${market})`] || data['2a. high (USD)']),
        low: parseFloat(data[`3a. low (${market})`] || data['3a. low (USD)']),
        close: parseFloat(data[`4a. close (${market})`] || data['4a. close (USD)']),
        volume: parseFloat(data['5. volume']),
      });
    }

    // Sort by time (oldest first)
    return candles.sort((a, b) => a.time - b.time);
  }

  /**
   * Get available stock symbols search
   */
  async searchSymbols(keywords: string): Promise<any[]> {
    // Return mock data if no API key is available
    if (this.useMockData) {
      return [
        { '1. symbol': 'AAPL', '2. name': 'Apple Inc.' },
        { '1. symbol': 'GOOGL', '2. name': 'Alphabet Inc.' },
        { '1. symbol': 'MSFT', '2. name': 'Microsoft Corporation' },
        { '1. symbol': 'TSLA', '2. name': 'Tesla Inc.' }
      ].filter(item => 
        item['1. symbol'].toLowerCase().includes(keywords.toLowerCase()) ||
        item['2. name'].toLowerCase().includes(keywords.toLowerCase())
      );
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: keywords,
          apikey: this.apiKey,
        },
      });

      return response.data.bestMatches || [];
    } catch (error) {
      console.error('Error searching symbols:', error);
      throw error;
    }
  }

  /**
   * Get current quote for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    // Return mock data if no API key is available
    if (this.useMockData) {
      return {
        '01. symbol': symbol,
        '02. open': '150.00',
        '03. high': '155.00',
        '04. low': '148.00',
        '05. price': '152.50',
        '06. volume': '1000000',
        '07. latest trading day': new Date().toISOString().split('T')[0],
        '08. previous close': '151.00',
        '09. change': '1.50',
        '10. change percent': '0.99%'
      };
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey,
        },
      });

      return response.data['Global Quote'] || {};
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  /**
   * Generate mock data for development/testing when API key is not available
   */
  private generateMockData(symbol: string, count: number, type: 'daily' | 'intraday' = 'daily'): Candle[] {
    console.log(`📊 Generating mock ${type} data for ${symbol} (${count} candles)`);
    
    // Use synthetic data generator with some variation based on symbol
    const basePrice = symbol === 'AAPL' ? 150 : 
                     symbol === 'GOOGL' ? 100 : 
                     symbol === 'MSFT' ? 300 : 
                     symbol === 'TSLA' ? 200 : 100;
    
    return makeSyntheticSeries(count, basePrice);
  }
}

export default AlphaVantageService;
/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ALPHA VANTAGE API SERVICE FOR REAL MARKET DATA
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { Candle } from '../types.js';
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

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is required in environment variables');
    }
  }

  /**
   * Fetch daily OHLCV data for a given symbol
   */
  async getDailyOHLCV(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<Candle[]> {
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
}

export default AlphaVantageService;
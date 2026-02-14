/**
 * Calculate Simple Moving Average (SMA)
 * @param {number[]} data - Array of prices
 * @param {number} period - Period for SMA
 * @returns {number[]} - Array of SMA values matching input length (null for initial)
 */
export function calculateSMA(data, period) {
  if (!data || data.length < period) return [];
  
  const sma = new Array(data.length).fill(null);
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma[i] = sum / period;
  }
  
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {number[]} data - Array of prices
 * @param {number} period - Period for EMA
 * @returns {number[]} - Array of EMA values
 */
export function calculateEMA(data, period) {
  if (!data || data.length < period) return [];
  
  const ema = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  
  // Initial EMA is SMA
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += data[i];
  }
  ema[period - 1] = initialSum / period;
  
  // Calculate rest
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] * k) + (ema[i - 1] * (1 - k));
  }
  
  return ema;
}

/**
 * Calculate RSI
 * @param {number[]} data - Array of closing prices
 * @param {number} period - Period (default 14)
 * @returns {number[]} - Array of RSI values
 */
export function calculateRSI(data, period = 14) {
  if (!data || data.length < period + 1) return [];
  
  const rsi = new Array(data.length).fill(null);
  let gains = 0;
  let losses = 0;
  
  // Calculate initial avg gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // First RSI value
  const rsFirst = avgGain / (avgLoss === 0 ? 0.0000001 : avgLoss);
  rsi[period] = 100 - (100 / (1 + rsFirst));
  
  // Smoothed calculation for subsequent values
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    // Traditional Wilder smoothing: (Previous Avg * (n-1) + Current) / n
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    
    const rs = avgGain / (avgLoss === 0 ? 0.0000001 : avgLoss); // Avoid divide by zero
    rsi[i] = 100 - (100 / (1 + rs));
  }
  
  return rsi;
}

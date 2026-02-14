import yahooFinance from 'yahoo-finance2';
import { NIFTY_50, NIFTY_NEXT_50, NIFTY_100, NIFTY_200 } from '../../lib/stockLists';
import { calculateSMA, calculateEMA, calculateRSI } from '../../lib/indicators';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { index } = req.query;
    let stockList = NIFTY_50;

    switch (index) {
        case 'nifty_next_50':
            stockList = NIFTY_NEXT_50;
            break;
        case 'nifty_100':
            stockList = NIFTY_100;
            break;
        case 'nifty_200':
            stockList = NIFTY_200;
            break;
        default:
            stockList = NIFTY_50;
    }

    const results = [];
    const errors = [];

    try {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 400);

        let yf = yahooFinance;
        if (typeof yf === 'function') {
            try { yf = new yahooFinance(); } catch (e) { if (yahooFinance.default) yf = yahooFinance.default; }
        } else if (yf.default) {
            yf = yf.default;
        }
        if (yf && typeof yf.suppressNotices === 'function') {
            try { yf.suppressNotices(['ripHistorical']); } catch (e) { }
        }

        // Initialize if needed
        if (!yf || typeof yf.historical !== 'function') {
            if (yahooFinance.historical) yf = yahooFinance;
            else throw new Error('Yahoo Finance library not initialized correctly.');
        }

        // Process a single stock
        const processStock = async (symbol) => {
            try {
                const queryOptions = {
                    period1: startDate,
                    period2: new Date(),
                    interval: '1d'
                };

                const result = await yf.historical(symbol, queryOptions);

                if (!result || result.length < 200) return;

                const closes = result.map(c => c.close);
                const highs = result.map(c => c.high);
                const lows = result.map(c => c.low);
                const volumes = result.map(c => c.volume);
                const dates = result.map(c => c.date);

                const lastIndex = closes.length - 1;
                const currentClose = closes[lastIndex];
                const currentVolume = volumes[lastIndex];

                // 1. Trend Filter: Close > 20 EMA > 50 EMA > 200 EMA
                const ema20 = calculateEMA(closes, 20);
                const ema50 = calculateEMA(closes, 50);
                const ema200 = calculateEMA(closes, 200);

                const trendBullish =
                    currentClose > ema20[lastIndex] &&
                    ema20[lastIndex] > ema50[lastIndex] &&
                    ema50[lastIndex] > ema200[lastIndex];

                if (!trendBullish) return;

                // 2. Breakout / Momentum: Close > Highest High of last 10 candles
                const recentHighs = highs.slice(lastIndex - 10, lastIndex);
                const highestHigh10 = Math.max(...recentHighs);

                if (currentClose <= highestHigh10) return;

                // 3. Volume Confirmation: Today Vol > 1.2 * 20-day Avg Vol
                const volSMA20 = calculateSMA(volumes, 20);
                const avgVol20 = volSMA20[lastIndex];

                if (currentVolume <= 1.2 * avgVol20) return;

                // 4. RSI Filter: 50 < RSI < 75
                const rsiArray = calculateRSI(closes, 14);
                const currentRSI = rsiArray[lastIndex];

                if (currentRSI <= 50 || currentRSI >= 75) return;

                // 5. Risk Management
                const recentLows = lows.slice(lastIndex - 5, lastIndex);
                const lowestLow5 = Math.min(...recentLows);

                const risk = currentClose - lowestLow5;
                const target = currentClose + (2 * risk);

                if (risk <= 0) return;

                return {
                    symbol: symbol.replace('.NS', ''),
                    entry: currentClose.toFixed(2),
                    stopLoss: lowestLow5.toFixed(2),
                    target: target.toFixed(2),
                    rsi: currentRSI.toFixed(2),
                    volumeMult: (currentVolume / avgVol20).toFixed(2),
                    closeDate: dates[lastIndex]?.toISOString().split('T')[0]
                };

            } catch (err) {
                errors.push({ symbol, error: err.message });
                return null;
            }
        };

        // PROCESS IN BATCHES (Parallel Execution)
        const BATCH_SIZE = 10; // 10 parallel requests
        for (let i = 0; i < stockList.length; i += BATCH_SIZE) {
            const batch = stockList.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(symbol => processStock(symbol)));

            // Filter out nulls (failed or filtered stocks) and add to main results
            batchResults.forEach(res => {
                if (res) results.push(res);
            });
        }

        res.status(200).json({
            count: results.length,
            data: results,
            scanned: stockList.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

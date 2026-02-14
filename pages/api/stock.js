import yahooFinance from 'yahoo-finance2';
import { calculateEMA, calculateRSI } from '../../lib/indicators';

export default async function handler(req, res) {
    const { symbol, interval = '1d' } = req.query;

    if (!symbol) {
        return res.status(400).json({ message: 'Symbol is required' });
    }

    try {
        const today = new Date();
        const startDate = new Date(today);

        if (interval === '1wk') startDate.setDate(today.getDate() - 400 * 7);
        else if (interval === '1mo') startDate.setDate(today.getDate() - 400 * 30);
        else startDate.setDate(today.getDate() - 400);

        let yf = yahooFinance;
        if (typeof yf === 'function') {
            try { yf = new yahooFinance(); } catch (e) { if (yahooFinance.default) yf = yahooFinance.default; }
        } else if (yf.default) {
            yf = yf.default;
        }
        if (yf && typeof yf.suppressNotices === 'function') {
            try { yf.suppressNotices(['ripHistorical']); } catch (e) { }
        }

        const queryOptions = {
            period1: startDate,
            period2: new Date(),
            interval: interval
        };

        if (!yf || typeof yf.historical !== 'function') {
            if (yahooFinance.historical) yf = yahooFinance;
            else throw new Error('Yahoo Finance library not initialized correctly.');
        }

        const lookupSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
        const result = await yf.historical(lookupSymbol, queryOptions);

        if (!result || result.length < 10) {
            return res.status(404).json({ message: 'Data not found' });
        }

        const closes = result.map(c => c.close);
        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const ema200 = calculateEMA(closes, 200);

        // Calculate BOTH RSIs
        const rsi5 = calculateRSI(closes, 5);
        const rsi14 = calculateRSI(closes, 14);

        // Support and Resistance logic
        const pivots = [];
        const windowSize = 10;

        for (let i = windowSize; i < result.length - windowSize; i++) {
            const currentHigh = result[i].high;
            const currentLow = result[i].low;
            let isHigh = true; let isLow = true;

            for (let j = 1; j <= windowSize; j++) {
                if (result[i - j].high > currentHigh || result[i + j].high > currentHigh) isHigh = false;
                if (result[i - j].low < currentLow || result[i + j].low < currentLow) isLow = false;
            }

            if (isHigh) pivots.push({ type: 'R', price: currentHigh });
            if (isLow) pivots.push({ type: 'S', price: currentLow });
        }

        const currentPrice = closes[closes.length - 1];
        const relevantPivots = pivots.filter(p => Math.abs(p.price - currentPrice) / currentPrice < 0.15)
            .slice(-5)
            .map(p => ({ price: p.price, type: p.type }));

        const uniquePivots = [];
        relevantPivots.forEach(p => {
            if (!uniquePivots.some(up => Math.abs(up.price - p.price) / p.price < 0.01)) {
                uniquePivots.push(p);
            }
        });

        const chartData = result.map((candle, index) => ({
            time: candle.date.toISOString().split('T')[0],
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            ema20: ema20[index],
            ema50: ema50[index],
            ema200: ema200[index],
            rsi5: rsi5[index],
            rsi14: rsi14[index],
            volume: candle.volume
        }));

        res.status(200).json({
            symbol,
            data: chartData,
            supportResistance: uniquePivots
        });

    } catch (error) {
        console.error('Stock API Error:', error);
        res.status(500).json({ message: 'Error fetching stock data', error: error.message });
    }
}

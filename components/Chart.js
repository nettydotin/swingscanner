import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';

export default function Chart({ data, levels, supportResistance, visibleRSI = 'rsi14' }) {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const [legend, setLegend] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#1e293b' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 600,
            rightPriceScale: {
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.3,
                },
            },
            timeScale: {
                timeVisible: true, // Needed for intraday (4H)
                secondsVisible: false,
            }
        });

        chartRef.current = chart;

        // --- Main Series ---
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4ade80',
            downColor: '#f87171',
            borderVisible: false,
            wickUpColor: '#4ade80',
            wickDownColor: '#f87171',
        });

        candleSeries.setData(data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        })));

        // EMAs
        const ema20Series = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, title: 'EMA 20' });
        ema20Series.setData(data.filter(d => d.ema20).map(d => ({ time: d.time, value: d.ema20 })));

        const ema50Series = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 1, title: 'EMA 50' });
        ema50Series.setData(data.filter(d => d.ema50).map(d => ({ time: d.time, value: d.ema50 })));

        const ema200Series = chart.addSeries(LineSeries, { color: '#cbd5e1', lineWidth: 1, title: 'EMA 200' });
        ema200Series.setData(data.filter(d => d.ema200).map(d => ({ time: d.time, value: d.ema200 })));

        // --- RSI Pane ---
        const rsiSeries = chart.addSeries(LineSeries, {
            color: '#c084fc',
            lineWidth: 1,
            priceScaleId: 'rsi',
            title: visibleRSI === 'rsi14' ? 'RSI 14' : 'RSI 5',
        });

        // Dynamic RSI Data Selection
        rsiSeries.setData(data.filter(d => d[visibleRSI]).map(d => ({ time: d.time, value: d[visibleRSI] })));

        rsiSeries.createPriceLine({ price: 70, color: '#f87171', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
        rsiSeries.createPriceLine({ price: 30, color: '#4ade80', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });

        chart.priceScale('rsi').applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // --- Levels & S/R ---
        if (levels) {
            if (levels.entry) candleSeries.createPriceLine({ price: parseFloat(levels.entry), color: '#ffffff', lineWidth: 1, lineStyle: 2, title: 'ENTRY' });
            if (levels.stopLoss) candleSeries.createPriceLine({ price: parseFloat(levels.stopLoss), color: '#f87171', lineWidth: 1, lineStyle: 2, title: 'SL' });
            if (levels.target) candleSeries.createPriceLine({ price: parseFloat(levels.target), color: '#4ade80', lineWidth: 1, lineStyle: 2, title: 'TARGET' });
        }

        if (supportResistance) {
            supportResistance.forEach(sr => {
                candleSeries.createPriceLine({
                    price: sr.price,
                    color: sr.type === 'R' ? 'rgba(248, 113, 113, 0.5)' : 'rgba(74, 222, 128, 0.5)',
                    lineWidth: 1,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: sr.type === 'R' ? 'RES' : 'SUP',
                });
            });
        }

        chart.timeScale().fitContent();

        // --- Legend Logic (.toFixed(2)) ---
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const dataPoint = param.seriesData.get(candleSeries);
                const rsiPoint = param.seriesData.get(rsiSeries);
                if (dataPoint) {
                    setLegend({
                        open: dataPoint.open?.toFixed(2),
                        high: dataPoint.high?.toFixed(2),
                        low: dataPoint.low?.toFixed(2),
                        close: dataPoint.close?.toFixed(2),
                        rsi: rsiPoint ? rsiPoint.value.toFixed(2) : 'N/A'
                    });
                }
            } else {
                setLegend(null);
            }
        });

        const handleResize = () => {
            if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
        };
    }, [data, levels, supportResistance, visibleRSI]); // Re-render when visibleRSI changes

    return (
        <div style={{ position: 'relative' }}>
            {legend && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10,
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    pointerEvents: 'none',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <span>O: <span style={{ color: '#fff' }}>{legend.open}</span></span>
                    <span>H: <span style={{ color: '#fff' }}>{legend.high}</span></span>
                    <span>L: <span style={{ color: '#fff' }}>{legend.low}</span></span>
                    <span>C: <span style={{ color: '#fff' }}>{legend.close}</span></span>
                    <span>RSI: <span style={{ color: '#c084fc' }}>{legend.rsi}</span></span>
                </div>
            )}
            <div ref={chartContainerRef} style={{ width: '100%', height: '600px' }} />
        </div>
    );
}

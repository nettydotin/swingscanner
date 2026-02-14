import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertCircle, Search, BarChart2 } from 'lucide-react';
import styles from '../styles/Home.module.css';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('../components/Chart'), { ssr: false });

const INDICES = [
  { value: 'nifty50', label: 'Nifty 50' },
  { value: 'nifty_next_50', label: 'Nifty Next 50' },
  { value: 'nifty_100', label: 'Nifty 100' },
  { value: 'nifty_200', label: 'Nifty 200' }
];

const TIMEFRAMES = [
  { value: '1d', label: '1D' },
  { value: '1wk', label: '1W' },
  { value: '1mo', label: '1M' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('scanner');

  // Scanner State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [scanStats, setScanStats] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('nifty50');

  // Analysis State
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [chartLevels, setChartLevels] = useState(null);
  const [supportResistance, setSupportResistance] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');

  // Chart Controls
  const [timeframe, setTimeframe] = useState('1d');
  const [activeRSI, setActiveRSI] = useState('rsi14'); // 'rsi5' or 'rsi14'

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setScanStats(null);

    try {
      const res = await fetch(`/api/scan?index=${selectedIndex}`);
      if (!res.ok) throw new Error('Scan failed to fetch data');

      const data = await res.json();
      setResults(data.data || []);
      setScanStats({ scanned: data.scanned, count: data.count });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStockData = async (symbol, levels = null) => {
    setLoadingChart(true);
    setStockData([]);
    setChartLevels(levels);
    setSupportResistance(null);

    try {
      // Fetch data. rsiPeriod is not needed in query as API returns both.
      const res = await fetch(`/api/stock?symbol=${symbol}&interval=${timeframe}`);
      if (!res.ok) throw new Error('Failed to load stock data');
      const data = await res.json();
      setStockData(data.data);
      setSupportResistance(data.supportResistance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChart(false);
    }
  };

  // Reload chart when timeframe changes (RSI change is client-side only now)
  useEffect(() => {
    if (selectedStock && activeTab === 'analysis') {
      loadStockData(selectedStock, chartLevels);
    }
  }, [timeframe]);

  const handleStockClick = (stock) => {
    setSelectedStock(stock.symbol);
    setActiveTab('analysis');
    setSearchSymbol(stock.symbol);
    loadStockData(stock.symbol, {
      entry: stock.entry,
      stopLoss: stock.stopLoss,
      target: stock.target
    });
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!searchSymbol) return;
    const symbol = searchSymbol.toUpperCase();
    setSelectedStock(symbol);
    loadStockData(symbol, null);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Antigravity | Swing Scanner</title>
      </Head>

      <header className={styles.header}>
        <h1 className={styles.title}>Swing Scanner</h1>
        <p className={styles.subtitle}>NSE Equity • Trend & Momentum Strategy</p>
      </header>

      <main className={styles.card}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'scanner' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            Scanner
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
        </div>

        {activeTab === 'scanner' ? (
          <>
            <div className={styles.controls}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                  className={styles.selectInput}
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                >
                  {INDICES.map(idx => (
                    <option key={idx.value} value={idx.value}>{idx.label}</option>
                  ))}
                </select>
                <div className={styles.status}>
                  {loading ? (
                    <span>Scanning...</span>
                  ) : scanStats ? (
                    <span>Scanned {scanStats.scanned}. Found {scanStats.count}.</span>
                  ) : (
                    <span>Ready to scan.</span>
                  )}
                </div>
              </div>

              <button
                className={styles.scanButton}
                onClick={runScan}
                disabled={loading}
              >
                {loading ? 'Scanning...' : 'Scan Market'}
              </button>
            </div>

            {error && (
              <div className={styles.errorBanner} style={{ color: 'var(--accent-red)', padding: '1rem', textAlign: 'center' }}>
                <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                {error}
              </div>
            )}

            <div className={styles.tableContainer}>
              {results.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th>Entry</th>
                      <th>Stop Loss</th>
                      <th>Target</th>
                      <th>RSI</th>
                      <th>Vol Mult</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((stock) => (
                      <tr key={stock.symbol} style={{ cursor: 'pointer' }} onClick={() => handleStockClick(stock)}>
                        <td className={styles.ticker}>{stock.symbol}</td>
                        <td className={styles.price}>₹{stock.entry}</td>
                        <td className={styles.price} style={{ color: 'var(--accent-red)' }}>₹{stock.stopLoss}</td>
                        <td className={styles.price} style={{ color: 'var(--accent-green)' }}>₹{stock.target}</td>
                        <td>{stock.rsi}</td>
                        <td>{stock.volumeMult}x</td>
                        <td><span className={styles.tag}>ANALYZE</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                !loading && (
                  <div className={styles.emptyState}>
                    <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No high-probability setups found today.</p>
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <div className={styles.analysisView}>
            <div className={styles.chartHeader}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h2 className={styles.stockTitle}>{selectedStock || 'Select a Stock'}</h2>
                <form onSubmit={handleManualSearch}>
                  <input
                    className={styles.searchBar}
                    placeholder="Symbol"
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value)}
                  />
                </form>
              </div>

              <div className={styles.chartControls}>
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.value}
                    className={`${styles.timeframeBtn} ${timeframe === tf.value ? styles.activeTimeframe : ''}`}
                    onClick={() => setTimeframe(tf.value)}
                  >
                    {tf.label}
                  </button>
                ))}
                <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>
                <button
                  className={`${styles.toggleBtn} ${activeRSI === 'rsi5' ? styles.activeToggle : ''}`}
                  onClick={() => setActiveRSI('rsi5')}
                >
                  RSI 5
                </button>
                <button
                  className={`${styles.toggleBtn} ${activeRSI === 'rsi14' ? styles.activeToggle : ''}`}
                  onClick={() => setActiveRSI('rsi14')}
                >
                  RSI 14
                </button>
              </div>
            </div>

            {loadingChart ? (
              <div className={styles.emptyState}>Loading Data...</div>
            ) : stockData.length > 0 ? (
              <div className={styles.chartContainer}>
                <Chart
                  data={stockData}
                  levels={chartLevels}
                  supportResistance={supportResistance}
                  visibleRSI={activeRSI}
                />
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Search for a stock or select one from the Scanner results.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

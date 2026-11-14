import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { FIAT_RATES } from '../data/seedData';
import { CryptoSymbol, FiatCurrency } from '../types/exchange';
import { formatCompactFiat, formatFiat, formatPrice } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';

const CATEGORIES = ['All', 'Layer 1', 'DeFi', 'Payments', 'Exchange', 'Stablecoin'] as const;

const Sparkline: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 96;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
      <polyline
        fill="none"
        stroke={positive ? '#0ECB81' : '#F6465D'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
};

export const MarketsView: React.FC = () => {
  const { markets, p2pOffers, setSelectedSpotPair, setActiveTab, fiat, setFiat, liveFeedEnabled, toggleLiveFeed } = useExchange();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const rate = FIAT_RATES[fiat].rateFromUsd;

  const topGainer = useMemo(
    () => [...markets].sort((a, b) => b.change24h - a.change24h)[0],
    [markets]
  );
  const volumeLeader = useMemo(
    () => [...markets].filter((m) => m.symbol !== 'USDT').sort((a, b) => b.volume24h - a.volume24h)[0],
    [markets]
  );
  const btcAsset = useMemo(() => markets.find((m) => m.symbol === 'BTC') ?? markets[0], [markets]);
  const bestUsdtSell = useMemo(
    () =>
      p2pOffers
        .filter((o) => o.merchantSide === 'SELL' && o.asset === 'USDT' && o.fiat === fiat)
        .sort((a, b) => a.price - b.price)[0],
    [p2pOffers, fiat]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return markets.filter((m) => {
      if (category !== 'All' && m.category !== category) return false;
      if (q && !m.symbol.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [markets, category, search]);

  const openSpot = (sym: CryptoSymbol) => {
    const pair = sym === 'USDT' || sym === 'USDC' ? 'BTC/USDT' : `${sym}/USDT`;
    setSelectedSpotPair(pair);
    setActiveTab('spot');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-200 dark:border-[#2B3139]">
        <div>
          <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF]">
            Markets Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-[#848E9C]">
            Real-time spot valuations, 24h volume leaders, and P2P liquidity benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto">
          <select
            aria-label="Display currency"
            value={fiat}
            onChange={(e) => setFiat(e.target.value as FiatCurrency)}
            className="px-2.5 sm:px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
          >
            {(Object.keys(FIAT_RATES) as FiatCurrency[]).map((f) => (
              <option key={f} value={f}>{f} ({FIAT_RATES[f].symbol})</option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleLiveFeed}
            className="px-3 sm:px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs font-medium text-slate-700 dark:text-[#EAECEF] hover:border-[#F0B90B] cursor-pointer"
          >
            {liveFeedEnabled ? 'Live Ticks: Active' : 'Live Ticks: Paused'}
          </button>
        </div>
      </div>

      {/* 4-Column Market Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => openSpot(btcAsset.symbol)}
          className="text-left p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B]/60 transition-colors cursor-pointer"
        >
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#848E9C] truncate">BTC/USDT Spot</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-bold text-slate-900 dark:text-[#EAECEF] truncate">
            {formatFiat(btcAsset.price * rate, fiat)}
          </p>
          <p className={`mt-1 font-mono text-xs font-semibold ${btcAsset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {btcAsset.change24h >= 0 ? '+' : ''}{btcAsset.change24h.toFixed(2)}% · ${formatPrice(btcAsset.price)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => openSpot(topGainer.symbol)}
          className="text-left p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B]/60 transition-colors cursor-pointer"
        >
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#848E9C] truncate">Top Gainer · {topGainer.symbol}</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-bold text-slate-900 dark:text-[#EAECEF] truncate">
            {formatFiat(topGainer.price * rate, fiat)}
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-[#0ECB81]">
            +{topGainer.change24h.toFixed(2)}%
          </p>
        </button>

        <button
          type="button"
          onClick={() => openSpot(volumeLeader.symbol)}
          className="text-left p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B]/60 transition-colors cursor-pointer"
        >
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#848E9C] truncate">Volume · {volumeLeader.symbol}</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-bold text-slate-900 dark:text-[#EAECEF] truncate">
            {formatCompactFiat(volumeLeader.volume24h, fiat)}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-[#848E9C]">24h Spot Turnover</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('p2p')}
          className="text-left p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B]/60 transition-colors cursor-pointer"
        >
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#848E9C] truncate">Best P2P USDT ({fiat})</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-bold text-slate-900 dark:text-[#EAECEF] truncate">
            {bestUsdtSell ? formatFiat(bestUsdtSell.price, fiat) : formatFiat(1.001 * rate, fiat)}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#F0B90B] inline-flex items-center gap-1 font-medium">
            <span>Trade 0-fee P2P</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </button>
      </div>

      {/* Category & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-slate-900 text-white dark:bg-[#2B3139] dark:text-[#F0B90B]'
                  : 'text-slate-600 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#181A20]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coin name or ticker"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
          />
        </div>
      </div>

      {/* Mobile App Markets List */}
      <div className="sm:hidden rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] divide-y divide-slate-200 dark:divide-[#2B3139]">
        {filtered.map((m) => {
          const pos = m.change24h >= 0;
          return (
            <div key={m.symbol} className="p-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openSpot(m.symbol)}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                <CoinIcon symbol={m.symbol} size={28} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-[#EAECEF] truncate">{m.symbol}</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C] truncate">{m.name}</div>
                </div>
              </button>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#EAECEF]">
                    {formatFiat(m.price * rate, fiat)}
                  </div>
                  <div className={`text-[11px] font-semibold ${pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {pos ? '+' : ''}{m.change24h.toFixed(2)}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSpot(m.symbol)}
                  className="px-2.5 py-1.5 rounded bg-[#F0B90B]/15 text-[11px] font-semibold text-[#F0B90B] cursor-pointer"
                >
                  Trade
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Markets Table */}
      <div className="hidden sm:block rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C]">
                <th className="py-3.5 px-5">Asset</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-right">24h Change</th>
                <th className="py-3.5 px-4 text-right hidden md:table-cell">24h High / Low</th>
                <th className="py-3.5 px-4 text-right hidden lg:table-cell">24h Volume</th>
                <th className="py-3.5 px-4 text-right hidden lg:table-cell">Market Cap</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Trend</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139] text-sm">
              {filtered.map((m) => {
                const pos = m.change24h >= 0;
                return (
                  <tr
                    key={m.symbol}
                    className="hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={m.symbol} size={28} />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-[#EAECEF]">{m.symbol}</div>
                          <div className="text-xs text-slate-500 dark:text-[#848E9C]">
                            {m.name} · {m.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-semibold text-slate-900 dark:text-[#EAECEF]">
                        {formatFiat(m.price * rate, fiat)}
                      </div>
                      {fiat !== 'USD' && (
                        <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">
                          ${formatPrice(m.price)}
                        </div>
                      )}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-mono font-semibold ${pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {pos ? '+' : ''}{m.change24h.toFixed(2)}%
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-[#848E9C] hidden md:table-cell">
                      ${formatPrice(m.high24h)} / ${formatPrice(m.low24h)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 dark:text-[#EAECEF] hidden lg:table-cell">
                      {formatCompactFiat(m.volume24h, fiat)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-[#848E9C] hidden lg:table-cell">
                      {formatCompactFiat(m.marketCap, fiat)}
                    </td>

                    <td className="py-3.5 px-4 hidden sm:table-cell">
                      <Sparkline data={m.sparkline} positive={pos} />
                    </td>

                    <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openSpot(m.symbol)}
                        className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
                      >
                        Spot
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('p2p')}
                        className="px-3 py-1.5 rounded bg-[#F0B90B]/15 hover:bg-[#F0B90B]/25 text-xs font-semibold text-[#F0B90B] cursor-pointer"
                      >
                        P2P
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

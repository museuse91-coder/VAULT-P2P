import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { FIAT_RATES } from '../data/seedData';
import { CryptoSymbol, OrderBookLevel, RecentMarketTrade, SpotOrderType, TradeSide } from '../types/exchange';
import { formatCompactUsd, formatCrypto, formatFiat, formatPrice, formatTimeAgo } from '../utils/format';
import { CandlestickChart } from '../components/CandlestickChart';
import { CoinIcon } from '../components/CoinIcon';

const SPOT_PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT'];
const CONVERT_COINS: CryptoSymbol[] = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX'];

export const SpotView: React.FC = () => {
  const {
    selectedSpotPair,
    setSelectedSpotPair,
    markets,
    candlesBySymbol,
    balances,
    spotOrders,
    tradeHistory,
    placeSpotOrder,
    cancelSpotOrder,
    convertAssets,
    theme,
    fiat,
  } = useExchange();

  const [terminalMode, setTerminalMode] = useState<'spot' | 'convert'>('spot');
  const [baseAsset, quoteAsset] = selectedSpotPair.split('/') as [CryptoSymbol, CryptoSymbol];

  const asset = useMemo(
    () => markets.find((m) => m.symbol === baseAsset) ?? markets[0],
    [markets, baseAsset]
  );

  // Spot Order Form state
  const [side, setSide] = useState<TradeSide>('BUY');
  const [orderType, setOrderType] = useState<SpotOrderType>('LIMIT');
  const [priceInput, setPriceInput] = useState<string>(asset.price.toString());
  const [stopInput, setStopInput] = useState<string>((asset.price * 0.99).toFixed(2));
  const [amountInput, setAmountInput] = useState<string>('');
  const [bookTab, setBookTab] = useState<'book' | 'trades'>('book');
  const [mobilePanel, setMobilePanel] = useState<'all' | 'chart' | 'book' | 'trade'>('all');
  const [blotterTab, setBlotterTab] = useState<'open' | 'history' | 'trades' | 'funds'>('open');

  // Instant Convert state
  const [convertFrom, setConvertFrom] = useState<CryptoSymbol>('USDT');
  const [convertTo, setConvertTo] = useState<CryptoSymbol>('BTC');
  const [convertAmount, setConvertAmount] = useState<string>('500');

  useEffect(() => {
    setPriceInput(asset.price.toString());
    setStopInput((asset.price * 0.99).toFixed(asset.price >= 10 ? 2 : 4));
  }, [baseAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderBook = useMemo(() => {
    const mid = asset.price;
    const step = mid >= 1000 ? 4.5 : mid >= 100 ? 0.25 : mid >= 10 ? 0.04 : 0.0012;
    const asks: OrderBookLevel[] = [];
    const bids: OrderBookLevel[] = [];
    let askCum = 0;
    let bidCum = 0;

    for (let i = 1; i <= 9; i++) {
      const aPrice = Number((mid + i * step).toPrecision(6));
      const aAmt = Number((((Math.sin(i * 2.1 + mid) + 1.4) * (1200 / mid)) + 0.05).toFixed(4));
      askCum += aAmt;
      asks.unshift({ price: aPrice, amount: aAmt, total: askCum });

      const bPrice = Number((Math.max(0.0001, mid - i * step)).toPrecision(6));
      const bAmt = Number((((Math.cos(i * 1.9 + mid) + 1.4) * (1200 / mid)) + 0.05).toFixed(4));
      bidCum += bAmt;
      bids.push({ price: bPrice, amount: bAmt, total: bidCum });
    }
    const maxTotal = Math.max(askCum, bidCum, 0.0001);
    return { asks, bids, maxTotal };
  }, [asset.price]);

  const recentMarketTrades: RecentMarketTrade[] = useMemo(() => {
    const list: RecentMarketTrade[] = [];
    const now = new Date();
    for (let i = 0; i < 16; i++) {
      const t = new Date(now.getTime() - i * 4200);
      const jitter = (Math.sin(i * 3.1 + asset.price) * 0.0012) * asset.price;
      const p = Number((asset.price + jitter).toPrecision(6));
      const amt = Number((Math.abs(Math.cos(i * 1.7)) * (600 / asset.price) + 0.015).toFixed(4));
      list.push({
        id: `rt-${i}`,
        price: p,
        amount: amt,
        time: t.toTimeString().slice(0, 8),
        side: i % 3 === 0 ? 'sell' : 'buy',
      });
    }
    return list;
  }, [asset.price]);

  const availQuote = balances[quoteAsset]?.spot ?? 0;
  const availBase = balances[baseAsset]?.spot ?? 0;

  const effectivePrice = orderType === 'MARKET' ? asset.price : parseFloat(priceInput) || 0;
  const parsedAmount = parseFloat(amountInput) || 0;
  const orderTotal = effectivePrice * parsedAmount;

  const handlePercentClick = (pct: number) => {
    if (side === 'BUY') {
      if (effectivePrice <= 0) return;
      const spend = availQuote * pct;
      const qty = spend / effectivePrice;
      setAmountInput(qty > 0 ? qty.toFixed(baseAsset === 'BTC' || baseAsset === 'ETH' ? 5 : 2) : '');
    } else {
      const qty = availBase * pct;
      setAmountInput(qty > 0 ? qty.toFixed(baseAsset === 'BTC' || baseAsset === 'ETH' ? 5 : 2) : '');
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = placeSpotOrder({
      baseAsset,
      quoteAsset,
      side,
      type: orderType,
      price: effectivePrice,
      stopPrice: orderType === 'STOP_LIMIT' ? parseFloat(stopInput) || undefined : undefined,
      amount: parsedAmount,
    });
    if (ok) {
      setAmountInput('');
    }
  };

  // Convert math
  const fromMarketPrice = markets.find((m) => m.symbol === convertFrom)?.price ?? 1;
  const toMarketPrice = markets.find((m) => m.symbol === convertTo)?.price ?? 1;
  const parsedConvert = parseFloat(convertAmount) || 0;
  const estimatedReceive = toMarketPrice > 0 ? (parsedConvert * fromMarketPrice) / toMarketPrice : 0;

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (convertAssets(convertFrom, convertTo, parsedConvert)) {
      setConvertAmount('');
    }
  };

  const openOrdersList = useMemo(() => spotOrders.filter((o) => o.status === 'OPEN'), [spotOrders]);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Terminal Top Strip: Pair Selector + 24h Ticker + Mode Toggle */}
      <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <CoinIcon symbol={baseAsset} size={24} />
            <select
              aria-label="Trading pair"
              value={selectedSpotPair}
              onChange={(e) => setSelectedSpotPair(e.target.value)}
              className="font-display text-sm sm:text-base font-bold bg-transparent text-slate-900 dark:text-[#EAECEF] focus:outline-none cursor-pointer"
            >
              {SPOT_PAIRS.map((pair) => (
                <option key={pair} value={pair} className="bg-white dark:bg-[#181A20]">
                  {pair}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs tabular-nums">
            <div>
              <div className={`font-mono text-sm sm:text-base font-bold ${asset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                ${formatPrice(asset.price)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-[#848E9C]">
                {fiat !== 'USD' ? `≈ ${formatFiat(asset.price * FIAT_RATES[fiat].rateFromUsd, fiat)}` : 'Last Price'}
              </div>
            </div>

            <div>
              <div className={`font-mono font-semibold ${asset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">24h Change</div>
            </div>

            <div className="hidden sm:block">
              <div className="font-mono text-slate-900 dark:text-[#EAECEF]">${formatPrice(asset.high24h)}</div>
              <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">24h High</div>
            </div>

            <div className="hidden sm:block">
              <div className="font-mono text-slate-900 dark:text-[#EAECEF]">${formatPrice(asset.low24h)}</div>
              <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">24h Low</div>
            </div>

            <div className="hidden md:block">
              <div className="font-mono text-slate-900 dark:text-[#EAECEF]">{formatCompactUsd(asset.volume24h)}</div>
              <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">24h Volume</div>
            </div>
          </div>
        </div>

        {/* Spot vs Convert Mode Switch */}
        <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-md bg-slate-100 dark:bg-[#0B0E11] border border-slate-200 dark:border-[#2B3139] w-full md:w-auto">
          <button
            type="button"
            onClick={() => setTerminalMode('spot')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer text-center ${
              terminalMode === 'spot'
                ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                : 'text-slate-500 dark:text-[#848E9C]'
            }`}
          >
            Spot Exchange
          </button>
          <button
            type="button"
            onClick={() => setTerminalMode('convert')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer text-center ${
              terminalMode === 'convert'
                ? 'bg-white dark:bg-[#2B3139] text-[#F0B90B]'
                : 'text-slate-500 dark:text-[#848E9C]'
            }`}
          >
            Instant Convert
          </button>
        </div>
      </div>

      {terminalMode === 'convert' ? (
        <div className="max-w-xl mx-auto py-4 sm:py-8">
          <form
            onSubmit={handleConvertSubmit}
            className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-4 sm:p-6 space-y-4 sm:space-y-5"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-[#EAECEF]">
                Zero-Fee Instant Convert
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#848E9C] mt-1">
                Swap directly between any Spot Wallet balances with guaranteed execution price.
              </p>
            </div>

            <div className="p-4 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
                <span>From</span>
                <button
                  type="button"
                  onClick={() => setConvertAmount(String(balances[convertFrom]?.spot ?? 0))}
                  className="font-mono hover:text-[#F0B90B] cursor-pointer"
                >
                  Available: {formatCrypto(balances[convertFrom]?.spot ?? 0, convertFrom)} {convertFrom}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-xl font-bold text-slate-900 dark:text-[#EAECEF] focus:outline-none"
                  placeholder="0.00"
                />
                <select
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value as CryptoSymbol)}
                  className="px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-sm font-semibold text-slate-900 dark:text-[#EAECEF]"
                >
                  {CONVERT_COINS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const prev = convertFrom;
                  setConvertFrom(convertTo);
                  setConvertTo(prev);
                }}
                className="p-2 rounded-full border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-slate-600 dark:text-[#848E9C] hover:border-[#F0B90B] cursor-pointer"
                aria-label="Swap assets"
              >
                <ArrowDownUp className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
                <span>To (Estimated)</span>
                <span className="font-mono">
                  Balance: {formatCrypto(balances[convertTo]?.spot ?? 0, convertTo)} {convertTo}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono text-xl font-bold text-[#0ECB81]">
                  {estimatedReceive > 0 ? formatCrypto(estimatedReceive, convertTo) : '0.00'}
                </div>
                <select
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value as CryptoSymbol)}
                  className="px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-sm font-semibold text-slate-900 dark:text-[#EAECEF]"
                >
                  {CONVERT_COINS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
              <span>Conversion Rate</span>
              <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                1 {convertFrom} ≈ {(fromMarketPrice / toMarketPrice).toFixed(6)} {convertTo}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
            >
              Convert {convertFrom} to {convertTo} (0 Fee)
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Mobile Spot Terminal Quick Tabs */}
          <div className="lg:hidden grid grid-cols-4 gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'chart', label: 'Chart' },
                { id: 'book', label: 'Book' },
                { id: 'trade', label: 'Trade' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobilePanel(tab.id)}
                className={`py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  mobilePanel === tab.id
                    ? 'bg-white dark:bg-[#2B3139] text-[#F0B90B]'
                    : 'text-slate-600 dark:text-[#848E9C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3-Column Trading Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Left/Center: Candlestick Chart */}
            <div
              className={`lg:col-span-6 xl:col-span-7 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col min-h-[290px] sm:min-h-[420px] ${
                mobilePanel !== 'all' && mobilePanel !== 'chart' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <CandlestickChart
                symbol={baseAsset}
                candles={candlesBySymbol[baseAsset] ?? []}
                isDark={theme === 'dark'}
              />
            </div>

            {/* Middle: Order Book & Market Trades */}
            <div
              className={`lg:col-span-3 xl:col-span-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col ${
                mobilePanel !== 'all' && mobilePanel !== 'book' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="flex border-b border-slate-200 dark:border-[#2B3139] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBookTab('book')}
                  className={`flex-1 py-2.5 cursor-pointer ${
                    bookTab === 'book'
                      ? 'text-slate-900 dark:text-[#EAECEF] border-b-2 border-[#F0B90B]'
                      : 'text-slate-500 dark:text-[#848E9C]'
                  }`}
                >
                  Order Book
                </button>
                <button
                  type="button"
                  onClick={() => setBookTab('trades')}
                  className={`flex-1 py-2.5 cursor-pointer ${
                    bookTab === 'trades'
                      ? 'text-slate-900 dark:text-[#EAECEF] border-b-2 border-[#F0B90B]'
                      : 'text-slate-500 dark:text-[#848E9C]'
                  }`}
                >
                  Trades
                </button>
              </div>

              {bookTab === 'book' ? (
                <div className="p-2.5 flex-1 flex flex-col justify-between text-[11px] font-mono tabular-nums">
                  <div className="grid grid-cols-3 text-slate-400 pb-1.5 px-1">
                    <span>Price</span>
                    <span className="text-right">Size</span>
                    <span className="text-right">Total</span>
                  </div>

                  {/* Asks */}
                  <div className="space-y-0.5">
                    {orderBook.asks.map((lvl, idx) => (
                      <button
                        key={`ask-${idx}`}
                        type="button"
                        onClick={() => {
                          setOrderType('LIMIT');
                          setPriceInput(lvl.price.toString());
                        }}
                        className="relative w-full grid grid-cols-3 px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
                      >
                        <span
                          className="absolute inset-y-0 right-0 bg-[#F6465D]/12 pointer-events-none"
                          style={{ width: `${Math.min(100, (lvl.total / orderBook.maxTotal) * 100)}%` }}
                        />
                        <span className="relative text-[#F6465D]">{formatPrice(lvl.price)}</span>
                        <span className="relative text-right text-slate-700 dark:text-[#EAECEF]">{lvl.amount.toFixed(3)}</span>
                        <span className="relative text-right text-slate-500 dark:text-[#848E9C]">{lvl.total.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Spread Mid Price */}
                  <div className="my-2 py-1.5 px-1 border-y border-slate-200 dark:border-[#2B3139] flex items-center justify-between">
                    <span className={`text-sm font-bold ${asset.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      ${formatPrice(asset.price)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#848E9C]">Spread 0.01%</span>
                  </div>

                  {/* Bids */}
                  <div className="space-y-0.5">
                    {orderBook.bids.map((lvl, idx) => (
                      <button
                        key={`bid-${idx}`}
                        type="button"
                        onClick={() => {
                          setOrderType('LIMIT');
                          setPriceInput(lvl.price.toString());
                        }}
                        className="relative w-full grid grid-cols-3 px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
                      >
                        <span
                          className="absolute inset-y-0 right-0 bg-[#0ECB81]/12 pointer-events-none"
                          style={{ width: `${Math.min(100, (lvl.total / orderBook.maxTotal) * 100)}%` }}
                        />
                        <span className="relative text-[#0ECB81]">{formatPrice(lvl.price)}</span>
                        <span className="relative text-right text-slate-700 dark:text-[#EAECEF]">{lvl.amount.toFixed(3)}</span>
                        <span className="relative text-right text-slate-500 dark:text-[#848E9C]">{lvl.total.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 flex-1 overflow-y-auto text-[11px] font-mono tabular-nums space-y-1">
                  <div className="grid grid-cols-3 text-slate-400 pb-1">
                    <span>Price</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Time</span>
                  </div>
                  {recentMarketTrades.map((rt) => (
                    <div key={rt.id} className="grid grid-cols-3 py-0.5">
                      <span className={rt.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                        {formatPrice(rt.price)}
                      </span>
                      <span className="text-right text-slate-700 dark:text-[#EAECEF]">{rt.amount.toFixed(3)}</span>
                      <span className="text-right text-slate-500 dark:text-[#848E9C]">{rt.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Spot Order Ticket */}
            <div
              className={`lg:col-span-3 xl:col-span-3 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-3.5 sm:p-4 flex flex-col justify-between ${
                mobilePanel !== 'all' && mobilePanel !== 'trade' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#0B0E11]">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={`py-2 rounded text-xs font-semibold cursor-pointer ${
                      side === 'BUY' ? 'bg-[#0ECB81] text-[#0B0E11]' : 'text-slate-600 dark:text-[#848E9C]'
                    }`}
                  >
                    Buy {baseAsset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('SELL')}
                    className={`py-2 rounded text-xs font-semibold cursor-pointer ${
                      side === 'SELL' ? 'bg-[#F6465D] text-white' : 'text-slate-600 dark:text-[#848E9C]'
                    }`}
                  >
                    Sell {baseAsset}
                  </button>
                </div>

                {/* Order Type Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#2B3139] pb-2 text-xs font-medium">
                  {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as SpotOrderType[]).map((ot) => (
                    <button
                      key={ot}
                      type="button"
                      onClick={() => setOrderType(ot)}
                      className={`cursor-pointer ${
                        orderType === ot
                          ? 'text-[#F0B90B] font-semibold'
                          : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                      }`}
                    >
                      {ot === 'STOP_LIMIT' ? 'Stop-Limit' : ot === 'LIMIT' ? 'Limit' : 'Market'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
                  <span>Available</span>
                  <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                    {side === 'BUY'
                      ? `${formatCrypto(availQuote, quoteAsset)} ${quoteAsset}`
                      : `${formatCrypto(availBase, baseAsset)} ${baseAsset}`}
                  </span>
                </div>

                {orderType === 'STOP_LIMIT' && (
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Stop Price ({quoteAsset})</label>
                    <input
                      type="number"
                      step="any"
                      value={stopInput}
                      onChange={(e) => setStopInput(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Price ({quoteAsset})</label>
                  <input
                    type="number"
                    step="any"
                    disabled={orderType === 'MARKET'}
                    value={orderType === 'MARKET' ? asset.price.toString() : priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Amount ({baseAsset})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF]"
                  />
                </div>

                {/* Quick % Slider Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentClick(pct)}
                      className="py-1 rounded border border-slate-200 dark:border-[#2B3139] text-[11px] font-mono text-slate-600 dark:text-[#848E9C] hover:border-[#F0B90B] hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer"
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-[#2B3139]">
                  <span className="text-slate-500 dark:text-[#848E9C]">Order Total</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                    {orderTotal > 0 ? `${orderTotal.toFixed(2)} ${quoteAsset}` : `0.00 ${quoteAsset}`}
                  </span>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                    side === 'BUY'
                      ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]'
                      : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                  }`}
                >
                  {side === 'BUY' ? `Buy ${baseAsset}` : `Sell ${baseAsset}`}
                </button>
              </form>

              <p className="mt-4 text-[11px] text-slate-500 dark:text-[#848E9C]">
                Spot maker/taker fee: 0.10%. Limit orders execute automatically as market price crosses target.
              </p>
            </div>
          </div>

          {/* Bottom Order & Execution Blotter */}
          <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
            <div className="flex items-center gap-4 sm:gap-6 px-3 sm:px-5 border-b border-slate-200 dark:border-[#2B3139] text-xs font-semibold overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'open', label: `Open Orders (${openOrdersList.length})` },
                  { id: 'history', label: `Order History (${spotOrders.length})` },
                  { id: 'trades', label: `Trade History (${tradeHistory.length})` },
                  { id: 'funds', label: 'Spot Funds' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBlotterTab(t.id)}
                  className={`py-3 relative cursor-pointer whitespace-nowrap shrink-0 ${
                    blotterTab === t.id
                      ? 'text-slate-900 dark:text-[#EAECEF]'
                      : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  {t.label}
                  {blotterTab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F0B90B]" />}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {blotterTab === 'open' && (
                <table className="w-full text-left text-xs min-w-[540px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                      <th className="py-3 px-5">Pair</th>
                      <th className="py-3 px-4">Type / Side</th>
                      <th className="py-3 px-4 text-right">Limit Price</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                    {openOrdersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-[#848E9C]">
                          No open limit orders. Place a Limit Buy/Sell below or above market price to queue an order.
                        </td>
                      </tr>
                    ) : (
                      openOrdersList.map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 px-5 font-semibold text-slate-900 dark:text-[#EAECEF]">{o.pair}</td>
                          <td className={`py-3 px-4 font-semibold ${o.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {o.type} {o.side}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">${formatPrice(o.price)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{o.amount} {o.baseAsset}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{o.total.toFixed(2)} {o.quoteAsset}</td>
                          <td className="py-3 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => cancelSpotOrder(o.id)}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F6465D] text-[#F6465D] font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {blotterTab === 'history' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-4">Pair</th>
                      <th className="py-3 px-4">Side</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                    {spotOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-[#848E9C]">No spot orders placed yet.</td>
                      </tr>
                    ) : (
                      spotOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 px-5 text-slate-500 dark:text-[#848E9C]">{formatTimeAgo(o.createdAt)}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-[#EAECEF]">{o.pair}</td>
                          <td className={`py-3 px-4 font-semibold ${o.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {o.type} {o.side}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">${formatPrice(o.price)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{o.amount} {o.baseAsset}</td>
                          <td className="py-3 px-5 text-right font-semibold text-slate-700 dark:text-[#EAECEF]">{o.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {blotterTab === 'trades' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-4">Pair</th>
                      <th className="py-3 px-4">Side</th>
                      <th className="py-3 px-4 text-right">Executed Price</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Fee</th>
                      <th className="py-3 px-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                    {tradeHistory.map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-3 px-5 text-slate-500 dark:text-[#848E9C]">{formatTimeAgo(ex.timestamp)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-[#EAECEF]">{ex.pair}</td>
                        <td className={`py-3 px-4 font-semibold ${ex.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{ex.side}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">${formatPrice(ex.price)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{ex.amount}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-[#848E9C]">{ex.fee.toFixed(5)} {ex.feeAsset}</td>
                        <td className="py-3 px-5 text-right font-mono text-slate-900 dark:text-[#EAECEF]">${ex.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {blotterTab === 'funds' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                      <th className="py-3 px-5">Coin</th>
                      <th className="py-3 px-4 text-right">Spot Available</th>
                      <th className="py-3 px-4 text-right">In Open Orders</th>
                      <th className="py-3 px-5 text-right">Funding (P2P)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                    {markets.map((m) => {
                      const b = balances[m.symbol];
                      return (
                        <tr key={m.symbol}>
                          <td className="py-3 px-5 font-semibold text-slate-900 dark:text-[#EAECEF]">{m.symbol}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{formatCrypto(b.spot, m.symbol)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-[#848E9C]">{formatCrypto(b.spotLocked, m.symbol)}</td>
                          <td className="py-3 px-5 text-right font-mono text-slate-900 dark:text-[#EAECEF]">{formatCrypto(b.funding, m.symbol)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { CryptoSymbol } from '../types/exchange';
import { formatCompactUsd, formatFiat, formatPrice } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';

const FAQ_ITEMS = [
  {
    q: 'How does Vault P2P escrow protect buyers and sellers?',
    a: 'When a P2P order is opened, the seller’s crypto is immediately locked in Vault Escrow. Funds are only released to the buyer once the seller confirms receipt of the fiat payment, or resolved through Vault Arbitration if an appeal is raised.',
  },
  {
    q: 'Are there platform fees on P2P trades or internal wallet transfers?',
    a: 'Takers pay 0% platform fee on all P2P orders across Wise, Revolut, Bank Transfer, SEPA Instant, Zelle, and UPI. Transfers between your Spot Wallet and P2P Funding Wallet are also instant and free.',
  },
  {
    q: 'How do I become a verified P2P Buyer or Seller merchant?',
    a: 'Navigate to the P2P tab and click "Post Ad" to publish your own Buy or Sell offer with custom pricing, min/max fiat limits, and accepted payment methods.',
  },
  {
    q: 'Can I trade spot markets and earn yield in the same account?',
    a: 'Yes. Move funds freely between your Funding (P2P) Wallet and Spot Wallet to trade Limit, Market, and Stop-Limit order books, swap assets via 0-fee Convert, or stake in Simple Earn vaults.',
  },
];

export const HomeView: React.FC = () => {
  const {
    markets,
    p2pOffers,
    fiat,
    currentUser,
    openAuthPage,
    setActiveTab,
    setSelectedSpotPair,
    setDepositModalOpen,
  } = useExchange();

  const [quickEmail, setQuickEmail] = useState('');
  const [tickerTab, setTickerTab] = useState<'popular' | 'gainers' | 'p2p'>('popular');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const popularCoins = useMemo(
    () => markets.filter((m) => ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'].includes(m.symbol)),
    [markets]
  );

  const topGainers = useMemo(
    () => [...markets].filter((m) => m.symbol !== 'USDT' && m.symbol !== 'USDC').sort((a, b) => b.change24h - a.change24h).slice(0, 5),
    [markets]
  );

  const featuredP2P = useMemo(
    () => p2pOffers.filter((o) => o.fiat === fiat).slice(0, 4),
    [p2pOffers, fiat]
  );

  const fallbackP2P = useMemo(
    () => (featuredP2P.length > 0 ? featuredP2P : p2pOffers.slice(0, 4)),
    [featuredP2P, p2pOffers]
  );

  const handleQuickStart = (e: React.FormEvent) => {
    e.preventDefault();
    openAuthPage('signup', quickEmail.trim());
  };

  const openSpotSymbol = (sym: CryptoSymbol) => {
    setSelectedSpotPair(sym === 'USDT' || sym === 'USDC' ? 'BTC/USDT' : `${sym}/USDT`);
    setActiveTab('spot');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16">
      {/* 1. Binance-Style Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Hero Column */}
        <div className="lg:col-span-7 flex flex-col justify-between py-2">
          <div className="space-y-6">
            <p className="text-xs font-semibold text-[#F0B90B]">
              Zero-Fee P2P Escrow · Spot Exchange · Simple Earn
            </p>
            <h1 className="font-display text-[clamp(2.25rem,4vw,3.65rem)] font-bold leading-[1.08] tracking-tight text-slate-900 dark:text-[#EAECEF] [text-wrap:balance]">
              Trade crypto peer-to-peer with institutional spot liquidity.
            </h1>
            <p className="text-base leading-relaxed text-slate-600 dark:text-[#848E9C] max-w-xl">
              Buy and sell USDT, BTC, ETH, and SOL directly with verified merchants using local bank transfers, Wise, Revolut, or SEPA—backed by Vault Escrow and live order books.
            </p>

            {/* Quick Start CTA / Registration Strip */}
            {currentUser ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('p2p')}
                  className="px-6 py-3 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open P2P Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('spot')}
                  className="px-6 py-3 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-sm font-semibold text-slate-900 dark:text-[#EAECEF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Spot Terminal
                </button>
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(true)}
                  className="px-5 py-3 rounded-md text-sm font-semibold text-[#F0B90B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Deposit Funds
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickStart} className="flex flex-col sm:flex-row gap-3 max-w-lg pt-1">
                <input
                  type="email"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address for sign up"
                  className="flex-1 px-4 py-3 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  Get Started
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('p2p')}
                  className="px-5 py-3 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-sm font-semibold text-slate-900 dark:text-[#EAECEF] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  P2P Market
                </button>
              </form>
            )}
          </div>

          {/* 3-Column Platform Benchmark Strip */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-[#2B3139] grid grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">0%</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-[#848E9C]">P2P Taker Escrow Fee</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">20+</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-[#848E9C]">Verified Buyers & Sellers</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">9.4%</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-[#848E9C]">Max Simple Earn APR</div>
            </div>
          </div>
        </div>

        {/* Right Hero Column: Binance-Style Live Market Watch Box */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#2B3139]">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTickerTab('popular')}
                  className={`py-1 cursor-pointer ${
                    tickerTab === 'popular'
                      ? 'text-slate-900 dark:text-[#EAECEF] border-b-2 border-[#F0B90B]'
                      : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  Popular
                </button>
                <button
                  type="button"
                  onClick={() => setTickerTab('gainers')}
                  className={`py-1 cursor-pointer ${
                    tickerTab === 'gainers'
                      ? 'text-slate-900 dark:text-[#EAECEF] border-b-2 border-[#F0B90B]'
                      : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  Top Gainers
                </button>
                <button
                  type="button"
                  onClick={() => setTickerTab('p2p')}
                  className={`py-1 cursor-pointer ${
                    tickerTab === 'p2p'
                      ? 'text-slate-900 dark:text-[#EAECEF] border-b-2 border-[#F0B90B]'
                      : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  P2P Rates
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(tickerTab === 'p2p' ? 'p2p' : 'markets')}
                className="text-xs font-medium text-slate-500 dark:text-[#848E9C] hover:text-[#F0B90B] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {tickerTab === 'p2p' ? (
              <div className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                {fallbackP2P.map((offer) => (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => setActiveTab('p2p')}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CoinIcon symbol={offer.asset} size={26} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF] truncate">
                          {offer.merchantName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-[#848E9C]">
                          {offer.merchantSide === 'SELL' ? 'Selling' : 'Buying'} {offer.asset} · {offer.completionRate}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-[#EAECEF]">
                        {formatFiat(offer.price, offer.fiat)}
                      </div>
                      <div className="text-[11px] text-[#0ECB81] font-medium">
                        {offer.paymentMethods[0]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                {(tickerTab === 'popular' ? popularCoins : topGainers).map((m) => {
                  const pos = m.change24h >= 0;
                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => openSpotSymbol(m.symbol)}
                      className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={m.symbol} size={26} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">{m.symbol}</div>
                          <div className="text-xs text-slate-500 dark:text-[#848E9C]">{m.name}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                          ${formatPrice(m.price)}
                        </div>
                        <div className={`text-xs font-semibold ${pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {pos ? '+' : ''}{m.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#2B3139] bg-slate-50/70 dark:bg-[#14171C] flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-[#848E9C]">
              24h Global Spot Turnover: <strong className="font-mono text-slate-900 dark:text-[#EAECEF]">{formatCompactUsd(markets.reduce((s, m) => s + m.volume24h, 0))}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('spot')}
              className="font-semibold text-[#F0B90B] hover:underline cursor-pointer"
            >
              Trade Spot
            </button>
          </div>
        </div>
      </section>

      {/* 2. Featured P2P Buyers & Sellers Strip */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#EAECEF]">
              Featured Verified P2P Desks ({fiat})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-[#848E9C]">
              Direct liquidity from top-rated buyers and sellers with instant escrow settlement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('p2p')}
            className="text-xs font-semibold text-[#F0B90B] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Browse all P2P Buyers & Sellers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fallbackP2P.map((offer) => (
            <div
              key={offer.id}
              className="p-5 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-[#EAECEF] truncate">
                    <span className="truncate">{offer.merchantName}</span>
                    {offer.isVerified && <ShieldCheck className="w-4 h-4 text-[#F0B90B] shrink-0" />}
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${offer.merchantSide === 'SELL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {offer.merchantSide === 'SELL' ? 'Seller' : 'Buyer'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
                  {offer.completedOrders.toLocaleString()} orders · {offer.completionRate}% completion
                </p>
                <div className="pt-2">
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">
                    {formatFiat(offer.price, offer.fiat)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#848E9C]">
                    per {offer.asset} · {offer.paymentMethods.slice(0, 2).join(' · ')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('p2p')}
                className={`w-full py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  offer.merchantSide === 'SELL'
                    ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]'
                    : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                }`}
              >
                {offer.merchantSide === 'SELL' ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Binance-Style Product Ecosystem (4-Column Grid) */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#EAECEF]">
            One Platform. Every Way to Trade.
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-[#848E9C]">
            Switch seamlessly between peer-to-peer fiat rails, spot order books, instant swaps, and yield vaults.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between gap-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                01. P2P Escrow Desk
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                Buy or sell crypto directly with verified counterparties via Bank Transfer, Wise, Revolut, SEPA, or UPI with live trade chat.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('p2p')}
              className="text-left text-xs font-semibold text-[#F0B90B] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open P2P Market</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between gap-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                02. Spot Trading Terminal
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                Interactive candlestick charts with MA overlays, real-time depth order books, and Limit, Market, and Stop-Limit orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('spot')}
              className="text-left text-xs font-semibold text-[#F0B90B] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Spot Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between gap-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                03. Simple Earn Vaults
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                Earn daily yield up to 9.4% APR on USDT, BTC, ETH, BNB, and SOL with Flexible or Locked staking terms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('earn')}
              className="text-left text-xs font-semibold text-[#F0B90B] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Earn Vaults</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] flex flex-col justify-between gap-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                04. Unified Multi-Wallet
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                Manage Spot and Funding (P2P) balances, generate network deposit addresses, withdraw, and track every settlement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              className="text-left text-xs font-semibold text-[#F0B90B] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-slate-200 dark:border-[#2B3139]">
        <div className="lg:col-span-4 space-y-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#EAECEF]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#848E9C]">
            Everything you need to know about Vault P2P escrow, merchant ads, and spot execution.
          </p>
        </div>

        <div className="lg:col-span-8 divide-y divide-slate-200 dark:divide-[#2B3139] rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs leading-relaxed text-slate-600 dark:text-[#848E9C]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Bottom Conversion Banner */}
      <section className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] px-6 py-8 sm:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#EAECEF]">
            {currentUser ? `Ready to trade, ${currentUser.fullName}?` : 'Start trading on Vault P2P today.'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#848E9C]">
            Zero P2P escrow fees, instant internal transfers, and live spot execution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setActiveTab('p2p')}
              className="px-6 py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
            >
              Trade P2P Now
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthPage('login')}
                className="px-5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-sm font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => openAuthPage('signup')}
                className="px-6 py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
              >
                Sign Up Now
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

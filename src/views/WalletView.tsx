import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Eye, EyeOff, LogOut, Moon, RotateCcw, Sun, X } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { FIAT_RATES } from '../data/seedData';
import { CryptoSymbol, FiatCurrency } from '../types/exchange';
import { formatCrypto, formatFiat, formatPrice, formatTimeAgo } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';

export const WalletView: React.FC = () => {
  const {
    currentUser,
    openAuthPage,
    logoutUser,
    markets,
    balances,
    totalPortfolioUsd,
    fiat,
    setFiat,
    transactions,
    tradeHistory,
    p2pOrders,
    hideBalances,
    toggleHideBalances,
    theme,
    toggleTheme,
    setDepositModalOpen,
    withdrawFunds,
    transferFunds,
    setActiveTab,
    setSelectedSpotPair,
    resetDemoState,
  } = useExchange();

  const [walletTab, setWalletTab] = useState<'overview' | 'spot' | 'funding' | 'history' | 'tax'>('overview');

  // Transfer Modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAsset, setTransferAsset] = useState<CryptoSymbol>('USDT');
  const [transferDir, setTransferDir] = useState<'SPOT_TO_FUNDING' | 'FUNDING_TO_SPOT'>('SPOT_TO_FUNDING');
  const [transferAmount, setTransferAmount] = useState<string>('');

  // Withdraw Modal
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAsset, setWithdrawAsset] = useState<CryptoSymbol>('USDT');
  const [withdrawNetIdx, setWithdrawNetIdx] = useState(0);
  const [withdrawAddr, setWithdrawAddr] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const btcPrice = markets.find((m) => m.symbol === 'BTC')?.price ?? 91420;
  const totalBtc = btcPrice > 0 ? totalPortfolioUsd / btcPrice : 0;
  const inrRate = FIAT_RATES.INR.rateFromUsd;
  const activeFiatRate = FIAT_RATES[fiat].rateFromUsd;

  const assetRows = useMemo(() => {
    return markets.map((m) => {
      const b = balances[m.symbol];
      const totalAmt = b.spot + b.spotLocked + b.funding + b.fundingLocked;
      const usdVal = totalAmt * m.price;
      return {
        market: m,
        balance: b,
        totalAmt,
        usdVal,
      };
    });
  }, [markets, balances]);

  // India VDA 1% TDS (Section 194S) calculations
  const taxLedger = useMemo(() => {
    const priceMap = new Map(markets.map((m) => [m.symbol, m.price]));
    const rows: {
      id: string;
      timestamp: number;
      source: string;
      pairOrAsset: string;
      inrGross: number;
      tdsRate: number;
      tdsInr: number;
      note: string;
    }[] = [];

    tradeHistory.forEach((tr) => {
      const baseSym = tr.pair.split('/')[0] as CryptoSymbol;
      const quoteSym = tr.pair.split('/')[1] as CryptoSymbol;
      const usdGross = tr.total * (priceMap.get(quoteSym) ?? 1);
      const inrGross = usdGross * inrRate;
      const tdsApplicable = tr.side === 'SELL';
      rows.push({
        id: `spot-${tr.id}`,
        timestamp: tr.timestamp,
        source: `Spot ${tr.side}`,
        pairOrAsset: `${formatCrypto(tr.amount, baseSym)} ${baseSym} @ ${tr.pair}`,
        inrGross,
        tdsRate: tdsApplicable ? 0.01 : 0,
        tdsInr: tdsApplicable ? inrGross * 0.01 : 0,
        note: tdsApplicable ? 'Sec. 194S (1% on VDA Sell)' : 'Buy Order (0% TDS)',
      });
    });

    p2pOrders
      .filter((o) => o.status === 'COMPLETED')
      .forEach((o) => {
        const inrGross =
          o.fiat === 'INR'
            ? o.fiatAmount
            : (o.cryptoAmount * (priceMap.get(o.asset) ?? 1)) * inrRate;
        const tdsApplicable = o.userSide === 'SELL';
        rows.push({
          id: `p2p-${o.id}`,
          timestamp: o.createdAt,
          source: `P2P ${o.userSide}`,
          pairOrAsset: `${formatCrypto(o.cryptoAmount, o.asset)} ${o.asset} (${o.paymentMethod})`,
          inrGross,
          tdsRate: tdsApplicable ? 0.01 : 0,
          tdsInr: tdsApplicable ? inrGross * 0.01 : 0,
          note: tdsApplicable ? 'Sec. 194S (1% on P2P Sell)' : 'P2P Purchase (0% TDS)',
        });
      });

    transactions
      .filter((tx) => tx.type === 'CONVERT' || tx.type === 'P2P_SELL')
      .forEach((tx) => {
        const inrGross = tx.amount * (priceMap.get(tx.asset) ?? 1) * inrRate;
        rows.push({
          id: `tx-${tx.id}`,
          timestamp: tx.timestamp,
          source: tx.type.replace(/_/g, ' '),
          pairOrAsset: `${formatCrypto(tx.amount, tx.asset)} ${tx.asset}`,
          inrGross,
          tdsRate: 0.01,
          tdsInr: inrGross * 0.01,
          note: tx.type === 'CONVERT' ? 'VDA-to-VDA Swap (1% TDS)' : 'Sec. 194S Disposal',
        });
      });

    return rows.sort((a, b) => b.timestamp - a.timestamp);
  }, [tradeHistory, p2pOrders, transactions, markets, inrRate]);

  const taxSummary = useMemo(() => {
    const taxableTurnoverInr = taxLedger.reduce((acc, r) => (r.tdsInr > 0 ? acc + r.inrGross : acc), 0);
    const totalTdsInr = taxLedger.reduce((acc, r) => acc + r.tdsInr, 0);
    const totalVolumeInr = taxLedger.reduce((acc, r) => acc + r.inrGross, 0);
    return { taxableTurnoverInr, totalTdsInr, totalVolumeInr };
  }, [taxLedger]);

  const handleDownloadTaxCsv = () => {
    const header = ['Date', 'Source', 'Asset / Pair', 'Gross Value (INR)', 'TDS Rate', 'Est. 1% TDS (INR)', 'Note'];
    const csvRows = [
      header.join(','),
      ...taxLedger.map((r) =>
        [
          new Date(r.timestamp).toISOString(),
          `"${r.source}"`,
          `"${r.pairOrAsset}"`,
          r.inrGross.toFixed(2),
          `${(r.tdsRate * 100).toFixed(0)}%`,
          r.tdsInr.toFixed(2),
          `"${r.note}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vault-p2p-india-vda-tds.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeWithdrawAsset = markets.find((m) => m.symbol === withdrawAsset) ?? markets[0];
  const activeWithdrawNet = activeWithdrawAsset.networks[withdrawNetIdx] ?? activeWithdrawAsset.networks[0];

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (transferFunds(transferAsset, amt, transferDir)) {
      setTransferOpen(false);
      setTransferAmount('');
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (withdrawFunds(withdrawAsset, amt, activeWithdrawNet.name, activeWithdrawNet.fee, withdrawAddr)) {
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawAddr('');
    }
  };

  const mask = (val: string) => (hideBalances ? '••••••' : val);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Account Session Strip */}
      <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {currentUser ? (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                {currentUser.fullName}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#848E9C]">
                {currentUser.email} · Verified Account
              </div>
            </div>
            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F6465D] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] hover:text-[#F6465D] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                You are browsing in Guest Demo Mode
              </div>
              <div className="text-xs text-slate-500 dark:text-[#848E9C]">
                Sign in or create an account to bind your verified identity to P2P ads and wallets.
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openAuthPage('login')}
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => openAuthPage('signup')}
                className="px-4 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </>
        )}
      </div>

      {/* Portfolio Valuation Header */}
      <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-sm font-medium text-slate-500 dark:text-[#848E9C]">
              Estimated Portfolio Balance
            </h1>
            <button
              type="button"
              onClick={toggleHideBalances}
              className="p-1 rounded text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer"
              aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
            >
              {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">
              {mask(
                fiat === 'USD'
                  ? `$${formatPrice(totalPortfolioUsd)}`
                  : formatFiat(totalPortfolioUsd * activeFiatRate, fiat)
              )}
            </span>
            {fiat !== 'USD' && (
              <span className="font-mono text-sm text-slate-500 dark:text-[#848E9C] tabular-nums">
                ≈ {mask(`$${formatPrice(totalPortfolioUsd)}`)}
              </span>
            )}
            <span className="font-mono text-sm text-slate-500 dark:text-[#848E9C] tabular-nums">
              ≈ {mask(`${totalBtc.toFixed(5)} BTC`)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          <select
            value={fiat}
            onChange={(e) => setFiat(e.target.value as FiatCurrency)}
            aria-label="Wallet valuation currency"
            className="w-full sm:w-auto px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs font-semibold text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B] cursor-pointer"
          >
            {(Object.keys(FIAT_RATES) as FiatCurrency[]).map((code) => (
              <option key={code} value={code}>
                {code} ({FIAT_RATES[code].symbol})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDepositModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold cursor-pointer"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
          >
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#F0B90B]" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            type="button"
            onClick={resetDemoState}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C] hover:text-[#F6465D] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Wallet Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139] w-full md:w-fit overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'overview', label: 'All Assets' },
            { id: 'spot', label: 'Spot Wallet' },
            { id: 'funding', label: 'Funding (P2P)' },
            { id: 'history', label: `History (${transactions.length})` },
            { id: 'tax', label: 'India VDA Tax (1% TDS)' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setWalletTab(t.id)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              walletTab === t.id
                ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                : 'text-slate-600 dark:text-[#848E9C]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {walletTab === 'tax' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                India VDA Tax & 1% TDS Summary (Section 194S)
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#848E9C] max-w-2xl">
                Estimated 1% TDS applies to VDA sell orders, crypto-to-crypto swaps, and P2P disposals settled in INR ({FIAT_RATES.INR.rateFromUsd} INR/USD reference).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTaxCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Tax CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20]">
              <div className="text-xs text-slate-500 dark:text-[#848E9C]">Total Tracked Volume (INR)</div>
              <div className="font-mono text-xl font-bold text-slate-900 dark:text-[#EAECEF] mt-1 tabular-nums">
                {mask(formatFiat(taxSummary.totalVolumeInr, 'INR'))}
              </div>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20]">
              <div className="text-xs text-slate-500 dark:text-[#848E9C]">TDS-Eligible Disposal Turnover</div>
              <div className="font-mono text-xl font-bold text-slate-900 dark:text-[#EAECEF] mt-1 tabular-nums">
                {mask(formatFiat(taxSummary.taxableTurnoverInr, 'INR'))}
              </div>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20]">
              <div className="text-xs text-slate-500 dark:text-[#848E9C]">Estimated 1% TDS (Sec. 194S)</div>
              <div className="font-mono text-xl font-bold text-[#F0B90B] mt-1 tabular-nums">
                {mask(formatFiat(taxSummary.totalTdsInr, 'INR'))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                    <th className="py-3.5 px-5">Time</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Asset / Pair</th>
                    <th className="py-3.5 px-4 text-right">INR Value</th>
                    <th className="py-3.5 px-4 text-right">Est. 1% TDS</th>
                    <th className="py-3.5 px-5 text-right">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                  {taxLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-[#848E9C]">
                        No Spot, Swap, or P2P executions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    taxLedger.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3.5 px-5 text-slate-500 dark:text-[#848E9C]">{formatTimeAgo(r.timestamp)}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-[#EAECEF]">{r.source}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-[#EAECEF]">{r.pairOrAsset}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-[#EAECEF] tabular-nums">
                          {mask(formatFiat(r.inrGross, 'INR'))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#F0B90B] tabular-nums">
                          {r.tdsInr > 0 ? mask(formatFiat(r.tdsInr, 'INR')) : '₹0'}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-500 dark:text-[#848E9C]">{r.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : walletTab !== 'history' ? (
        <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
          {/* Mobile Asset Cards */}
          <div className="sm:hidden divide-y divide-slate-200 dark:divide-[#2B3139]">
            {assetRows.map(({ market, balance, usdVal }) => {
              const locked = balance.spotLocked + balance.fundingLocked;
              return (
                <div key={`mw-${market.symbol}`} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <CoinIcon symbol={market.symbol} size={26} />
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-[#EAECEF]">{market.symbol}</div>
                        <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">{market.name}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                        {mask(fiat === 'USD' ? `$${formatPrice(usdVal)}` : formatFiat(usdVal * activeFiatRate, fiat))}
                      </div>
                      {fiat !== 'USD' && (
                        <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">
                          {mask(`$${formatPrice(usdVal)}`)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-500 dark:text-[#848E9C]">
                    <div>
                      <div>Spot</div>
                      <div className="text-slate-900 dark:text-[#EAECEF] font-medium">{mask(formatCrypto(balance.spot, market.symbol))}</div>
                    </div>
                    <div>
                      <div>Funding</div>
                      <div className="text-slate-900 dark:text-[#EAECEF] font-medium">{mask(formatCrypto(balance.funding, market.symbol))}</div>
                    </div>
                    <div className="text-right">
                      <div>Locked</div>
                      <div className="text-slate-700 dark:text-[#EAECEF]">{mask(formatCrypto(locked, market.symbol))}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferAsset(market.symbol);
                        setTransferOpen(true);
                      }}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpotPair(market.symbol === 'USDT' || market.symbol === 'USDC' ? 'BTC/USDT' : `${market.symbol}/USDT`);
                        setActiveTab('spot');
                      }}
                      className="px-3 py-1.5 rounded bg-[#F0B90B]/15 text-[#F0B90B] font-semibold cursor-pointer"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C]">
                  <th className="py-3.5 px-5">Coin</th>
                  {(walletTab === 'overview' || walletTab === 'spot') && (
                    <th className="py-3.5 px-4 text-right">Spot Available</th>
                  )}
                  {(walletTab === 'overview' || walletTab === 'funding') && (
                    <th className="py-3.5 px-4 text-right">Funding (P2P)</th>
                  )}
                  <th className="py-3.5 px-4 text-right">In Orders / Escrow</th>
                  <th className="py-3.5 px-4 text-right">{fiat} Value</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139] text-sm">
                {assetRows.map(({ market, balance, usdVal }) => {
                  const locked = balance.spotLocked + balance.fundingLocked;
                  return (
                    <tr key={market.symbol} className="hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <CoinIcon symbol={market.symbol} size={26} />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-[#EAECEF]">{market.symbol}</div>
                            <div className="text-xs text-slate-500 dark:text-[#848E9C]">{market.name}</div>
                          </div>
                        </div>
                      </td>
                      {(walletTab === 'overview' || walletTab === 'spot') && (
                        <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">
                          {mask(formatCrypto(balance.spot, market.symbol))}
                        </td>
                      )}
                      {(walletTab === 'overview' || walletTab === 'funding') && (
                        <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">
                          {mask(formatCrypto(balance.funding, market.symbol))}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 dark:text-[#848E9C]">
                        {mask(formatCrypto(locked, market.symbol))}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-[#EAECEF]">
                          {mask(
                            fiat === 'USD'
                              ? `$${formatPrice(usdVal)}`
                              : formatFiat(usdVal * activeFiatRate, fiat)
                          )}
                        </div>
                        {fiat !== 'USD' && (
                          <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">
                            {mask(`$${formatPrice(usdVal)}`)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setTransferAsset(market.symbol);
                            setTransferOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                        >
                          Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpotPair(market.symbol === 'USDT' || market.symbol === 'USDC' ? 'BTC/USDT' : `${market.symbol}/USDT`);
                            setActiveTab('spot');
                          }}
                          className="px-2.5 py-1.5 rounded text-[#F0B90B] font-semibold hover:bg-[#F0B90B]/10 cursor-pointer"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                  <th className="py-3.5 px-5">Time</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Asset & Amount</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3.5 px-5 text-slate-500 dark:text-[#848E9C]">{formatTimeAgo(tx.timestamp)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-[#EAECEF]">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                      {formatCrypto(tx.amount, tx.asset)} {tx.asset}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#848E9C]">{tx.details}</td>
                    <td className="py-3.5 px-5 text-right font-semibold text-[#0ECB81]">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Modal (Spot <-> Funding P2P) */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2B3139]">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                Internal Wallet Transfer
              </h2>
              <button
                type="button"
                onClick={() => setTransferOpen(false)}
                className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded bg-slate-100 dark:bg-[#0B0E11]">
                <button
                  type="button"
                  onClick={() => setTransferDir('SPOT_TO_FUNDING')}
                  className={`py-2 rounded text-xs font-semibold cursor-pointer ${
                    transferDir === 'SPOT_TO_FUNDING'
                      ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                      : 'text-slate-500 dark:text-[#848E9C]'
                  }`}
                >
                  Spot → Funding (P2P)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDir('FUNDING_TO_SPOT')}
                  className={`py-2 rounded text-xs font-semibold cursor-pointer ${
                    transferDir === 'FUNDING_TO_SPOT'
                      ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                      : 'text-slate-500 dark:text-[#848E9C]'
                  }`}
                >
                  Funding (P2P) → Spot
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Coin</label>
                <select
                  value={transferAsset}
                  onChange={(e) => setTransferAsset(e.target.value as CryptoSymbol)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF]"
                >
                  {markets.map((m) => (
                    <option key={m.symbol} value={m.symbol}>{m.symbol} — {m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C] mb-1">
                  <span>Amount</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTransferAmount(
                        String(
                          transferDir === 'SPOT_TO_FUNDING'
                            ? balances[transferAsset].spot
                            : balances[transferAsset].funding
                        )
                      )
                    }
                    className="font-mono text-[#F0B90B] hover:underline cursor-pointer"
                  >
                    Max{' '}
                    {formatCrypto(
                      transferDir === 'SPOT_TO_FUNDING'
                        ? balances[transferAsset].spot
                        : balances[transferAsset].funding,
                      transferAsset
                    )}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
                  placeholder="0.00"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
              >
                Confirm Instant Transfer (0 Fee)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2B3139]">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                Withdraw from Spot Wallet
              </h2>
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Coin</label>
                <select
                  value={withdrawAsset}
                  onChange={(e) => {
                    setWithdrawAsset(e.target.value as CryptoSymbol);
                    setWithdrawNetIdx(0);
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF]"
                >
                  {markets.map((m) => (
                    <option key={m.symbol} value={m.symbol}>{m.symbol}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Network</label>
                <select
                  value={withdrawNetIdx}
                  onChange={(e) => setWithdrawNetIdx(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF]"
                >
                  {activeWithdrawAsset.networks.map((n, i) => (
                    <option key={n.name} value={i}>{n.name} (Fee: {n.fee} {withdrawAsset})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Destination Address</label>
                <input
                  type="text"
                  required
                  placeholder="Enter wallet address"
                  value={withdrawAddr}
                  onChange={(e) => setWithdrawAddr(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-[#848E9C] mb-1">
                  <span>Amount ({withdrawAsset})</span>
                  <span className="font-mono">Avail: {formatCrypto(balances[withdrawAsset].spot, withdrawAsset)}</span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  min={activeWithdrawNet.minWithdraw}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
              >
                Submit Withdrawal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { CryptoSymbol } from '../types/exchange';
import { CoinIcon } from './CoinIcon';

export const DepositModal: React.FC = () => {
  const { depositModalOpen, setDepositModalOpen, markets, depositFunds } = useExchange();
  const [selectedSymbol, setSelectedSymbol] = useState<CryptoSymbol>('USDT');
  const [networkIdx, setNetworkIdx] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<string>('1000');
  const [copied, setCopied] = useState(false);

  const asset = useMemo(
    () => markets.find((m) => m.symbol === selectedSymbol) ?? markets[0],
    [markets, selectedSymbol]
  );
  const networks = asset.networks;
  const activeNetwork = networks[networkIdx] ?? networks[0];

  const depositAddress = useMemo(() => {
    const seed = `${selectedSymbol}-${activeNetwork.name}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    if (activeNetwork.name.includes('TRC20')) {
      return `TVault${hash.toString(36).toUpperCase()}89xKp4mQ2zW7nR`;
    }
    if (activeNetwork.name.includes('Bitcoin')) {
      return `bc1qvault${hash.toString(36)}p2p94xk38m7n2`;
    }
    if (activeNetwork.name.includes('Solana')) {
      return `VLT${hash.toString(36)}9xM4qP2rT7vW8yB5nK`;
    }
    return `0x71C${hash.toString(16).padStart(8, '0')}92E4b8F301A6dVaultP2P`;
  }, [selectedSymbol, activeNetwork.name]);

  if (!depositModalOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(depositAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleInstantCredit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(creditAmount);
    if (!Number.isFinite(num) || num <= 0) return;
    depositFunds(selectedSymbol, num, activeNetwork.name);
    setDepositModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="deposit-modal-title">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2B3139]">
          <h2 id="deposit-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-[#EAECEF]">
            Deposit Crypto to Spot Wallet
          </h2>
          <button
            type="button"
            onClick={() => setDepositModalOpen(false)}
            className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
            aria-label="Close deposit modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleInstantCredit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1.5">
              1. Select Coin
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['USDT', 'BTC', 'ETH', 'BNB', 'SOL'] as CryptoSymbol[]).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setSelectedSymbol(sym);
                    setNetworkIdx(0);
                    setCreditAmount(sym === 'BTC' ? '0.1' : sym === 'ETH' ? '1' : '1000');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSymbol === sym
                      ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-slate-900 dark:text-[#EAECEF]'
                      : 'border-slate-200 dark:border-[#2B3139] text-slate-600 dark:text-[#848E9C] hover:border-slate-300 dark:hover:border-[#474D57]'
                  }`}
                >
                  <CoinIcon symbol={sym} size={16} />
                  <span>{sym}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1.5">
              2. Select Network
            </label>
            <select
              value={networkIdx}
              onChange={(e) => setNetworkIdx(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
            >
              {networks.map((n, idx) => (
                <option key={n.name} value={idx}>
                  {n.name} — Arrival {n.eta}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
              <span>Deposit Address ({activeNetwork.name})</span>
              <span>Min: {activeNetwork.minWithdraw} {selectedSymbol}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-xs text-slate-900 dark:text-[#EAECEF] break-all">
                {depositAddress}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-700 dark:text-[#EAECEF] hover:bg-slate-100 dark:hover:bg-[#1E2329] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-[#2B3139]">
            <label htmlFor="instant-deposit-amount" className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1.5">
              3. Quick Top-Up Amount ({selectedSymbol})
            </label>
            <div className="flex items-center gap-3">
              <input
                id="instant-deposit-amount"
                type="number"
                step="any"
                min="0.0001"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Credit Spot Wallet
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

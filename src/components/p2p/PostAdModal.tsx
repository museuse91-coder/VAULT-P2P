import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useExchange } from '../../context/ExchangeContext';
import { FIAT_RATES } from '../../data/seedData';
import { CryptoSymbol, FiatCurrency, PaymentMethodType } from '../../types/exchange';

const ALL_PAYMENT_METHODS: PaymentMethodType[] = [
  'Bank Transfer',
  'Wise',
  'Revolut',
  'SEPA Instant',
  'Zelle',
  'UPI',
  'Faster Payments',
  'PayPal',
];

export const PostAdModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { markets, createP2PAd, fiat: defaultFiat } = useExchange();

  const [merchantSide, setMerchantSide] = useState<'SELL' | 'BUY'>('SELL');
  const [asset, setAsset] = useState<CryptoSymbol>('USDT');
  const [fiat, setFiat] = useState<FiatCurrency>(defaultFiat);
  const [price, setPrice] = useState<string>('1.002');
  const [availableAmount, setAvailableAmount] = useState<string>('2500');
  const [minLimit, setMinLimit] = useState<string>('50');
  const [maxLimit, setMaxLimit] = useState<string>('2500');
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethodType[]>(['Wise', 'Bank Transfer']);
  const [terms, setTerms] = useState<string>('Fast verification. Personal verified accounts only.');

  if (!open) return null;

  const toggleMethod = (m: PaymentMethodType) => {
    setSelectedMethods((prev) =>
      prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
    );
  };

  const handleAssetOrFiatChange = (nextAsset: CryptoSymbol, nextFiat: FiatCurrency) => {
    const usdPrice = markets.find((m) => m.symbol === nextAsset)?.price ?? 1;
    const rate = FIAT_RATES[nextFiat].rateFromUsd;
    setPrice((usdPrice * rate).toFixed(nextAsset === 'USDT' || nextAsset === 'USDC' ? 3 : 2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const avail = parseFloat(availableAmount);
    const minL = parseFloat(minLimit);
    const maxL = parseFloat(maxLimit);
    if (!p || !avail || !minL || !maxL || minL > maxL) return;

    createP2PAd({
      merchantSide,
      isOnline: true,
      isUserAd: true,
      asset,
      fiat,
      price: p,
      availableAmount: avail,
      minLimit: minL,
      maxLimit: maxL,
      paymentMethods: selectedMethods,
      paymentWindowMinutes: 15,
      terms,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2B3139]">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-[#EAECEF]">
            Post a P2P Merchant Advertisement
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-md bg-slate-100 dark:bg-[#0B0E11]">
            <button
              type="button"
              onClick={() => setMerchantSide('SELL')}
              className={`py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                merchantSide === 'SELL'
                  ? 'bg-[#0ECB81] text-[#0B0E11]'
                  : 'text-slate-600 dark:text-[#848E9C]'
              }`}
            >
              I want to Sell (Seller Ad)
            </button>
            <button
              type="button"
              onClick={() => setMerchantSide('BUY')}
              className={`py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                merchantSide === 'BUY'
                  ? 'bg-[#F6465D] text-white'
                  : 'text-slate-600 dark:text-[#848E9C]'
              }`}
            >
              I want to Buy (Buyer Ad)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Crypto Asset</label>
              <select
                value={asset}
                onChange={(e) => {
                  const a = e.target.value as CryptoSymbol;
                  setAsset(a);
                  handleAssetOrFiatChange(a, fiat);
                }}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF]"
              >
                {(['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL'] as CryptoSymbol[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Fiat Currency</label>
              <select
                value={fiat}
                onChange={(e) => {
                  const f = e.target.value as FiatCurrency;
                  setFiat(f);
                  handleAssetOrFiatChange(asset, f);
                }}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF]"
              >
                {(Object.keys(FIAT_RATES) as FiatCurrency[]).map((f) => (
                  <option key={f} value={f}>{f} — {FIAT_RATES[f].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Fixed Price ({fiat})</label>
              <input
                type="number"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Total Quantity ({asset})</label>
              <input
                type="number"
                step="any"
                required
                value={availableAmount}
                onChange={(e) => setAvailableAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Min Order ({fiat})</label>
              <input
                type="number"
                step="any"
                required
                value={minLimit}
                onChange={(e) => setMinLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Max Order ({fiat})</label>
              <input
                type="number"
                step="any"
                required
                value={maxLimit}
                onChange={(e) => setMaxLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1.5">Accepted Payment Methods</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PAYMENT_METHODS.map((pm) => {
                const selected = selectedMethods.includes(pm);
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => toggleMethod(pm)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#F0B90B] bg-[#F0B90B]/15 text-slate-900 dark:text-[#EAECEF]'
                        : 'border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]'
                    }`}
                  >
                    {pm}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#848E9C] mb-1">Terms & Auto-Reply</label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-sm font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
            >
              Publish P2P Ad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

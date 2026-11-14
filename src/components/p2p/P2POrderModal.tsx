import React, { useMemo, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useExchange } from '../../context/ExchangeContext';
import { P2POffer, P2POrder, PaymentMethodType } from '../../types/exchange';
import { formatCrypto, formatFiat } from '../../utils/format';
import { CoinIcon } from '../CoinIcon';

interface P2POrderModalProps {
  offer: P2POffer | null;
  onClose: () => void;
  onOrderCreated: (order: P2POrder) => void;
}

export const P2POrderModal: React.FC<P2POrderModalProps> = ({ offer, onClose, onOrderCreated }) => {
  const { balances, createP2POrder, setActiveTab } = useExchange();
  const [fiatInput, setFiatInput] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType | null>(null);

  const userSide = offer?.merchantSide === 'SELL' ? 'BUY' : 'SELL';

  const parsedFiat = useMemo(() => {
    const n = parseFloat(fiatInput);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [fiatInput]);

  if (!offer) return null;

  const activePayment = selectedPayment ?? offer.paymentMethods[0];
  const cryptoReceive = offer.price > 0 ? parsedFiat / offer.price : 0;
  const maxByLiquidity = offer.availableAmount * offer.price;
  const fundingBal = balances[offer.asset]?.funding ?? 0;
  const maxByUserBalance = userSide === 'SELL' ? fundingBal * offer.price : Infinity;
  const effectiveMax = Math.min(offer.maxLimit, maxByLiquidity, maxByUserBalance);

  const handleMax = () => {
    const capped = Math.floor(effectiveMax * 100) / 100;
    if (capped > 0) setFiatInput(String(capped));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createP2POrder({
      offer,
      fiatAmount: parsedFiat,
      paymentMethod: activePayment,
    });
    if (created) {
      onClose();
      onOrderCreated(created);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#2B3139] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CoinIcon symbol={offer.asset} size={24} />
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-[#EAECEF] truncate">
              {userSide === 'BUY' ? `Buy ${offer.asset} from Seller` : `Sell ${offer.asset} to Buyer`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-[#2B3139]">
          {/* Left: Merchant Terms */}
          <div className="md:col-span-5 p-4 sm:p-6 space-y-4 bg-slate-50/70 dark:bg-[#14171C]">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                <span>{offer.merchantName}</span>
                {offer.isVerified && <ShieldCheck className="w-4 h-4 text-[#F0B90B]" />}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
                {offer.completedOrders.toLocaleString('en-IN')} trades · {(offer.rating ?? 4.9).toFixed(1)} ★ ({offer.positiveRate ?? offer.completionRate}% positive) · {offer.avgReleaseMinutes}m release
              </p>
              {offer.location && (
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#848E9C]">{offer.location}</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#2B3139] text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#848E9C]">Order Price</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                  {formatFiat(offer.price, offer.fiat)} / {offer.asset}
                </span>
              </div>
              {offer.quoteBuyPrice && offer.quoteSellPrice && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#848E9C]">Desk Buy / Sell</span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-[#EAECEF] tabular-nums">
                    {formatFiat(offer.quoteBuyPrice, offer.fiat)} / {formatFiat(offer.quoteSellPrice, offer.fiat)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#848E9C]">Available</span>
                <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                  {formatCrypto(offer.availableAmount, offer.asset)} {offer.asset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#848E9C]">Limits</span>
                <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                  {formatFiat(offer.minLimit, offer.fiat)} – {formatFiat(offer.maxLimit, offer.fiat)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#848E9C]">Payment Window</span>
                <span className="font-mono text-slate-900 dark:text-[#EAECEF]">{offer.paymentWindowMinutes} min</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-[#2B3139]">
              <p className="text-xs font-medium text-slate-700 dark:text-[#EAECEF] mb-1">Merchant Terms</p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">{offer.terms}</p>
            </div>
          </div>

          {/* Right: Order Entry */}
          <form onSubmit={handleSubmit} className="md:col-span-7 p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="p2p-fiat-input" className="font-medium text-slate-600 dark:text-[#848E9C]">
                  {userSide === 'BUY' ? `I want to pay (${offer.fiat})` : `I will receive (${offer.fiat})`}
                </label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="font-medium text-[#F0B90B] hover:underline cursor-pointer"
                >
                  Max {formatFiat(Math.max(0, effectiveMax), offer.fiat)}
                </button>
              </div>
              <div className="relative">
                <input
                  id="p2p-fiat-input"
                  type="number"
                  step="any"
                  required
                  placeholder={`${offer.minLimit} – ${offer.maxLimit}`}
                  value={fiatInput}
                  onChange={(e) => setFiatInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-16 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 dark:text-[#848E9C]">
                  {offer.fiat}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-600 dark:text-[#848E9C]">
                  {userSide === 'BUY' ? `I will receive (${offer.asset})` : `I will sell (${offer.asset})`}
                </span>
                {userSide === 'SELL' && (
                  <span className="font-mono text-slate-500 dark:text-[#848E9C]">
                    Funding Bal: {formatCrypto(fundingBal, offer.asset)} {offer.asset}
                  </span>
                )}
              </div>
              <div className="px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-100/70 dark:bg-[#0B0E11]/60 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                  {cryptoReceive > 0 ? formatCrypto(cryptoReceive, offer.asset) : '0.00'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-[#848E9C]">{offer.asset}</span>
              </div>
              {userSide === 'SELL' && cryptoReceive > fundingBal && (
                <p className="mt-1.5 text-xs text-[#F6465D]">
                  Insufficient Funding balance.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab('wallet');
                    }}
                    className="underline font-medium cursor-pointer"
                  >
                    Transfer from Spot Wallet
                  </button>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {offer.paymentMethods.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setSelectedPayment(pm)}
                    className={`px-3 py-2 rounded-md border text-xs font-medium text-left transition-colors cursor-pointer ${
                      activePayment === pm
                        ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-slate-900 dark:text-[#EAECEF]'
                        : 'border-slate-200 dark:border-[#2B3139] text-slate-600 dark:text-[#848E9C]'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] text-sm font-medium text-slate-700 dark:text-[#EAECEF] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={parsedFiat < offer.minLimit || parsedFiat > offer.maxLimit}
                className={`px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  userSide === 'BUY' ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]' : 'bg-[#F6465D] hover:bg-[#DF3B51]'
                }`}
              >
                {userSide === 'BUY' ? `Buy ${offer.asset} (0 Fee)` : `Sell ${offer.asset} (0 Fee)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

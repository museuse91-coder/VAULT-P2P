import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { EARN_PRODUCTS } from '../data/seedData';
import { EarnProduct } from '../types/exchange';
import { formatCrypto, formatPrice } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';

export const EarnView: React.FC = () => {
  const { balances, markets, earnPositions, subscribeEarn, redeemEarn } = useExchange();
  const [filterType, setFilterType] = useState<'ALL' | 'FLEXIBLE' | 'LOCKED'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<EarnProduct | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');

  const filteredProducts = useMemo(() => {
    if (filterType === 'ALL') return EARN_PRODUCTS;
    return EARN_PRODUCTS.filter((p) => p.type === filterType);
  }, [filterType]);

  const activePositions = useMemo(() => earnPositions.filter((p) => p.status === 'ACTIVE'), [earnPositions]);

  const totalStakedUsd = useMemo(() => {
    const priceMap = new Map(markets.map((m) => [m.symbol, m.price]));
    return activePositions.reduce((acc, pos) => acc + (pos.principal + pos.accruedYield) * (priceMap.get(pos.asset) ?? 0), 0);
  }, [activePositions, markets]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const amt = parseFloat(stakeAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (subscribeEarn(selectedProduct.id, amt)) {
      setSelectedProduct(null);
      setStakeAmount('');
    }
  };

  const estDailyYield = useMemo(() => {
    if (!selectedProduct) return 0;
    const amt = parseFloat(stakeAmount) || 0;
    return (amt * (selectedProduct.apr / 100)) / 365;
  }, [selectedProduct, stakeAmount]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#2B3139]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF]">
            Simple Earn Vaults
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#848E9C]">
            Earn daily yield on idle Spot assets with Flexible or Locked staking terms.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-500 dark:text-[#848E9C]">Total Active Earn Value</div>
          <div className="font-mono text-xl font-bold text-[#0ECB81] mt-0.5">
            ${formatPrice(totalStakedUsd)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139] w-fit">
        {(['ALL', 'FLEXIBLE', 'LOCKED'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              filterType === t
                ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                : 'text-slate-600 dark:text-[#848E9C]'
            }`}
          >
            {t === 'ALL' ? 'All Products' : t === 'FLEXIBLE' ? 'Flexible' : 'Locked Terms'}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C]">
                <th className="py-3.5 px-5">Asset</th>
                <th className="py-3.5 px-4">APR</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4 text-right">Min Subscription</th>
                <th className="py-3.5 px-4 text-right">Spot Available</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139] text-sm">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <CoinIcon symbol={prod.asset} size={26} />
                      <span className="font-semibold text-slate-900 dark:text-[#EAECEF]">{prod.asset}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono text-base font-bold text-[#0ECB81]">
                    {prod.apr.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-700 dark:text-[#EAECEF]">
                    {prod.type === 'FLEXIBLE' ? 'Flexible (Redeem Anytime)' : `${prod.durationDays} Days Locked`}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-xs text-slate-500 dark:text-[#848E9C]">
                    {prod.minAmount} {prod.asset}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-xs text-slate-900 dark:text-[#EAECEF]">
                    {formatCrypto(balances[prod.asset]?.spot ?? 0, prod.asset)} {prod.asset}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setStakeAmount(String(prod.minAmount * 5));
                      }}
                      className="px-4 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#2B3139] font-display text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
          Active Earn Positions ({activePositions.length})
        </div>
        {activePositions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-[#848E9C]">
            No active staking positions. Subscribe to any vault above to start accruing yield.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                  <th className="py-3 px-5">Vault</th>
                  <th className="py-3 px-4">APR</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Accrued Yield</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                {activePositions.map((pos) => (
                  <tr key={pos.id}>
                    <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-[#EAECEF]">
                      {pos.asset} · {pos.type === 'FLEXIBLE' ? 'Flexible' : `${pos.durationDays}D Locked`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#0ECB81] font-semibold">{pos.apr.toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-[#EAECEF]">
                      {formatCrypto(pos.principal, pos.asset)} {pos.asset}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#0ECB81]">
                      +{pos.accruedYield.toFixed(4)} {pos.asset}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => redeemEarn(pos.id)}
                        className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
                      >
                        Redeem to Spot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2B3139]">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF]">
                Subscribe {selectedProduct.asset} ({selectedProduct.apr}% APR)
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubscribe} className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
                <span>Spot Available</span>
                <button
                  type="button"
                  onClick={() => setStakeAmount(String(balances[selectedProduct.asset]?.spot ?? 0))}
                  className="font-mono text-[#F0B90B] hover:underline cursor-pointer"
                >
                  Max {formatCrypto(balances[selectedProduct.asset]?.spot ?? 0, selectedProduct.asset)} {selectedProduct.asset}
                </button>
              </div>
              <input
                type="number"
                step="any"
                required
                min={selectedProduct.minAmount}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-sm text-slate-900 dark:text-[#EAECEF]"
              />
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#848E9C]">
                <span>Est. Daily Yield</span>
                <span className="font-mono text-[#0ECB81]">+{estDailyYield.toFixed(6)} {selectedProduct.asset}/day</span>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold cursor-pointer"
                >
                  Confirm Stake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

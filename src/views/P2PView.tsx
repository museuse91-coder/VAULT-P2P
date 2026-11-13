import React, { useMemo, useState } from 'react';
import { Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { FIAT_RATES } from '../data/seedData';
import { CryptoSymbol, FiatCurrency, P2POffer, P2POrder, PaymentMethodType } from '../types/exchange';
import { formatCrypto, formatFiat, formatTimeAgo } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';
import { P2POrderModal } from '../components/p2p/P2POrderModal';
import { P2PTradeRoomModal } from '../components/p2p/P2PTradeRoomModal';
import { PostAdModal } from '../components/p2p/PostAdModal';

const P2P_ASSETS: CryptoSymbol[] = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'USDC'];
const P2P_PAYMENTS: ('ALL' | PaymentMethodType)[] = [
  'ALL',
  'Bank Transfer',
  'Wise',
  'Revolut',
  'SEPA Instant',
  'Zelle',
  'UPI',
  'Faster Payments',
  'PayPal',
];

export const P2PView: React.FC = () => {
  const {
    p2pOffers,
    p2pOrders,
    fiat,
    setFiat,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    toggleP2PAdStatus,
    deleteP2PAd,
  } = useExchange();

  const [subTab, setSubTab] = useState<'marketplace' | 'orders' | 'my-ads' | 'payments'>('marketplace');
  const [userSide, setUserSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedAsset, setSelectedAsset] = useState<CryptoSymbol>('USDT');
  const [amountFilter, setAmountFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentMethodType>('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price' | 'orders' | 'completion'>('price');

  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [postAdOpen, setPostAdOpen] = useState(false);

  // Payment method creation state
  const [newPmType, setNewPmType] = useState<PaymentMethodType>('Wise');
  const [newPmName, setNewPmName] = useState('Alex Mercer');
  const [newPmNumber, setNewPmNumber] = useState('');
  const [newPmBank, setNewPmBank] = useState('');

  const activeOrdersCount = useMemo(
    () => p2pOrders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'PAID_AWAITING_RELEASE' || o.status === 'APPEAL').length,
    [p2pOrders]
  );

  // When userSide === 'BUY', show merchantSide === 'SELL' (Sellers)
  const targetMerchantSide = userSide === 'BUY' ? 'SELL' : 'BUY';

  const filteredOffers = useMemo(() => {
    const amt = parseFloat(amountFilter);
    const list = p2pOffers.filter((offer) => {
      if (offer.merchantSide !== targetMerchantSide) return false;
      if (offer.asset !== selectedAsset) return false;
      if (offer.fiat !== fiat) return false;
      if (offer.availableAmount <= 0) return false;
      if (verifiedOnly && !offer.isVerified) return false;
      if (paymentFilter !== 'ALL' && !offer.paymentMethods.includes(paymentFilter)) return false;
      if (Number.isFinite(amt) && amt > 0) {
        if (amt < offer.minLimit || amt > offer.maxLimit) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'orders') return b.completedOrders - a.completedOrders;
      if (sortBy === 'completion') return b.completionRate - a.completionRate;
      return userSide === 'BUY' ? a.price - b.price : b.price - a.price;
    });
  }, [p2pOffers, targetMerchantSide, selectedAsset, fiat, verifiedOnly, paymentFilter, amountFilter, sortBy, userSide]);

  const userAds = useMemo(() => p2pOffers.filter((o) => o.isUserAd), [p2pOffers]);

  const handleAddPm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmNumber.trim() || !newPmBank.trim()) return;
    addPaymentMethod({
      type: newPmType,
      accountName: newPmName.trim() || 'Alex Mercer',
      accountNumber: newPmNumber.trim(),
      bankOrProvider: newPmBank.trim(),
    });
    setNewPmNumber('');
    setNewPmBank('');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#2B3139]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF]">
            Vault P2P Marketplace
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#848E9C]">
            Trade directly with verified buyers and sellers at zero platform fee, protected by Vault Escrow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139]">
            {(
              [
                { id: 'marketplace', label: 'P2P Market' },
                { id: 'orders', label: activeOrdersCount > 0 ? `Orders (${activeOrdersCount})` : `Orders (${p2pOrders.length})` },
                { id: 'my-ads', label: `My Ads (${userAds.length})` },
                { id: 'payments', label: 'Payment Methods' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === t.id
                    ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF] shadow-xs'
                    : 'text-slate-600 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPostAdOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span>Post Ad</span>
          </button>
        </div>
      </div>

      {subTab === 'marketplace' && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Buy / Sell Segmented Switch */}
              <div className="inline-flex p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139]">
                <button
                  type="button"
                  onClick={() => setUserSide('BUY')}
                  className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    userSide === 'BUY'
                      ? 'bg-[#0ECB81] text-[#0B0E11]'
                      : 'text-slate-600 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  Buy Crypto
                </button>
                <button
                  type="button"
                  onClick={() => setUserSide('SELL')}
                  className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    userSide === 'SELL'
                      ? 'bg-[#F6465D] text-white'
                      : 'text-slate-600 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  Sell Crypto
                </button>
              </div>

              {/* Crypto Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {P2P_ASSETS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setSelectedAsset(sym)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedAsset === sym
                        ? 'bg-slate-900 text-white dark:bg-[#2B3139] dark:text-[#F0B90B]'
                        : 'text-slate-600 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#181A20]'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount, Fiat, Payment, Verified Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder={`Amount (${fiat})`}
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-36 pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] font-mono text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <select
                aria-label="Fiat currency"
                value={fiat}
                onChange={(e) => setFiat(e.target.value as FiatCurrency)}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                {(Object.keys(FIAT_RATES) as FiatCurrency[]).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <select
                aria-label="Payment method filter"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as 'ALL' | PaymentMethodType)}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                {P2P_PAYMENTS.map((pm) => (
                  <option key={pm} value={pm}>{pm === 'ALL' ? 'All Payment Methods' : pm}</option>
                ))}
              </select>

              <select
                aria-label="Sort offers"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'orders' | 'completion')}
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                <option value="price">Best Price</option>
                <option value="orders">Most Orders</option>
                <option value="completion">Highest Completion</option>
              </select>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-700 dark:text-[#EAECEF] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="accent-[#F0B90B]"
                />
                <span>Verified Only</span>
              </label>
            </div>
          </div>

          {/* P2P Offers Table */}
          <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C]">
                    <th className="py-3.5 px-5">{userSide === 'BUY' ? 'Seller' : 'Buyer'}</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Available & Limits</th>
                    <th className="py-3.5 px-4">Payment Methods</th>
                    <th className="py-3.5 px-5 text-right">Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 px-6 text-center space-y-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-[#EAECEF]">
                          No {userSide === 'BUY' ? 'sellers' : 'buyers'} match your current {selectedAsset}/{fiat} filters.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#848E9C]">
                          Try switching fiat currency, clearing the amount filter, or posting your own P2P Ad.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAmountFilter('');
                              setPaymentFilter('ALL');
                              setVerifiedOnly(false);
                            }}
                            className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] hover:border-[#F0B90B] cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer) => (
                      <tr
                        key={offer.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#1E2329]/70 transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-[#EAECEF]">
                              {offer.merchantName}
                            </span>
                            {offer.isVerified && <ShieldCheck className="w-4 h-4 text-[#F0B90B] shrink-0" />}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
                            {offer.completedOrders.toLocaleString()} orders · {offer.completionRate}% completion · {offer.isOnline ? 'Online' : 'Away'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-mono text-lg font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">
                            {formatFiat(offer.price, offer.fiat)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">
                            per {offer.asset}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-[#848E9C] w-16">Available</span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                              {formatCrypto(offer.availableAmount, offer.asset)} {offer.asset}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 dark:text-[#848E9C] w-16">Limits</span>
                            <span className="font-mono text-slate-700 dark:text-[#EAECEF]">
                              {formatFiat(offer.minLimit, offer.fiat)} – {formatFiat(offer.maxLimit, offer.fiat)}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-700 dark:text-[#EAECEF]">
                          {offer.paymentMethods.join(' · ')}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOffer(offer)}
                            className={`px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                              userSide === 'BUY'
                                ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]'
                                : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                            }`}
                          >
                            {userSide === 'BUY' ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'orders' && (
        <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
          {p2pOrders.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">No P2P escrow orders yet</p>
              <p className="text-xs text-slate-500 dark:text-[#848E9C]">
                Choose a buyer or seller in the P2P Market to open a protected escrow trade room.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('marketplace')}
                className="mt-2 px-4 py-2 rounded-md bg-[#F0B90B] text-[#0B0E11] text-xs font-semibold cursor-pointer"
              >
                Browse P2P Market
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-500 dark:text-[#848E9C]">
                    <th className="py-3.5 px-5">Order ID & Side</th>
                    <th className="py-3.5 px-4">Counterparty</th>
                    <th className="py-3.5 px-4">Crypto Amount</th>
                    <th className="py-3.5 px-4">Fiat Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139] text-xs">
                  {p2pOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-[#1E2329]/70">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">{ord.id}</div>
                        <div className={`font-semibold mt-0.5 ${ord.userSide === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {ord.userSide} {ord.asset} · {formatTimeAgo(ord.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 dark:text-[#EAECEF]">
                        {ord.counterpartyName}
                        <div className="text-slate-500 dark:text-[#848E9C]">{ord.paymentMethod}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                        {formatCrypto(ord.cryptoAmount, ord.asset)} {ord.asset}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-[#EAECEF]">
                        {formatFiat(ord.fiatAmount, ord.fiat)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span
                          className={
                            ord.status === 'COMPLETED'
                              ? 'text-[#0ECB81]'
                              : ord.status === 'CANCELLED'
                                ? 'text-slate-400'
                                : ord.status === 'APPEAL'
                                  ? 'text-[#F6465D]'
                                  : 'text-[#F0B90B]'
                          }
                        >
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveOrderId(ord.id)}
                          className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
                        >
                          Open Trade Room
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'my-ads' && (
        <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] overflow-hidden">
          {userAds.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">You haven't published any P2P ads</p>
              <p className="text-xs text-slate-500 dark:text-[#848E9C]">
                List your own Buy or Sell offer with custom pricing and payment methods.
              </p>
              <button
                type="button"
                onClick={() => setPostAdOpen(true)}
                className="mt-2 px-4 py-2 rounded-md bg-[#F0B90B] text-[#0B0E11] text-xs font-semibold cursor-pointer"
              >
                Post Your First Ad
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2B3139] text-slate-500 dark:text-[#848E9C]">
                    <th className="py-3.5 px-5">Type & Asset</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Available</th>
                    <th className="py-3.5 px-4">Limits</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2B3139]">
                  {userAds.map((ad) => (
                    <tr key={ad.id}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <CoinIcon symbol={ad.asset} size={20} />
                          <span className={`font-semibold ${ad.merchantSide === 'SELL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {ad.merchantSide} {ad.asset}/{ad.fiat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-[#EAECEF]">
                        {formatFiat(ad.price, ad.fiat)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-[#EAECEF]">
                        {formatCrypto(ad.availableAmount, ad.asset)} {ad.asset}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#848E9C]">
                        {formatFiat(ad.minLimit, ad.fiat)} – {formatFiat(ad.maxLimit, ad.fiat)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={ad.isOnline ? 'text-[#0ECB81]' : 'text-slate-400'}>
                          {ad.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleP2PAdStatus(ad.id)}
                          className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                        >
                          {ad.isOnline ? 'Pause' : 'Go Online'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteP2PAd(ad.id)}
                          className="p-1.5 rounded text-[#F6465D] hover:bg-[#F6465D]/10 cursor-pointer"
                          aria-label="Delete ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] divide-y divide-slate-200 dark:divide-[#2B3139]">
            <div className="px-5 py-4 font-display text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
              Saved P2P Receiving Methods
            </div>
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">{pm.type}</div>
                  <div className="text-xs text-slate-500 dark:text-[#848E9C] mt-0.5">
                    {pm.accountName} · <span className="font-mono">{pm.accountNumber}</span> · {pm.bankOrProvider}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePaymentMethod(pm.id)}
                  className="p-2 rounded text-slate-400 hover:text-[#F6465D] cursor-pointer"
                  aria-label="Remove payment method"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddPm}
            className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-5 space-y-4 self-start"
          >
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
              Add Payment Method
            </h3>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Method Type</label>
              <select
                value={newPmType}
                onChange={(e) => setNewPmType(e.target.value as PaymentMethodType)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
              >
                {P2P_PAYMENTS.filter((x) => x !== 'ALL').map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Account Holder Name</label>
              <input
                type="text"
                required
                value={newPmName}
                onChange={(e) => setNewPmName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Account Number / Handle / IBAN</label>
              <input
                type="text"
                required
                placeholder="e.g. @handle or IBAN"
                value={newPmNumber}
                onChange={(e) => setNewPmNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Bank or Provider</label>
              <input
                type="text"
                required
                placeholder="e.g. Revolut UK / Chase"
                value={newPmBank}
                onChange={(e) => setNewPmBank(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-xs font-semibold cursor-pointer"
            >
              Save Payment Method
            </button>
          </form>
        </div>
      )}

      {/* Modals */}
      <P2POrderModal
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onOrderCreated={(ord: P2POrder) => {
          setSubTab('orders');
          setActiveOrderId(ord.id);
        }}
      />
      <P2PTradeRoomModal orderId={activeOrderId} onClose={() => setActiveOrderId(null)} />
      <PostAdModal open={postAdOpen} onClose={() => setPostAdOpen(false)} />
    </div>
  );
};

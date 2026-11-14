import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Gem,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { FIAT_RATES } from '../data/seedData';
import { CryptoSymbol, FiatCurrency, P2POffer, P2POrder, PaymentMethodType } from '../types/exchange';
import { formatCrypto, formatFiat, formatOrderLimit, formatTimeAgo } from '../utils/format';
import { CoinIcon } from '../components/CoinIcon';
import { P2POrderModal } from '../components/p2p/P2POrderModal';
import { P2PTradeRoomModal } from '../components/p2p/P2PTradeRoomModal';
import { PostAdModal } from '../components/p2p/PostAdModal';

const P2P_ASSETS: CryptoSymbol[] = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'USDC'];
const P2P_PAYMENTS: ('ALL' | PaymentMethodType)[] = [
  'ALL',
  'UPI',
  'UPI QR Scan',
  'UPI Lite',
  'Google Pay (GPay)',
  'PhonePe',
  'Paytm UPI',
  'BHIM UPI',
  'CRED Pay',
  'Amazon Pay UPI',
  'WhatsApp Pay (UPI)',
  'MobiKwik UPI',
  'Freecharge UPI',
  'SBI YONO Pay',
  'HDFC PayZapp',
  'ICICI iMobile Pay',
  'Kotak 811',
  'Airtel Payments Bank',
  'IMPS',
  'NEFT / RTGS',
  'Digital eRupee',
  'Paytm Wallet',
  'Cash Deposit (CDM)',
  'Bank Transfer',
  'Wise',
  'Revolut',
  'SEPA Instant',
  'Zelle',
  'Faster Payments',
  'PayPal',
];

const QUICK_PAYMENT_RAILS: ('ALL' | PaymentMethodType)[] = [
  'ALL',
  'UPI',
  'Paytm UPI',
  'PhonePe',
  'Google Pay (GPay)',
  'Paytm Wallet',
  'UPI QR Scan',
  'UPI Lite',
  'BHIM UPI',
  'CRED Pay',
  'Amazon Pay UPI',
  'WhatsApp Pay (UPI)',
  'MobiKwik UPI',
  'Freecharge UPI',
  'SBI YONO Pay',
  'HDFC PayZapp',
  'ICICI iMobile Pay',
  'Kotak 811',
  'Airtel Payments Bank',
  'IMPS',
  'NEFT / RTGS',
  'Digital eRupee',
  'Cash Deposit (CDM)',
  'Bank Transfer',
  'Wise',
  'Zelle',
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
    randomizeP2PRates,
    currentUser,
  } = useExchange();

  const [subTab, setSubTab] = useState<'marketplace' | 'profiles' | 'orders' | 'my-ads' | 'payments'>('marketplace');
  const [userSide, setUserSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedAsset, setSelectedAsset] = useState<CryptoSymbol>('USDT');
  const [amountFilter, setAmountFilter] = useState<string>('');
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentMethodType>('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price' | 'orders' | 'completion'>('price');
  const [page, setPage] = useState<number>(1);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [beginnerOnly, setBeginnerOnly] = useState<boolean>(false);
  const [profileRoleFilter, setProfileRoleFilter] = useState<'ALL' | 'SELL' | 'BUY'>('ALL');
  const [profilePage, setProfilePage] = useState<number>(1);
  const [showAllProfiles, setShowAllProfiles] = useState<boolean>(false);

  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [profileOffer, setProfileOffer] = useState<P2POffer | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [postAdOpen, setPostAdOpen] = useState(false);

  // Payment method creation state
  const [newPmType, setNewPmType] = useState<PaymentMethodType>('UPI');
  const [newPmName, setNewPmName] = useState(currentUser?.fullName ?? 'Alex Mercer');
  const [newPmNumber, setNewPmNumber] = useState('');
  const [newPmBank, setNewPmBank] = useState('');
  const [newPmIfsc, setNewPmIfsc] = useState('');

  const activeOrdersCount = useMemo(
    () => p2pOrders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'PAID_AWAITING_RELEASE' || o.status === 'APPEAL').length,
    [p2pOrders]
  );

  // When userSide === 'BUY', show merchantSide === 'SELL' (Sellers)
  const targetMerchantSide = userSide === 'BUY' ? 'SELL' : 'BUY';

  const filteredOffers = useMemo(() => {
    const amt = parseFloat(amountFilter);
    const q = merchantSearch.trim().toLowerCase();
    const list = p2pOffers.filter((offer) => {
      if (offer.merchantSide !== targetMerchantSide) return false;
      if (offer.asset !== selectedAsset) return false;
      if (offer.fiat !== fiat) return false;
      if (offer.availableAmount <= 0) return false;
      if (verifiedOnly && !offer.isVerified) return false;
      if (beginnerOnly && (!offer.isVerified || offer.completionRate < 99 || offer.minLimit > 1000)) return false;
      if (paymentFilter !== 'ALL' && !offer.paymentMethods.includes(paymentFilter)) return false;
      if (Number.isFinite(amt) && amt > 0) {
        if (amt < offer.minLimit || amt > offer.maxLimit) return false;
      }
      if (q) {
        const hay = `${offer.merchantName} ${offer.location ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'orders') return b.completedOrders - a.completedOrders;
      if (sortBy === 'completion') return b.completionRate - a.completionRate;
      return userSide === 'BUY' ? a.price - b.price : b.price - a.price;
    });
  }, [p2pOffers, targetMerchantSide, selectedAsset, fiat, verifiedOnly, beginnerOnly, paymentFilter, amountFilter, merchantSearch, sortBy, userSide]);

  const { buyAdsCount, sellAdsCount } = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    for (const o of p2pOffers) {
      if (o.asset === selectedAsset && o.fiat === fiat && o.availableAmount > 0) {
        if (o.merchantSide === 'SELL') buyCount += 1;
        else sellCount += 1;
      }
    }
    return { buyAdsCount: buyCount, sellAdsCount: sellCount };
  }, [p2pOffers, selectedAsset, fiat]);

  const PAGE_SIZE = 60;
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayedOffers = useMemo(() => {
    if (showAllRows) return filteredOffers;
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOffers.slice(start, start + PAGE_SIZE);
  }, [filteredOffers, showAllRows, safePage]);

  const userAds = useMemo(() => p2pOffers.filter((o) => o.isUserAd), [p2pOffers]);

  const fiatProfiles = useMemo(
    () => p2pOffers.filter((o) => o.fiat === fiat && o.availableAmount > 0),
    [p2pOffers, fiat]
  );

  const filteredProfiles = useMemo(() => {
    const q = merchantSearch.trim().toLowerCase();
    const list = fiatProfiles.filter((offer) => {
      if (profileRoleFilter !== 'ALL' && offer.merchantSide !== profileRoleFilter) return false;
      if (verifiedOnly && !offer.isVerified) return false;
      if (paymentFilter !== 'ALL' && !offer.paymentMethods.includes(paymentFilter)) return false;
      if (q) {
        const hay = `${offer.merchantName} ${offer.location ?? ''} ${offer.bio ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'completion') return b.completionRate - a.completionRate;
      if (sortBy === 'price') return a.price - b.price;
      return b.completedOrders - a.completedOrders;
    });
  }, [fiatProfiles, profileRoleFilter, verifiedOnly, paymentFilter, merchantSearch, sortBy]);

  const PROFILE_PAGE_SIZE = 60;
  const totalProfilePages = Math.max(1, Math.ceil(filteredProfiles.length / PROFILE_PAGE_SIZE));
  const safeProfilePage = Math.min(profilePage, totalProfilePages);
  const displayedProfiles = useMemo(() => {
    if (showAllProfiles) return filteredProfiles;
    const start = (safeProfilePage - 1) * PROFILE_PAGE_SIZE;
    return filteredProfiles.slice(start, start + PROFILE_PAGE_SIZE);
  }, [filteredProfiles, showAllProfiles, safeProfilePage]);

  const handleAddPm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmNumber.trim() || !newPmBank.trim()) return;
    addPaymentMethod({
      type: newPmType,
      accountName: newPmName.trim() || (currentUser?.fullName ?? 'Alex Mercer'),
      accountNumber: newPmNumber.trim(),
      bankOrProvider: newPmBank.trim(),
      ifscCode: newPmIfsc.trim() ? newPmIfsc.trim().toUpperCase() : undefined,
    });
    setNewPmNumber('');
    setNewPmBank('');
    setNewPmIfsc('');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-200 dark:border-[#2B3139]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF]">
              Vault P2P Marketplace
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-[#848E9C]">
              Trade directly with verified buyers and sellers at zero platform fee, protected by Vault Escrow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPostAdOpen(true)}
            className="sm:hidden inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span>Post Ad</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139] w-full lg:w-auto overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'marketplace', label: 'P2P Market' },
                { id: 'profiles', label: `Profiles (${fiatProfiles.length})` },
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
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span>Post Ad</span>
          </button>
        </div>
      </div>

      {subTab === 'marketplace' && (
        <div className="space-y-3.5">
          {/* Binance-Style Top Control Strip: Buy/Sell Toggle + Filter Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex p-0.5 rounded-lg border border-slate-300 dark:border-[#2B3139] bg-slate-100 dark:bg-[#0B0E11]">
              <button
                type="button"
                onClick={() => {
                  setUserSide('BUY');
                  setPage(1);
                }}
                className={`px-6 sm:px-8 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  userSide === 'BUY'
                    ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                }`}
              >
                Buy <span className="text-[11px] font-mono text-[#0ECB81] ml-0.5">({buyAdsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserSide('SELL');
                  setPage(1);
                }}
                className={`px-6 sm:px-8 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  userSide === 'SELL'
                    ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                }`}
              >
                Sell <span className="text-[11px] font-mono text-[#F6465D] ml-0.5">({sellAdsCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {fiat === 'INR' && (
                <button
                  type="button"
                  onClick={randomizeP2PRates}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-xs font-medium text-slate-700 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer"
                  title="Refresh live Buy & Sell INR rates"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F0B90B]" />
                  <span className="hidden sm:inline">Refresh Rates</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersExpanded((f) => !f)}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                aria-label="Toggle extra filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(verifiedOnly || beginnerOnly || merchantSearch.trim() !== '' || paymentFilter !== 'ALL' || sortBy !== 'price') && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#F0B90B]" />
                )}
              </button>
            </div>
          </div>

          {/* Binance-Style Asset Selector + Transaction Amount & Fiat Input Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#1E2329] border border-slate-200 dark:border-[#2B3139] shrink-0">
                <CoinIcon symbol={selectedAsset} size={20} />
                <select
                  aria-label="Select crypto asset"
                  value={selectedAsset}
                  onChange={(e) => {
                    setSelectedAsset(e.target.value as CryptoSymbol);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#EAECEF] focus:outline-none cursor-pointer pr-1"
                >
                  {P2P_ASSETS.map((sym) => (
                    <option key={sym} value={sym} className="bg-white dark:bg-[#181A20] text-slate-900 dark:text-[#EAECEF]">
                      {sym}
                    </option>
                  ))}
                </select>
              </div>

              {/* Combined Transaction Amount + INR Fiat Box */}
              <div className="flex-1 sm:w-80 flex items-center rounded-lg bg-slate-100 dark:bg-[#1E2329] border border-slate-200 dark:border-[#2B3139] overflow-hidden focus-within:border-[#F0B90B]">
                <input
                  type="number"
                  placeholder="Transaction amount"
                  value={amountFilter}
                  onChange={(e) => {
                    setAmountFilter(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 min-w-0 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#EAECEF] placeholder:text-slate-400 dark:placeholder:text-[#848E9C] focus:outline-none font-mono"
                />
                <div className="flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 border-l border-slate-300 dark:border-[#2B3139] shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#F0B90B] text-[#0B0E11] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {FIAT_RATES[fiat].symbol}
                  </span>
                  <select
                    aria-label="Fiat currency"
                    value={fiat}
                    onChange={(e) => {
                      setFiat(e.target.value as FiatCurrency);
                      setPage(1);
                      setProfilePage(1);
                    }}
                    className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#EAECEF] focus:outline-none cursor-pointer"
                  >
                    {(Object.keys(FIAT_RATES) as FiatCurrency[]).map((f) => (
                      <option key={f} value={f} className="bg-white dark:bg-[#181A20] text-slate-900 dark:text-[#EAECEF]">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Beginner Friendly Chip + Search/Sort on desktop */}
            <div className="flex items-center gap-2 flex-1 justify-between sm:justify-end">
              {userSide === 'BUY' && (
                <button
                  type="button"
                  onClick={() => {
                    setBeginnerOnly((b) => !b);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    beginnerOnly
                      ? 'border-[#F0B90B] bg-[#F0B90B]/15 text-[#F0B90B]'
                      : 'border-slate-300 dark:border-[#363C45] bg-white dark:bg-[#181A20] text-slate-700 dark:text-[#EAECEF] hover:border-[#F0B90B]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-[#F6465D] fill-[#F6465D]" />
                  <span>Beginner Friendly Ads</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search merchant or city..."
                    value={merchantSearch}
                    onChange={(e) => {
                      setMerchantSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-44 pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
                <select
                  aria-label="Sort offers"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'price' | 'orders' | 'completion');
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                >
                  <option value="price">Best Price</option>
                  <option value="orders">Most Orders</option>
                  <option value="completion">Highest Completion</option>
                </select>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-700 dark:text-[#EAECEF] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => {
                      setVerifiedOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="accent-[#F0B90B]"
                  />
                  <span>Verified Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Expandable Extra Filter Drawer (Mobile & Tablet, or when Filter Icon toggled) */}
          {filtersExpanded && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#181A20] grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search merchant or city..."
                  value={merchantSearch}
                  onChange={(e) => {
                    setMerchantSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>
              <select
                aria-label="Payment method filter"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value as 'ALL' | PaymentMethodType);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                {P2P_PAYMENTS.map((pm) => (
                  <option key={pm} value={pm}>{pm === 'ALL' ? 'All Payment Methods' : pm}</option>
                ))}
              </select>
              <select
                aria-label="Sort offers drawer"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'price' | 'orders' | 'completion');
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                <option value="price">Best Price</option>
                <option value="orders">Most Orders</option>
                <option value="completion">Highest Completion</option>
              </select>
              <label className="w-full inline-flex items-center justify-between px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] text-xs text-slate-700 dark:text-[#EAECEF] cursor-pointer select-none">
                <span>Verified Merchants Only</span>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="accent-[#F0B90B]"
                />
              </label>
            </div>
          )}

          {/* Quick UPI & Payment Rail Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {QUICK_PAYMENT_RAILS.map((pm) => {
              const active = paymentFilter === pm;
              return (
                <button
                  key={`qpm-${pm}`}
                  type="button"
                  onClick={() => {
                    setPaymentFilter(pm);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'border-[#F0B90B] bg-[#F0B90B]/15 text-slate-900 dark:text-[#F0B90B] font-semibold'
                      : 'border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-slate-600 dark:text-[#848E9C] hover:border-[#F0B90B]/60 hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  {pm === 'ALL' ? 'All Payment Rails' : pm}
                </button>
              );
            })}
          </div>

          {/* P2P Offers Feed */}
          <div className="space-y-3">
            {filteredOffers.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                <span className="text-slate-500 dark:text-[#848E9C] tabular-nums">
                  Showing <strong className="text-slate-900 dark:text-[#EAECEF]">{displayedOffers.length}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-[#EAECEF]">{filteredOffers.length}</strong>{' '}
                  {userSide === 'BUY' ? 'Buy' : 'Sell'} {selectedAsset}/{fiat} Ads
                </span>
                {filteredOffers.length > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setShowAllRows((s) => !s)}
                    className="text-xs font-semibold text-[#F0B90B] hover:underline cursor-pointer"
                  >
                    {showAllRows ? `Paginate (${PAGE_SIZE}/page)` : `View All ${filteredOffers.length} Ads`}
                  </button>
                )}
              </div>
            )}

            {filteredOffers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] py-14 px-6 text-center space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-[#EAECEF]">
                  No {userSide === 'BUY' ? 'sellers' : 'buyers'} match your current {selectedAsset}/{fiat} filters.
                </p>
                <p className="text-xs text-slate-500 dark:text-[#848E9C]">
                  Try switching fiat currency, clearing the transaction amount, or resetting filters.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmountFilter('');
                      setMerchantSearch('');
                      setPaymentFilter('ALL');
                      setVerifiedOnly(false);
                      setBeginnerOnly(false);
                      setPage(1);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#2B3139] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] hover:border-[#F0B90B] cursor-pointer"
                  >
                    Reset Filters
                  </button>
                  {fiat !== 'INR' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiat('INR');
                        setPage(1);
                        setProfilePage(1);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#F0B90B] hover:bg-[#D9A708] text-xs font-semibold text-[#0B0E11] cursor-pointer"
                    >
                      Switch to INR (₹)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Featured Ad Card (Top Match) */}
                {displayedOffers[0] && (() => {
                  const featured = displayedOffers[0];
                  const initials = featured.merchantName.slice(0, 1).toUpperCase();
                  const positivePct = (featured.positiveRate ?? featured.completionRate).toFixed(2);
                  const completionPct = featured.completionRate.toFixed(2);
                  const fiatSymbol = FIAT_RATES[featured.fiat].symbol;
                  const priceDecimals = featured.price < 10 ? 3 : 2;
                  const formattedPrice = featured.price.toLocaleString('en-IN', {
                    minimumFractionDigits: priceDecimals,
                    maximumFractionDigits: priceDecimals,
                  });
                  const getBarColor = (pm: PaymentMethodType) => {
                    if (pm.includes('IMPS') || pm.includes('NEFT') || pm.includes('Bank') || pm.includes('Cash') || pm.includes('Wise')) {
                      return 'bg-[#F0B90B]';
                    }
                    if (pm.includes('Paytm') || pm.includes('eRupee') || pm.includes('SBI') || pm.includes('HDFC') || pm.includes('ICICI') || pm.includes('Kotak')) {
                      return 'bg-[#3B82F6]';
                    }
                    return 'bg-[#F97316]';
                  };
                  return (
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-slate-900 dark:text-white px-0.5">Featured Ad</div>
                      <div className="rounded-xl border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#1E2329] p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => setProfileOffer(featured)}
                              className="relative w-7 h-7 rounded-full bg-slate-900 text-white dark:bg-[#EAECEF] dark:text-[#0B0E11] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer"
                            >
                              {initials}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-50 dark:ring-[#1E2329] ${
                                  featured.isOnline ? 'bg-[#0ECB81]' : 'bg-slate-400'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileOffer(featured)}
                              className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-[#2B3139] text-sm font-semibold text-slate-900 dark:text-[#EAECEF] hover:text-[#F0B90B] truncate cursor-pointer"
                            >
                              {featured.merchantName}
                            </button>
                            {featured.isVerified && (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <Lock className="w-3.5 h-3.5 text-[#F0B90B]" />
                                <Gem className="w-3.5 h-3.5 text-[#8B5CF6]" />
                              </span>
                            )}
                          </div>
                          {featured.quoteBuyPrice && featured.quoteSellPrice && (
                            <div className="font-mono text-[11px] text-slate-500 dark:text-[#848E9C] tabular-nums">
                              Buy {formatFiat(featured.quoteBuyPrice, featured.fiat)} · Sell {formatFiat(featured.quoteSellPrice, featured.fiat)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
                          <span>{featured.completedOrders.toLocaleString('en-IN')} orders</span>
                          <span>|</span>
                          <span>{completionPct}% completion</span>
                          <span>|</span>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {positivePct}%
                          </span>
                          <span>|</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {featured.paymentWindowMinutes} min
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-baseline gap-1 font-mono tabular-nums">
                              <span className="text-sm font-semibold text-slate-800 dark:text-[#EAECEF]">{fiatSymbol}</span>
                              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formattedPrice}</span>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-[#848E9C] tabular-nums space-y-1">
                              <div>
                                Available:{' '}
                                <span className="font-mono text-slate-900 dark:text-[#EAECEF] font-medium">
                                  {formatCrypto(featured.availableAmount, featured.asset)} {featured.asset}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-16 shrink-0">Order Limit:</span>
                                <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                                  {formatOrderLimit(featured.minLimit, featured.maxLimit, featured.fiat)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-between sm:justify-end gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-[#EAECEF]">
                              {featured.paymentMethods.slice(0, 4).map((pm) => (
                                <span key={pm} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                  <span className={`w-[3px] h-3 rounded-full ${getBarColor(pm)}`} />
                                  <span>{pm}</span>
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedOffer(featured)}
                              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                userSide === 'BUY'
                                  ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-white'
                                  : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                              }`}
                            >
                              {userSide === 'BUY' ? `Buy ${featured.asset}` : `Sell ${featured.asset}`}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Standard P2P Ads List (Mobile & Desktop Binance Card Style) */}
                <div className="rounded-xl border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] divide-y divide-slate-200 dark:divide-[#2B3139] overflow-hidden">
                  {displayedOffers.slice(1).map((offer) => {
                    const initials = offer.merchantName.slice(0, 1).toUpperCase();
                    const positivePct = (offer.positiveRate ?? offer.completionRate).toFixed(2);
                    const completionPct = offer.completionRate.toFixed(2);
                    const fiatSymbol = FIAT_RATES[offer.fiat].symbol;
                    const priceDecimals = offer.price < 10 ? 3 : 2;
                    const formattedPrice = offer.price.toLocaleString('en-IN', {
                      minimumFractionDigits: priceDecimals,
                      maximumFractionDigits: priceDecimals,
                    });
                    const getBarColor = (pm: PaymentMethodType) => {
                      if (pm.includes('IMPS') || pm.includes('NEFT') || pm.includes('Bank') || pm.includes('Cash') || pm.includes('Wise')) {
                        return 'bg-[#F0B90B]';
                      }
                      if (pm.includes('Paytm') || pm.includes('eRupee') || pm.includes('SBI') || pm.includes('HDFC') || pm.includes('ICICI') || pm.includes('Kotak')) {
                        return 'bg-[#3B82F6]';
                      }
                      return 'bg-[#F97316]';
                    };
                    return (
                      <div key={offer.id} className="p-4 sm:px-5 sm:py-4 hover:bg-slate-50/70 dark:hover:bg-[#1E2329]/50 transition-colors space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setProfileOffer(offer)}
                              className="relative w-7 h-7 rounded-full bg-slate-900 text-white dark:bg-[#EAECEF] dark:text-[#0B0E11] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer"
                            >
                              {initials}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#181A20] ${
                                  offer.isOnline ? 'bg-[#0ECB81]' : 'bg-slate-400'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileOffer(offer)}
                              className="font-semibold text-sm text-slate-900 dark:text-[#EAECEF] hover:text-[#F0B90B] truncate cursor-pointer"
                            >
                              {offer.merchantName}
                            </button>
                            {offer.isVerified && (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <Lock className="w-3.5 h-3.5 text-[#F0B90B]" />
                                <Gem className="w-3.5 h-3.5 text-[#8B5CF6]" />
                              </span>
                            )}
                            {offer.location && (
                              <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-[#848E9C]">
                                · {offer.location}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {offer.quoteBuyPrice && offer.quoteSellPrice && (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-[#848E9C] tabular-nums">
                                <span className="text-[#0ECB81]">B {formatFiat(offer.quoteBuyPrice, offer.fiat)}</span>
                                {' · '}
                                <span className="text-[#F6465D]">S {formatFiat(offer.quoteSellPrice, offer.fiat)}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setProfileOffer(offer)}
                              className="text-[11px] font-medium text-slate-500 dark:text-[#848E9C] hover:text-[#F0B90B] underline decoration-dotted cursor-pointer"
                            >
                              Profile
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
                          <span>{offer.completedOrders.toLocaleString('en-IN')} orders</span>
                          <span>|</span>
                          <span>{completionPct}% completion</span>
                          <span>|</span>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {positivePct}%
                          </span>
                          <span>|</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {offer.paymentWindowMinutes} min
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1 font-mono tabular-nums">
                              <span className="text-sm font-semibold text-slate-800 dark:text-[#EAECEF]">{fiatSymbol}</span>
                              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formattedPrice}</span>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-[#848E9C] tabular-nums space-y-0.5">
                              <div>
                                Available:{' '}
                                <span className="font-mono text-slate-900 dark:text-[#EAECEF] font-medium">
                                  {formatCrypto(offer.availableAmount, offer.asset)} {offer.asset}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-16 shrink-0">Order Limit:</span>
                                <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                                  {formatOrderLimit(offer.minLimit, offer.maxLimit, offer.fiat)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-between sm:justify-end gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-[#EAECEF]">
                              {offer.paymentMethods.map((pm) => (
                                <span key={pm} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                  <span className={`w-[3px] h-3 rounded-full ${getBarColor(pm)}`} />
                                  <span>{pm}</span>
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedOffer(offer)}
                              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                userSide === 'BUY'
                                  ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-white'
                                  : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                              }`}
                            >
                              {userSide === 'BUY' ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {filteredOffers.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#848E9C] tabular-nums">
                  Showing <strong className="text-slate-900 dark:text-[#EAECEF]">{displayedOffers.length}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-[#EAECEF]">{filteredOffers.length}</strong> verified{' '}
                  {userSide === 'BUY' ? 'sellers' : 'buyers'} ({selectedAsset}/{fiat})
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {filteredOffers.length > PAGE_SIZE && (
                    <button
                      type="button"
                      onClick={() => setShowAllRows((s) => !s)}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-semibold text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                    >
                      {showAllRows ? `Paginate (${PAGE_SIZE}/page)` : `Show All ${filteredOffers.length}`}
                    </button>
                  )}
                  {!showAllRows && totalPages > 1 && (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] text-slate-700 dark:text-[#EAECEF] disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="font-mono px-2 text-slate-600 dark:text-[#848E9C] tabular-nums">
                        {safePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] text-slate-700 dark:text-[#EAECEF] disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'profiles' && (
        <div className="space-y-4">
          {/* Profiles Filter Strip */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-md bg-slate-100 dark:bg-[#181A20] border border-slate-200 dark:border-[#2B3139] w-full sm:w-auto">
              {(
                [
                  { id: 'ALL', label: `All (${fiatProfiles.length})` },
                  { id: 'SELL', label: `Sellers (${fiatProfiles.filter((p) => p.merchantSide === 'SELL').length})` },
                  { id: 'BUY', label: `Buyers (${fiatProfiles.filter((p) => p.merchantSide === 'BUY').length})` },
                ] as const
              ).map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setProfileRoleFilter(role.id);
                    setProfilePage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer text-center ${
                    profileRoleFilter === role.id
                      ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF] shadow-xs'
                      : 'text-slate-600 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="relative col-span-2 sm:col-span-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search buyer/seller or city..."
                  value={merchantSearch}
                  onChange={(e) => {
                    setMerchantSearch(e.target.value);
                    setProfilePage(1);
                  }}
                  className="w-full sm:w-52 pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <select
                aria-label="Profile payment method filter"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value as 'ALL' | PaymentMethodType);
                  setProfilePage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              >
                {P2P_PAYMENTS.map((pm) => (
                  <option key={pm} value={pm}>{pm === 'ALL' ? 'All Payment Rails' : pm}</option>
                ))}
              </select>

              <label className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] text-xs text-slate-700 dark:text-[#EAECEF] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setProfilePage(1);
                  }}
                  className="accent-[#F0B90B]"
                />
                <span>Verified Only</span>
              </label>

              {fiat === 'INR' && (
                <button
                  type="button"
                  onClick={randomizeP2PRates}
                  className="col-span-2 sm:col-span-1 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] hover:border-[#F0B90B] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F0B90B]" />
                  <span>Refresh Quotes</span>
                </button>
              )}
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] py-12 px-4 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-[#EAECEF]">No merchant profiles match your filter.</p>
              <button
                type="button"
                onClick={() => {
                  setProfileRoleFilter('ALL');
                  setMerchantSearch('');
                  setPaymentFilter('ALL');
                  setVerifiedOnly(false);
                  setProfilePage(1);
                }}
                className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] hover:border-[#F0B90B] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {displayedProfiles.map((offer) => {
                  const initials = offer.merchantName.slice(0, 2).toUpperCase();
                  const ratingVal = offer.rating ?? 4.9;
                  const reviewsTotal = offer.reviewsCount ?? Math.max(45, Math.round(offer.completedOrders * 0.3));
                  const isSeller = offer.merchantSide === 'SELL';
                  return (
                    <div
                      key={`prof-${offer.id}`}
                      className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-4 flex flex-col justify-between gap-3 hover:border-[#F0B90B]/60 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => setProfileOffer(offer)}
                              className="w-10 h-10 rounded-md bg-slate-100 dark:bg-[#2B3139] border border-slate-200 dark:border-[#363C45] flex items-center justify-center font-display text-xs font-bold text-[#F0B90B] shrink-0 cursor-pointer"
                            >
                              {initials}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setProfileOffer(offer)}
                                  className="font-semibold text-sm text-slate-900 dark:text-[#EAECEF] hover:text-[#F0B90B] truncate cursor-pointer text-left"
                                >
                                  {offer.merchantName}
                                </button>
                                {offer.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#F0B90B] shrink-0" />}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-[#848E9C] truncate">
                                {offer.location ?? 'India'} ·{' '}
                                <span className={offer.isOnline ? 'text-[#0ECB81]' : 'text-slate-400'}>
                                  {offer.isOnline ? 'Online' : 'Away'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                              isSeller
                                ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                                : 'bg-[#F6465D]/15 text-[#F6465D]'
                            }`}
                          >
                            {isSeller ? 'Seller' : 'Buyer'}
                          </span>
                        </div>

                        {offer.bio && (
                          <p className="text-xs text-slate-600 dark:text-[#848E9C] line-clamp-2 leading-relaxed">
                            {offer.bio}
                          </p>
                        )}

                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-slate-50 dark:bg-[#0B0E11] border border-slate-200 dark:border-[#2B3139] text-xs tabular-nums">
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-[#848E9C]">Trades</div>
                            <div className="font-mono font-bold text-slate-900 dark:text-[#EAECEF]">
                              {offer.completedOrders.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-[#848E9C]">Completion</div>
                            <div className="font-mono font-bold text-[#0ECB81]">{offer.completionRate}%</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-[#848E9C]">Rating</div>
                            <div className="font-mono font-bold text-[#F0B90B]">
                              {ratingVal.toFixed(1)}★ ({reviewsTotal})
                            </div>
                          </div>
                        </div>

                        {offer.quoteBuyPrice && offer.quoteSellPrice ? (
                          <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                            <div>
                              <span className="text-slate-500 dark:text-[#848E9C]">Buy: </span>
                              <span className="font-bold text-[#0ECB81]">{formatFiat(offer.quoteBuyPrice, offer.fiat)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-[#848E9C]">Sell: </span>
                              <span className="font-bold text-[#F6465D]">{formatFiat(offer.quoteSellPrice, offer.fiat)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-900 dark:text-[#EAECEF] tabular-nums">
                            {formatFiat(offer.price, offer.fiat)} / {offer.asset}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 dark:text-[#848E9C] truncate">
                          {offer.paymentMethods.join(' · ')} ·{' '}
                          <span className="font-mono text-slate-700 dark:text-[#EAECEF]">
                            {formatOrderLimit(offer.minLimit, offer.maxLimit, offer.fiat)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-[#2B3139]">
                        <button
                          type="button"
                          onClick={() => setProfileOffer(offer)}
                          className="flex-1 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                        >
                          Reviews & Bio
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOffer(offer)}
                          className={`flex-1 py-2 rounded-md text-xs font-semibold cursor-pointer ${
                            isSeller
                              ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]'
                              : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                          }`}
                        >
                          {isSeller ? `Buy ${offer.asset}` : `Sell ${offer.asset}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#848E9C] tabular-nums">
                  Showing <strong className="text-slate-900 dark:text-[#EAECEF]">{displayedProfiles.length}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-[#EAECEF]">{filteredProfiles.length}</strong> buyer &amp; seller profiles ({fiat})
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {filteredProfiles.length > PROFILE_PAGE_SIZE && (
                    <button
                      type="button"
                      onClick={() => setShowAllProfiles((s) => !s)}
                      className="px-3 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-semibold text-slate-700 dark:text-[#EAECEF] cursor-pointer"
                    >
                      {showAllProfiles ? `Paginate (${PROFILE_PAGE_SIZE}/page)` : `Show All ${filteredProfiles.length}`}
                    </button>
                  )}
                  {!showAllProfiles && totalProfilePages > 1 && (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safeProfilePage <= 1}
                        onClick={() => setProfilePage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] text-slate-700 dark:text-[#EAECEF] disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="font-mono px-2 text-slate-600 dark:text-[#848E9C] tabular-nums">
                        {safeProfilePage} / {totalProfilePages}
                      </span>
                      <button
                        type="button"
                        disabled={safeProfilePage >= totalProfilePages}
                        onClick={() => setProfilePage((p) => Math.min(totalProfilePages, p + 1))}
                        className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2B3139] text-slate-700 dark:text-[#EAECEF] disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
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
            <>
              <div className="md:hidden divide-y divide-slate-200 dark:divide-[#2B3139]">
                {p2pOrders.map((ord) => (
                  <div key={`mo-${ord.id}`} className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className={`font-semibold ${ord.userSide === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {ord.userSide} {ord.asset}
                        </span>{' '}
                        <span className="font-mono text-slate-500 dark:text-[#848E9C]">· {ord.id}</span>
                      </div>
                      <span
                        className={`font-semibold ${
                          ord.status === 'COMPLETED'
                            ? 'text-[#0ECB81]'
                            : ord.status === 'CANCELLED'
                              ? 'text-slate-400'
                              : ord.status === 'APPEAL'
                                ? 'text-[#F6465D]'
                                : 'text-[#F0B90B]'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-[#848E9C]">{ord.counterpartyName} · {ord.paymentMethod}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-[#EAECEF]">
                        {formatFiat(ord.fiatAmount, ord.fiat)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-slate-500 dark:text-[#848E9C]">
                        {formatCrypto(ord.cryptoAmount, ord.asset)} {ord.asset} · {formatTimeAgo(ord.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveOrderId(ord.id)}
                        className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
                      >
                        Open Trade Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
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
            </>
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
                        {formatOrderLimit(ad.minLimit, ad.maxLimit, ad.fiat)}
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
                    {pm.ifscCode ? ` · IFSC ${pm.ifscCode}` : ''}
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
              Add Payment Method (UPI / Bank / Global)
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
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Account Holder Name (Match PAN / KYC)</label>
              <input
                type="text"
                required
                value={newPmName}
                onChange={(e) => setNewPmName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">
                {newPmType.includes('UPI') ||
                newPmType === 'Google Pay (GPay)' ||
                newPmType === 'PhonePe' ||
                newPmType === 'CRED Pay' ||
                newPmType === 'SBI YONO Pay' ||
                newPmType === 'HDFC PayZapp' ||
                newPmType === 'ICICI iMobile Pay'
                  ? 'UPI ID (VPA)'
                  : 'Account Number / Handle / IBAN'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  newPmType.includes('UPI') ||
                  newPmType === 'Google Pay (GPay)' ||
                  newPmType === 'PhonePe' ||
                  newPmType === 'CRED Pay' ||
                  newPmType === 'SBI YONO Pay' ||
                  newPmType === 'HDFC PayZapp' ||
                  newPmType === 'ICICI iMobile Pay'
                    ? 'e.g. name@okaxis or 98XXXXXXXX@ybl'
                    : 'e.g. 50100482910421'
                }
                value={newPmNumber}
                onChange={(e) => setNewPmNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">Bank or App Provider</label>
              <input
                type="text"
                required
                placeholder={newPmType.includes('UPI') ? 'e.g. Google Pay / PhonePe / HDFC' : 'e.g. HDFC Bank / SBI / ICICI / Airtel'}
                value={newPmBank}
                onChange={(e) => setNewPmBank(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
              />
            </div>
            {(newPmType === 'IMPS' ||
              newPmType === 'NEFT / RTGS' ||
              newPmType === 'Bank Transfer' ||
              newPmType === 'Kotak 811' ||
              newPmType === 'Airtel Payments Bank') && (
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#848E9C] mb-1">IFSC Code (For Indian Banks)</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001245"
                  value={newPmIfsc}
                  onChange={(e) => setNewPmIfsc(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs uppercase text-slate-900 dark:text-[#EAECEF]"
                />
              </div>
            )}
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

      {/* Merchant Profile & Reviews Modal */}
      {profileOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#2B3139]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-[#2B3139] flex items-center justify-center font-display text-sm font-bold text-[#F0B90B] shrink-0">
                  {profileOffer.merchantName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-base font-semibold text-slate-900 dark:text-[#EAECEF] truncate">
                      {profileOffer.merchantName}
                    </h2>
                    {profileOffer.isVerified && <ShieldCheck className="w-4 h-4 text-[#F0B90B] shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#848E9C] truncate">
                    {profileOffer.location ?? 'Verified Merchant'} · {profileOffer.isOnline ? 'Online Now' : 'Away'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOffer(null)}
                className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer shrink-0"
                aria-label="Close merchant profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
              {profileOffer.bio && (
                <p className="text-xs leading-relaxed text-slate-600 dark:text-[#848E9C]">
                  {profileOffer.bio}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11]">
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Total Trades</div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-[#EAECEF] mt-0.5 tabular-nums">
                    {profileOffer.completedOrders.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11]">
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Completion</div>
                  <div className="font-mono text-base font-bold text-[#0ECB81] mt-0.5 tabular-nums">
                    {profileOffer.completionRate}%
                  </div>
                </div>
                <div className="p-3 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11]">
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Positive Rating</div>
                  <div className="font-mono text-base font-bold text-[#F0B90B] mt-0.5 tabular-nums">
                    {(profileOffer.rating ?? 4.9).toFixed(1)} ★ ({profileOffer.positiveRate ?? profileOffer.completionRate}%)
                  </div>
                </div>
                <div className="p-3 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11]">
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Avg Release</div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-[#EAECEF] mt-0.5 tabular-nums">
                    ~{profileOffer.avgReleaseMinutes} min
                  </div>
                </div>
              </div>

              {profileOffer.quoteBuyPrice && profileOffer.quoteSellPrice && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-md border border-[#0ECB81]/30 bg-[#0ECB81]/5">
                    <div className="text-slate-500 dark:text-[#848E9C]">Merchant Buy Price (User Buys)</div>
                    <div className="font-mono text-lg font-bold text-[#0ECB81] mt-0.5 tabular-nums">
                      {formatFiat(profileOffer.quoteBuyPrice, profileOffer.fiat)} / {profileOffer.asset}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-md border border-[#F6465D]/30 bg-[#F6465D]/5">
                    <div className="text-slate-500 dark:text-[#848E9C]">Merchant Sell Price (User Sells)</div>
                    <div className="font-mono text-lg font-bold text-[#F6465D] mt-0.5 tabular-nums">
                      {formatFiat(profileOffer.quoteSellPrice, profileOffer.fiat)} / {profileOffer.asset}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-[#EAECEF]">Accepted Payment Rails & Limits</div>
                <div className="text-slate-600 dark:text-[#848E9C]">
                  {profileOffer.paymentMethods.join(' · ')} · Limits{' '}
                  <span className="font-mono text-slate-900 dark:text-[#EAECEF]">
                    {formatOrderLimit(profileOffer.minLimit, profileOffer.maxLimit, profileOffer.fiat)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-[#EAECEF]">
                    Verified Trader Reviews ({(profileOffer.reviewsCount ?? 320).toLocaleString('en-IN')})
                  </span>
                  <span className="text-[#0ECB81] font-medium">
                    {profileOffer.positiveRate ?? 99.4}% Positive Feedback
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-[#2B3139] rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50/60 dark:bg-[#0B0E11]">
                  {(
                    profileOffer.reviews && profileOffer.reviews.length > 0
                      ? profileOffer.reviews
                      : [
                          {
                            id: 'default-r1',
                            reviewer: 'VerifiedTrader_IN',
                            rating: 5,
                            comment: `Instant settlement via ${profileOffer.paymentMethods[0]} with zero delay.`,
                            paymentMethod: profileOffer.paymentMethods[0],
                            dateLabel: '3h ago',
                          },
                          {
                            id: 'default-r2',
                            reviewer: 'Priya_CryptoIN',
                            rating: 5,
                            comment: 'Clean account transfer and fast escrow release.',
                            paymentMethod: profileOffer.paymentMethods[1] ?? profileOffer.paymentMethods[0],
                            dateLabel: '1d ago',
                          },
                        ]
                  ).map((rev) => (
                    <div key={rev.id} className="p-3.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-[#EAECEF]">
                          <span>{rev.reviewer}</span>
                          <span className="inline-flex items-center gap-0.5 text-[#F0B90B]">
                            <Star className="w-3 h-3 fill-[#F0B90B]" />
                            {rev.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-[#848E9C]">
                          {rev.paymentMethod} · {rev.dateLabel}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-[#848E9C]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2B3139] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileOffer(null)}
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-medium text-slate-700 dark:text-[#EAECEF] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = profileOffer;
                  setProfileOffer(null);
                  setSelectedOffer(target);
                }}
                className={`px-5 py-2 rounded-md text-xs font-semibold cursor-pointer ${
                  profileOffer.merchantSide === 'SELL'
                    ? 'bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11]'
                    : 'bg-[#F6465D] hover:bg-[#DF3B51] text-white'
                }`}
              >
                {profileOffer.merchantSide === 'SELL'
                  ? `Buy ${profileOffer.asset} (${formatFiat(profileOffer.price, profileOffer.fiat)})`
                  : `Sell ${profileOffer.asset} (${formatFiat(profileOffer.price, profileOffer.fiat)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

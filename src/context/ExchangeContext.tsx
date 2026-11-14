import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EARN_PRODUCTS,
  FIAT_RATES,
  INITIAL_BALANCES,
  INITIAL_EARN_POSITIONS,
  INITIAL_MARKETS,
  INITIAL_P2P_OFFERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_SPOT_ORDERS,
  INITIAL_TRADE_EXECUTIONS,
  INITIAL_TRANSACTIONS,
  generateCandleSeries,
} from '../data/seedData';
import {
  AuthMode,
  Candle,
  CryptoSymbol,
  EarnPosition,
  FiatCurrency,
  MarketAsset,
  NavTab,
  P2POffer,
  P2POrder,
  PaymentMethodType,
  SpotOrder,
  SpotOrderType,
  SpotTradeExecution,
  TradeSide,
  UserAccount,
  UserPaymentMethod,
  WalletBalance,
  WalletTransaction,
} from '../types/exchange';

interface StoredAccount extends UserAccount {
  password: string;
}

interface PersistedState {
  theme: 'dark' | 'light';
  fiat: FiatCurrency;
  hideBalances: boolean;
  currentUser: UserAccount | null;
  accounts: StoredAccount[];
  balances: Record<CryptoSymbol, WalletBalance>;
  p2pOffers: P2POffer[];
  p2pOrders: P2POrder[];
  spotOrders: SpotOrder[];
  tradeHistory: SpotTradeExecution[];
  earnPositions: EarnPosition[];
  transactions: WalletTransaction[];
  paymentMethods: UserPaymentMethod[];
}

const STORAGE_KEY = 'vault_p2p_exchange_v5';

const DEMO_ACCOUNT: StoredAccount = {
  id: 'usr-demo',
  fullName: 'Alex Mercer',
  email: 'alex.mercer@vaultp2p.io',
  password: 'VaultP2P@2026',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
};

interface ExchangeContextValue {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  authPage: AuthMode | null;
  prefillEmail: string;
  openAuthPage: (mode: AuthMode, email?: string) => void;
  closeAuthPage: () => void;
  currentUser: UserAccount | null;
  loginUser: (email: string, password: string) => { ok: boolean; error?: string };
  signupUser: (params: { fullName: string; email: string; password: string }) => { ok: boolean; error?: string };
  loginDemo: () => void;
  logoutUser: () => void;
  selectedSpotPair: string;
  setSelectedSpotPair: (pair: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  fiat: FiatCurrency;
  setFiat: (fiat: FiatCurrency) => void;
  hideBalances: boolean;
  toggleHideBalances: () => void;
  liveFeedEnabled: boolean;
  toggleLiveFeed: () => void;
  markets: MarketAsset[];
  candlesBySymbol: Record<string, Candle[]>;
  balances: Record<CryptoSymbol, WalletBalance>;
  totalPortfolioUsd: number;
  p2pOffers: P2POffer[];
  p2pOrders: P2POrder[];
  spotOrders: SpotOrder[];
  tradeHistory: SpotTradeExecution[];
  earnPositions: EarnPosition[];
  transactions: WalletTransaction[];
  paymentMethods: UserPaymentMethod[];
  toast: { id: number; message: string; tone: 'success' | 'error' | 'info' } | null;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
  depositModalOpen: boolean;
  setDepositModalOpen: (open: boolean) => void;

  // Actions
  placeSpotOrder: (params: {
    baseAsset: CryptoSymbol;
    quoteAsset: CryptoSymbol;
    side: TradeSide;
    type: SpotOrderType;
    price: number;
    stopPrice?: number;
    amount: number;
  }) => boolean;
  cancelSpotOrder: (orderId: string) => void;
  convertAssets: (from: CryptoSymbol, to: CryptoSymbol, fromAmount: number) => boolean;

  createP2POrder: (params: {
    offer: P2POffer;
    fiatAmount: number;
    paymentMethod: PaymentMethodType;
  }) => P2POrder | null;
  markP2POrderPaid: (orderId: string) => void;
  releaseP2POrder: (orderId: string) => void;
  cancelP2POrder: (orderId: string) => void;
  appealP2POrder: (orderId: string, reason: string) => void;
  sendP2PChatMessage: (orderId: string, text: string) => void;
  createP2PAd: (ad: Omit<P2POffer, 'id' | 'merchantId' | 'merchantName' | 'isVerified' | 'completedOrders' | 'completionRate' | 'avgReleaseMinutes'>) => void;
  toggleP2PAdStatus: (offerId: string) => void;
  deleteP2PAd: (offerId: string) => void;
  randomizeP2PRates: () => void;
  addPaymentMethod: (pm: Omit<UserPaymentMethod, 'id'>) => void;
  removePaymentMethod: (id: string) => void;

  depositFunds: (asset: CryptoSymbol, amount: number, network: string) => void;
  withdrawFunds: (asset: CryptoSymbol, amount: number, network: string, fee: number, address: string) => boolean;
  transferFunds: (asset: CryptoSymbol, amount: number, direction: 'SPOT_TO_FUNDING' | 'FUNDING_TO_SPOT') => boolean;

  subscribeEarn: (productId: string, amount: number) => boolean;
  redeemEarn: (positionId: string) => void;
  resetDemoState: () => void;
}

const ExchangeContext = createContext<ExchangeContextValue | null>(null);

function loadPersistedState(): PersistedState {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    const rawLegacy = rawCurrent
      ? null
      : (localStorage.getItem('vault_p2p_exchange_v4') ??
        localStorage.getItem('vault_p2p_exchange_v3') ??
        localStorage.getItem('vault_p2p_exchange_v2') ??
        localStorage.getItem('vault_p2p_exchange_v1'));
    const raw = rawCurrent ?? rawLegacy;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const existingOffers = parsed.p2pOffers ?? [];
      let mergedOffers: P2POffer[];
      if (rawCurrent && existingOffers.length > 0) {
        const existingIds = new Set(existingOffers.map((o) => o.id));
        const initialById = new Map(INITIAL_P2P_OFFERS.map((o) => [o.id, o]));
        mergedOffers = [
          ...existingOffers.map((o) => {
            if (o.isUserAd) return o;
            const fresh = initialById.get(o.id);
            return fresh
              ? {
                  ...o,
                  merchantName: fresh.merchantName,
                  bio: fresh.bio,
                  paymentMethods: fresh.paymentMethods,
                  minLimit: fresh.minLimit,
                  maxLimit: fresh.maxLimit,
                  terms: fresh.terms,
                }
              : o;
          }),
          ...INITIAL_P2P_OFFERS.filter((o) => !existingIds.has(o.id)),
        ];
      } else {
        // When upgrading from v1-v4, keep any custom user ads and load fresh INITIAL_P2P_OFFERS
        const customUserAds = existingOffers.filter((o) => o.isUserAd);
        mergedOffers = [...customUserAds, ...INITIAL_P2P_OFFERS];
      }
      return {
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        fiat: rawCurrent && parsed.fiat && FIAT_RATES[parsed.fiat] ? parsed.fiat : 'INR',
        hideBalances: Boolean(parsed.hideBalances),
        currentUser: parsed.currentUser !== undefined ? parsed.currentUser : null,
        accounts: parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : [DEMO_ACCOUNT],
        balances: parsed.balances ?? INITIAL_BALANCES,
        p2pOffers: mergedOffers,
        p2pOrders: parsed.p2pOrders ?? [],
        spotOrders: parsed.spotOrders ?? INITIAL_SPOT_ORDERS,
        tradeHistory: parsed.tradeHistory ?? INITIAL_TRADE_EXECUTIONS,
        earnPositions: parsed.earnPositions ?? INITIAL_EARN_POSITIONS,
        transactions: parsed.transactions ?? INITIAL_TRANSACTIONS,
        paymentMethods: parsed.paymentMethods ?? INITIAL_PAYMENT_METHODS,
      };
    }
  } catch {
    // Fallback to defaults if storage fails
  }
  return {
    theme: 'dark',
    fiat: 'INR',
    hideBalances: false,
    currentUser: null,
    accounts: [DEMO_ACCOUNT],
    balances: INITIAL_BALANCES,
    p2pOffers: INITIAL_P2P_OFFERS,
    p2pOrders: [],
    spotOrders: INITIAL_SPOT_ORDERS,
    tradeHistory: INITIAL_TRADE_EXECUTIONS,
    earnPositions: INITIAL_EARN_POSITIONS,
    transactions: INITIAL_TRANSACTIONS,
    paymentMethods: INITIAL_PAYMENT_METHODS,
  };
}

function getInitialRoute(): { tab: NavTab; auth: AuthMode | null } {
  if (typeof window === 'undefined') return { tab: 'home', auth: null };
  const path = window.location.pathname.toLowerCase();
  if (path === '/login') return { tab: 'home', auth: 'login' };
  if (path === '/signup') return { tab: 'home', auth: 'signup' };
  if (path === '/markets') return { tab: 'markets', auth: null };
  if (path === '/spot') return { tab: 'spot', auth: null };
  if (path === '/p2p') return { tab: 'p2p', auth: null };
  if (path === '/earn') return { tab: 'earn', auth: null };
  if (path === '/wallet') return { tab: 'wallet', auth: null };
  return { tab: 'home', auth: null };
}

export const ExchangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => loadPersistedState(), []);
  const initialRoute = useMemo(() => getInitialRoute(), []);

  const [activeTab, setActiveTabState] = useState<NavTab>(initialRoute.tab);
  const [authPage, setAuthPage] = useState<AuthMode | null>(initialRoute.auth);
  const [prefillEmail, setPrefillEmail] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(initial.currentUser);
  const [accounts, setAccounts] = useState<StoredAccount[]>(initial.accounts);
  const [selectedSpotPair, setSelectedSpotPair] = useState<string>('BTC/USDT');
  const [theme, setTheme] = useState<'dark' | 'light'>(initial.theme);
  const [fiat, setFiat] = useState<FiatCurrency>(initial.fiat);
  const [hideBalances, setHideBalances] = useState<boolean>(initial.hideBalances);
  const [liveFeedEnabled, setLiveFeedEnabled] = useState<boolean>(true);
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);

  const [markets, setMarkets] = useState<MarketAsset[]>(INITIAL_MARKETS);
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, Candle[]>>(() => {
    const map: Record<string, Candle[]> = {};
    for (const m of INITIAL_MARKETS) {
      if (m.symbol !== 'USDT' && m.symbol !== 'USDC') {
        map[m.symbol] = generateCandleSeries(m.price, 72, 3600);
      }
    }
    return map;
  });

  const [balances, setBalances] = useState<Record<CryptoSymbol, WalletBalance>>(initial.balances);
  const [p2pOffers, setP2pOffers] = useState<P2POffer[]>(initial.p2pOffers);
  const [p2pOrders, setP2pOrders] = useState<P2POrder[]>(initial.p2pOrders);
  const [spotOrders, setSpotOrders] = useState<SpotOrder[]>(initial.spotOrders);
  const [tradeHistory, setTradeHistory] = useState<SpotTradeExecution[]>(initial.tradeHistory);
  const [earnPositions, setEarnPositions] = useState<EarnPosition[]>(initial.earnPositions);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initial.transactions);
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>(initial.paymentMethods);
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'error' | 'info' } | null>(null);

  const notify = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sync HTML .dark class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        theme,
        fiat,
        hideBalances,
        currentUser,
        accounts,
        balances,
        p2pOffers,
        p2pOrders,
        spotOrders,
        tradeHistory,
        earnPositions,
        transactions,
        paymentMethods,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [theme, fiat, hideBalances, currentUser, accounts, balances, p2pOffers, p2pOrders, spotOrders, tradeHistory, earnPositions, transactions, paymentMethods]);

  useEffect(() => {
    const onPop = () => {
      const r = getInitialRoute();
      setActiveTabState(r.tab);
      setAuthPage(r.auth);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setActiveTab = useCallback((tab: NavTab) => {
    setAuthPage(null);
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'home' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo(0, 0);
    }
  }, []);

  const openAuthPage = useCallback((mode: AuthMode, email?: string) => {
    if (email !== undefined) {
      setPrefillEmail(email);
    }
    setAuthPage(mode);
    if (typeof window !== 'undefined') {
      const targetPath = mode === 'login' ? '/login' : '/signup';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, []);

  const closeAuthPage = useCallback(() => {
    setAuthPage(null);
    if (typeof window !== 'undefined') {
      const targetPath = activeTab === 'home' ? '/' : `/${activeTab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [activeTab]);

  const loginUser = useCallback(
    (email: string, password: string): { ok: boolean; error?: string } => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !password) {
        return { ok: false, error: 'Please enter your email and password.' };
      }
      const match = accounts.find((a) => a.email.toLowerCase() === normalized);
      if (!match || match.password !== password) {
        return { ok: false, error: 'Invalid email or password. Try the Demo Account or create a new account.' };
      }
      const user: UserAccount = {
        id: match.id,
        fullName: match.fullName,
        email: match.email,
        createdAt: match.createdAt,
      };
      setCurrentUser(user);
      setAuthPage(null);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', activeTab === 'home' ? '/' : `/${activeTab}`);
      }
      notify(`Welcome back, ${user.fullName}`, 'success');
      return { ok: true };
    },
    [accounts, activeTab, notify]
  );

  const signupUser = useCallback(
    ({ fullName, email, password }: { fullName: string; email: string; password: string }): { ok: boolean; error?: string } => {
      const cleanName = fullName.trim();
      const normalized = email.trim().toLowerCase();
      if (cleanName.length < 2) {
        return { ok: false, error: 'Please enter your full name (at least 2 characters).' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (password.length < 8) {
        return { ok: false, error: 'Password must be at least 8 characters long.' };
      }
      if (accounts.some((a) => a.email.toLowerCase() === normalized)) {
        return { ok: false, error: 'An account with this email already exists. Please log in.' };
      }
      const created: StoredAccount = {
        id: `usr-${Date.now()}`,
        fullName: cleanName,
        email: normalized,
        password,
        createdAt: Date.now(),
      };
      setAccounts((prev) => [...prev, created]);
      const user: UserAccount = {
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        createdAt: created.createdAt,
      };
      setCurrentUser(user);
      setAuthPage(null);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
      }
      setActiveTabState('home');
      notify(`Account created! Welcome to Vault P2P, ${user.fullName}`, 'success');
      return { ok: true };
    },
    [accounts, notify]
  );

  const loginDemo = useCallback(() => {
    const user: UserAccount = {
      id: DEMO_ACCOUNT.id,
      fullName: DEMO_ACCOUNT.fullName,
      email: DEMO_ACCOUNT.email,
      createdAt: DEMO_ACCOUNT.createdAt,
    };
    setCurrentUser(user);
    setAuthPage(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', activeTab === 'home' ? '/' : `/${activeTab}`);
    }
    notify(`Signed in as ${user.fullName}`, 'success');
  }, [activeTab, notify]);

  const logoutUser = useCallback(() => {
    setCurrentUser(null);
    setAuthPage('login');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/login');
    }
    notify('Signed out of Vault P2P', 'info');
  }, [notify]);

  const spotOrdersRef = useRef(spotOrders);
  spotOrdersRef.current = spotOrders;

  // Live price ticks + automatic Limit Order matching
  useEffect(() => {
    if (!liveFeedEnabled) return;
    const interval = window.setInterval(() => {
      setMarkets((prevMarkets) => {
        const updated = prevMarkets.map((m) => {
          if (m.symbol === 'USDT' || m.symbol === 'USDC') return m;
          const pctMove = (Math.random() - 0.495) * 0.0024;
          const nextPrice = Number((m.price * (1 + pctMove)).toPrecision(6));
          const nextChange = Number((m.change24h + pctMove * 100).toFixed(2));
          const nextHigh = Math.max(m.high24h, nextPrice);
          const nextLow = Math.min(m.low24h, nextPrice);
          const nextSpark = [...m.sparkline.slice(1), nextPrice];
          return {
            ...m,
            price: nextPrice,
            change24h: nextChange,
            high24h: nextHigh,
            low24h: nextLow,
            sparkline: nextSpark,
          };
        });

        // Update latest candle close
        setCandlesBySymbol((prevCandles) => {
          const nextCandles = { ...prevCandles };
          for (const m of updated) {
            const list = nextCandles[m.symbol];
            if (!list || list.length === 0) continue;
            const last = list[list.length - 1];
            const updatedLast: Candle = {
              ...last,
              close: m.price,
              high: Math.max(last.high, m.price),
              low: Math.min(last.low, m.price),
              volume: last.volume + Math.random() * 12,
            };
            nextCandles[m.symbol] = [...list.slice(0, -1), updatedLast];
          }
          return nextCandles;
        });

        // Check open limit orders
        const openOrders = spotOrdersRef.current.filter((o) => o.status === 'OPEN');
        if (openOrders.length > 0) {
          const priceMap = new Map(updated.map((m) => [m.symbol, m.price]));
          const newlyFilled: SpotOrder[] = [];
          for (const ord of openOrders) {
            const livePrice = priceMap.get(ord.baseAsset);
            if (!livePrice) continue;
            const shouldFill =
              (ord.side === 'BUY' && livePrice <= ord.price) ||
              (ord.side === 'SELL' && livePrice >= ord.price);
            if (shouldFill) {
              newlyFilled.push(ord);
            }
          }

          if (newlyFilled.length > 0) {
            const filledIds = new Set(newlyFilled.map((o) => o.id));
            setSpotOrders((prev) =>
              prev.map((o) => (filledIds.has(o.id) ? { ...o, status: 'FILLED', filled: o.amount } : o))
            );
            setBalances((prevBal) => {
              const nextBal = { ...prevBal };
              for (const ord of newlyFilled) {
                const feeRate = 0.001;
                if (ord.side === 'BUY') {
                  const quoteEntry = { ...nextBal[ord.quoteAsset] };
                  quoteEntry.spotLocked = Math.max(0, quoteEntry.spotLocked - ord.total);
                  nextBal[ord.quoteAsset] = quoteEntry;

                  const baseEntry = { ...nextBal[ord.baseAsset] };
                  baseEntry.spot += ord.amount * (1 - feeRate);
                  nextBal[ord.baseAsset] = baseEntry;
                } else {
                  const baseEntry = { ...nextBal[ord.baseAsset] };
                  baseEntry.spotLocked = Math.max(0, baseEntry.spotLocked - ord.amount);
                  nextBal[ord.baseAsset] = baseEntry;

                  const quoteEntry = { ...nextBal[ord.quoteAsset] };
                  quoteEntry.spot += ord.total * (1 - feeRate);
                  nextBal[ord.quoteAsset] = quoteEntry;
                }
              }
              return nextBal;
            });
            setTradeHistory((prevExecs) => [
              ...newlyFilled.map((ord) => ({
                id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                orderId: ord.id,
                pair: ord.pair,
                side: ord.side,
                price: ord.price,
                amount: ord.amount,
                fee: ord.side === 'BUY' ? ord.amount * 0.001 : ord.total * 0.001,
                feeAsset: ord.side === 'BUY' ? ord.baseAsset : ord.quoteAsset,
                total: ord.total,
                timestamp: Date.now(),
              })),
              ...prevExecs,
            ]);
            notify(`Limit order filled: ${newlyFilled[0].side} ${newlyFilled[0].amount} ${newlyFilled[0].baseAsset}`, 'success');
          }
        }

        return updated;
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, [liveFeedEnabled, notify]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleHideBalances = useCallback(() => setHideBalances((h) => !h), []);
  const toggleLiveFeed = useCallback(() => setLiveFeedEnabled((v) => !v), []);

  const totalPortfolioUsd = useMemo(() => {
    const priceMap = new Map(markets.map((m) => [m.symbol, m.price]));
    let sum = 0;
    (Object.keys(balances) as CryptoSymbol[]).forEach((sym) => {
      const b = balances[sym];
      const p = priceMap.get(sym) ?? 0;
      sum += (b.spot + b.spotLocked + b.funding + b.fundingLocked) * p;
    });
    for (const pos of earnPositions) {
      if (pos.status === 'ACTIVE') {
        const p = priceMap.get(pos.asset) ?? 0;
        sum += (pos.principal + pos.accruedYield) * p;
      }
    }
    return sum;
  }, [balances, markets, earnPositions]);

  const placeSpotOrder = useCallback(
    ({
      baseAsset,
      quoteAsset,
      side,
      type,
      price,
      stopPrice,
      amount,
    }: {
      baseAsset: CryptoSymbol;
      quoteAsset: CryptoSymbol;
      side: TradeSide;
      type: SpotOrderType;
      price: number;
      stopPrice?: number;
      amount: number;
    }) => {
      if (amount <= 0 || price <= 0) {
        notify('Enter a valid price and amount', 'error');
        return false;
      }
      const total = Number((price * amount).toFixed(6));
      const baseBal = balances[baseAsset];
      const quoteBal = balances[quoteAsset];

      if (side === 'BUY' && quoteBal.spot < total) {
        notify(`Insufficient ${quoteAsset} Spot balance`, 'error');
        return false;
      }
      if (side === 'SELL' && baseBal.spot < amount) {
        notify(`Insufficient ${baseAsset} Spot balance`, 'error');
        return false;
      }

      const marketAsset = markets.find((m) => m.symbol === baseAsset);
      const livePrice = marketAsset?.price ?? price;
      const isImmediate =
        type === 'MARKET' ||
        (type === 'LIMIT' && ((side === 'BUY' && price >= livePrice) || (side === 'SELL' && price <= livePrice)));

      const orderId = `ord-${Date.now()}`;
      const execPrice = type === 'MARKET' ? livePrice : price;
      const execTotal = execPrice * amount;
      const feeRate = 0.001;

      if (isImmediate) {
        setBalances((prev) => {
          const next = { ...prev };
          if (side === 'BUY') {
            next[quoteAsset] = { ...next[quoteAsset], spot: Math.max(0, next[quoteAsset].spot - execTotal) };
            next[baseAsset] = { ...next[baseAsset], spot: next[baseAsset].spot + amount * (1 - feeRate) };
          } else {
            next[baseAsset] = { ...next[baseAsset], spot: Math.max(0, next[baseAsset].spot - amount) };
            next[quoteAsset] = { ...next[quoteAsset], spot: next[quoteAsset].spot + execTotal * (1 - feeRate) };
          }
          return next;
        });

        const filledOrder: SpotOrder = {
          id: orderId,
          pair: `${baseAsset}/${quoteAsset}`,
          baseAsset,
          quoteAsset,
          side,
          type,
          price: execPrice,
          stopPrice,
          amount,
          filled: amount,
          total: execTotal,
          status: 'FILLED',
          createdAt: Date.now(),
        };
        setSpotOrders((prev) => [filledOrder, ...prev]);
        setTradeHistory((prev) => [
          {
            id: `ex-${Date.now()}`,
            orderId,
            pair: `${baseAsset}/${quoteAsset}`,
            side,
            price: execPrice,
            amount,
            fee: side === 'BUY' ? amount * feeRate : execTotal * feeRate,
            feeAsset: side === 'BUY' ? baseAsset : quoteAsset,
            total: execTotal,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
        notify(`${side === 'BUY' ? 'Bought' : 'Sold'} ${amount} ${baseAsset} at $${execPrice.toLocaleString()}`, 'success');
      } else {
        setBalances((prev) => {
          const next = { ...prev };
          if (side === 'BUY') {
            next[quoteAsset] = {
              ...next[quoteAsset],
              spot: next[quoteAsset].spot - total,
              spotLocked: next[quoteAsset].spotLocked + total,
            };
          } else {
            next[baseAsset] = {
              ...next[baseAsset],
              spot: next[baseAsset].spot - amount,
              spotLocked: next[baseAsset].spotLocked + amount,
            };
          }
          return next;
        });

        const openOrder: SpotOrder = {
          id: orderId,
          pair: `${baseAsset}/${quoteAsset}`,
          baseAsset,
          quoteAsset,
          side,
          type,
          price,
          stopPrice,
          amount,
          filled: 0,
          total,
          status: 'OPEN',
          createdAt: Date.now(),
        };
        setSpotOrders((prev) => [openOrder, ...prev]);
        notify(`Open ${type} order placed: ${side} ${amount} ${baseAsset} @ $${price.toLocaleString()}`, 'info');
      }
      return true;
    },
    [balances, markets, notify]
  );

  const cancelSpotOrder = useCallback(
    (orderId: string) => {
      const target = spotOrders.find((o) => o.id === orderId && o.status === 'OPEN');
      if (!target) return;
      setSpotOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      setBalances((prev) => {
        const next = { ...prev };
        if (target.side === 'BUY') {
          next[target.quoteAsset] = {
            ...next[target.quoteAsset],
            spot: next[target.quoteAsset].spot + target.total,
            spotLocked: Math.max(0, next[target.quoteAsset].spotLocked - target.total),
          };
        } else {
          next[target.baseAsset] = {
            ...next[target.baseAsset],
            spot: next[target.baseAsset].spot + target.amount,
            spotLocked: Math.max(0, next[target.baseAsset].spotLocked - target.amount),
          };
        }
        return next;
      });
      notify(`Cancelled ${target.pair} order`, 'info');
    },
    [spotOrders, notify]
  );

  const convertAssets = useCallback(
    (from: CryptoSymbol, to: CryptoSymbol, fromAmount: number) => {
      if (from === to || fromAmount <= 0) {
        notify('Select two different assets and a positive amount', 'error');
        return false;
      }
      if (balances[from].spot < fromAmount) {
        notify(`Insufficient ${from} Spot balance`, 'error');
        return false;
      }
      const fromPrice = markets.find((m) => m.symbol === from)?.price ?? 1;
      const toPrice = markets.find((m) => m.symbol === to)?.price ?? 1;
      const toAmount = (fromAmount * fromPrice) / toPrice;

      setBalances((prev) => ({
        ...prev,
        [from]: { ...prev[from], spot: prev[from].spot - fromAmount },
        [to]: { ...prev[to], spot: prev[to].spot + toAmount },
      }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'CONVERT',
          asset: to,
          amount: toAmount,
          details: `Converted ${fromAmount} ${from} → ${toAmount.toFixed(6)} ${to} (0% fee)`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Converted ${fromAmount} ${from} to ${toAmount.toFixed(4)} ${to}`, 'success');
      return true;
    },
    [balances, markets, notify]
  );

  const createP2POrder = useCallback(
    ({
      offer,
      fiatAmount,
      paymentMethod,
    }: {
      offer: P2POffer;
      fiatAmount: number;
      paymentMethod: PaymentMethodType;
    }) => {
      if (fiatAmount < offer.minLimit || fiatAmount > offer.maxLimit) {
        notify(`Amount must be between ${offer.minLimit} and ${offer.maxLimit} ${offer.fiat}`, 'error');
        return null;
      }
      const cryptoAmount = Number((fiatAmount / offer.price).toFixed(6));
      if (cryptoAmount > offer.availableAmount) {
        notify(`Exceeds merchant available liquidity (${offer.availableAmount} ${offer.asset})`, 'error');
        return null;
      }

      // If merchantSide === 'BUY', user is SELLING crypto -> lock user's Funding wallet crypto into escrow!
      const userSide: 'BUY' | 'SELL' = offer.merchantSide === 'SELL' ? 'BUY' : 'SELL';
      if (userSide === 'SELL') {
        if (balances[offer.asset].funding < cryptoAmount) {
          notify(`Insufficient ${offer.asset} in Funding Wallet. Transfer from Spot first.`, 'error');
          return null;
        }
        setBalances((prev) => ({
          ...prev,
          [offer.asset]: {
            ...prev[offer.asset],
            funding: prev[offer.asset].funding - cryptoAmount,
            fundingLocked: prev[offer.asset].fundingLocked + cryptoAmount,
          },
        }));
      }

      const cleanSlug = offer.merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isUpiApp =
        paymentMethod === 'UPI' ||
        paymentMethod === 'Google Pay (GPay)' ||
        paymentMethod === 'PhonePe' ||
        paymentMethod === 'Paytm UPI' ||
        paymentMethod === 'BHIM UPI' ||
        paymentMethod === 'CRED Pay' ||
        paymentMethod === 'Amazon Pay UPI';

      const upiHandleSuffix =
        paymentMethod === 'Google Pay (GPay)'
          ? 'okaxis'
          : paymentMethod === 'PhonePe'
            ? 'ybl'
            : paymentMethod === 'Paytm UPI'
              ? 'paytm'
              : paymentMethod === 'BHIM UPI'
                ? 'upi'
                : paymentMethod === 'CRED Pay'
                  ? 'axisb'
                  : paymentMethod === 'Amazon Pay UPI'
                    ? 'apl'
                    : 'okicici';

      const accountNumber = isUpiApp
        ? `${cleanSlug}@${upiHandleSuffix}`
        : paymentMethod === 'Paytm Wallet'
          ? `+91 98${Math.floor(10000000 + Math.random() * 89999999)}`
          : paymentMethod === 'Digital eRupee'
            ? `eINR-${cleanSlug.slice(0, 8).toUpperCase()}-4921`
            : paymentMethod === 'IMPS' || paymentMethod === 'NEFT / RTGS'
              ? `50100${Math.floor(100000000 + Math.random() * 899999999)} (IFSC: ICIC0000421)`
              : paymentMethod === 'Wise' || paymentMethod === 'PayPal'
                ? `settlement@${cleanSlug}.io`
                : `ACCT-${Math.floor(40000000 + Math.random() * 59999999)}`;

      const bankName =
        paymentMethod === 'UPI'
          ? 'UPI (Any NPCI App)'
          : isUpiApp
            ? paymentMethod
            : paymentMethod === 'IMPS' || paymentMethod === 'NEFT / RTGS'
              ? 'ICICI Bank India'
              : paymentMethod === 'Digital eRupee'
                ? 'RBI e₹ Retail Wallet'
                : `${paymentMethod} Clearing`;

      const orderId = `P2P-${Math.floor(100000 + Math.random() * 900000)}`;
      const refCode = `VP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const newOrder: P2POrder = {
        id: orderId,
        offerId: offer.id,
        userSide,
        counterpartyName: offer.merchantName,
        counterpartyVerified: offer.isVerified,
        asset: offer.asset,
        fiat: offer.fiat,
        price: offer.price,
        cryptoAmount,
        fiatAmount,
        paymentMethod,
        paymentDetails: {
          accountName: userSide === 'BUY' ? `${offer.merchantName}` : `${currentUser?.fullName ?? 'Alex Mercer'} (Your Saved Method)`,
          accountNumber,
          bankName,
          referenceCode: refCode,
        },
        status: 'PENDING_PAYMENT',
        createdAt: Date.now(),
        expiresAt: Date.now() + offer.paymentWindowMinutes * 60 * 1000,
        messages: [
          {
            id: `msg-${Date.now()}-sys`,
            sender: 'SYSTEM',
            text: `Escrow locked ${cryptoAmount} ${offer.asset}. Never release funds before verifying receipt in your ${paymentMethod} account.${offer.fiat === 'INR' ? ' Do not mention crypto or BTC/USDT in UPI/IMPS remarks.' : ''}`,
            timestamp: Date.now(),
          },
          {
            id: `msg-${Date.now()}-m`,
            sender: 'COUNTERPARTY',
            text:
              userSide === 'BUY'
                ? `Namaste! I'm online. Please transfer ${fiatAmount.toLocaleString(offer.fiat === 'INR' ? 'en-IN' : 'en-US')} ${offer.fiat} via ${paymentMethod} using ref ${refCode}${offer.fiat === 'INR' ? ' (share UTR if using IMPS/UPI)' : ''} and click "Transferred, Notify Seller".`
                : `Hi! Your ${cryptoAmount} ${offer.asset} is in Vault escrow. Sending ${fiatAmount.toLocaleString(offer.fiat === 'INR' ? 'en-IN' : 'en-US')} ${offer.fiat} to your ${paymentMethod} now — I will notify you shortly.`,
            timestamp: Date.now() + 50,
          },
        ],
      };

      setP2pOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, availableAmount: Math.max(0, Number((o.availableAmount - cryptoAmount).toFixed(6))) } : o))
      );
      setP2pOrders((prev) => [newOrder, ...prev]);

      // If user is SELLING, simulate buyer automatically marking fiat paid after 3.5 seconds!
      if (userSide === 'SELL') {
        window.setTimeout(() => {
          setP2pOrders((prev) =>
            prev.map((ord) => {
              if (ord.id !== orderId || ord.status !== 'PENDING_PAYMENT') return ord;
              return {
                ...ord,
                status: 'PAID_AWAITING_RELEASE',
                messages: [
                  ...ord.messages,
                  {
                    id: `msg-${Date.now()}-paid`,
                    sender: 'COUNTERPARTY',
                    text: `Payment sent! ${fiatAmount.toLocaleString()} ${offer.fiat} dispatched via ${paymentMethod} (Ref: ${refCode}). Please verify receipt and release escrow.`,
                    timestamp: Date.now(),
                  },
                ],
              };
            })
          );
        }, 3500);
      }

      notify(`P2P Escrow Order ${orderId} created`, 'success');
      return newOrder;
    },
    [balances, notify]
  );

  const releaseP2POrder = useCallback(
    (orderId: string) => {
      const target = p2pOrders.find((o) => o.id === orderId);
      if (!target || target.status === 'COMPLETED' || target.status === 'CANCELLED') return;

      setP2pOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'COMPLETED',
                messages: [
                  ...o.messages,
                  {
                    id: `msg-${Date.now()}-rel`,
                    sender: 'SYSTEM',
                    text: `Escrow released! ${o.cryptoAmount} ${o.asset} settled cleanly.`,
                    timestamp: Date.now(),
                  },
                ],
              }
            : o
        )
      );

      setBalances((prev) => {
        const next = { ...prev };
        if (target.userSide === 'BUY') {
          next[target.asset] = {
            ...next[target.asset],
            funding: next[target.asset].funding + target.cryptoAmount,
          };
        } else {
          next[target.asset] = {
            ...next[target.asset],
            fundingLocked: Math.max(0, next[target.asset].fundingLocked - target.cryptoAmount),
          };
        }
        return next;
      });

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: target.userSide === 'BUY' ? 'P2P_BUY' : 'P2P_SELL',
          asset: target.asset,
          amount: target.cryptoAmount,
          details: `${target.userSide === 'BUY' ? 'Bought from' : 'Sold to'} ${target.counterpartyName} (${target.fiatAmount.toLocaleString()} ${target.fiat})`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      notify(`Order ${orderId} completed! ${target.cryptoAmount} ${target.asset} settled.`, 'success');
    },
    [p2pOrders, notify]
  );

  const markP2POrderPaid = useCallback(
    (orderId: string) => {
      const target = p2pOrders.find((o) => o.id === orderId && o.status === 'PENDING_PAYMENT');
      if (!target) return;

      setP2pOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'PAID_AWAITING_RELEASE',
                messages: [
                  ...o.messages,
                  {
                    id: `msg-${Date.now()}-u`,
                    sender: 'SYSTEM',
                    text: `Buyer marked order as paid. Awaiting seller confirmation & escrow release.`,
                    timestamp: Date.now(),
                  },
                ],
              }
            : o
        )
      );
      notify('Payment confirmed. Seller notified to release escrow.', 'info');

      // Counterparty verifies & releases after 3.2s
      window.setTimeout(() => {
        setP2pOrders((curr) => {
          const found = curr.find((x) => x.id === orderId);
          if (!found || found.status !== 'PAID_AWAITING_RELEASE') return curr;
          return curr;
        });
        releaseP2POrder(orderId);
      }, 3200);
    },
    [p2pOrders, notify, releaseP2POrder]
  );

  const cancelP2POrder = useCallback(
    (orderId: string) => {
      const target = p2pOrders.find((o) => o.id === orderId);
      if (!target || target.status === 'COMPLETED' || target.status === 'CANCELLED') return;

      setP2pOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'CANCELLED',
                messages: [
                  ...o.messages,
                  {
                    id: `msg-${Date.now()}-can`,
                    sender: 'SYSTEM',
                    text: 'Order cancelled. Any locked escrow returned to seller.',
                    timestamp: Date.now(),
                  },
                ],
              }
            : o
        )
      );

      if (target.userSide === 'SELL') {
        setBalances((prev) => ({
          ...prev,
          [target.asset]: {
            ...prev[target.asset],
            funding: prev[target.asset].funding + target.cryptoAmount,
            fundingLocked: Math.max(0, prev[target.asset].fundingLocked - target.cryptoAmount),
          },
        }));
      }

      setP2pOffers((prev) =>
        prev.map((o) => (o.id === target.offerId ? { ...o, availableAmount: Number((o.availableAmount + target.cryptoAmount).toFixed(6)) } : o))
      );
      notify(`Order ${orderId} cancelled`, 'info');
    },
    [p2pOrders, notify]
  );

  const appealP2POrder = useCallback(
    (orderId: string, reason: string) => {
      setP2pOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'APPEAL',
                messages: [
                  ...o.messages,
                  {
                    id: `msg-${Date.now()}-app`,
                    sender: 'SYSTEM',
                    text: `Dispute appeal opened: "${reason}". Vault P2P Escrow Arbitrator assigned — funds remain safely locked.`,
                    timestamp: Date.now(),
                  },
                ],
              }
            : o
        )
      );
      notify('Appeal submitted. Escrow arbitrator notified.', 'info');
    },
    [notify]
  );

  const sendP2PChatMessage = useCallback((orderId: string, text: string) => {
    if (!text.trim()) return;
    setP2pOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              messages: [
                ...o.messages,
                {
                  id: `msg-${Date.now()}-chat`,
                  sender: 'USER',
                  text: text.trim(),
                  timestamp: Date.now(),
                },
              ],
            }
          : o
      )
    );

    window.setTimeout(() => {
      setP2pOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId || o.status === 'CANCELLED') return o;
          return {
            ...o,
            messages: [
              ...o.messages,
              {
                id: `msg-${Date.now()}-reply`,
                sender: 'COUNTERPARTY',
                text: 'Received your message — checking banking app now. Thanks for trading on Vault P2P.',
                timestamp: Date.now(),
              },
            ],
          };
        })
      );
    }, 1200);
  }, []);

  const createP2PAd = useCallback(
    (
      ad: Omit<
        P2POffer,
        'id' | 'merchantId' | 'merchantName' | 'isVerified' | 'completedOrders' | 'completionRate' | 'avgReleaseMinutes'
      >
    ) => {
      const merchantLabel = currentUser
        ? `${currentUser.fullName.replace(/\s+/g, '')}_Desk (You)`
        : 'AlexMercer_Desk (You)';
      const newAd: P2POffer = {
        ...ad,
        id: `p2p-user-${Date.now()}`,
        merchantId: currentUser?.id ?? 'user-self',
        merchantName: merchantLabel,
        isVerified: true,
        isUserAd: true,
        completedOrders: 142,
        completionRate: 99.3,
        avgReleaseMinutes: 4,
        location: ad.fiat === 'INR' ? 'India Desk' : 'Global Desk',
        rating: 4.9,
        positiveRate: 99.4,
        reviewsCount: 48,
        quoteBuyPrice: ad.merchantSide === 'SELL' ? ad.price : undefined,
        quoteSellPrice: ad.merchantSide === 'BUY' ? ad.price : undefined,
      };
      setP2pOffers((prev) => [newAd, ...prev]);
      notify(`Published P2P ${ad.merchantSide} Ad for ${ad.asset}/${ad.fiat}`, 'success');
    },
    [currentUser, notify]
  );

  const toggleP2PAdStatus = useCallback((offerId: string) => {
    setP2pOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, isOnline: !o.isOnline } : o)));
  }, []);

  const deleteP2PAd = useCallback(
    (offerId: string) => {
      setP2pOffers((prev) => prev.filter((o) => o.id !== offerId));
      notify('P2P Ad removed', 'info');
    },
    [notify]
  );

  const randomizeP2PRates = useCallback(() => {
    const randBetween = (min: number, max: number) =>
      Number((min + Math.random() * (max - min)).toFixed(2));
    setP2pOffers((prev) =>
      prev.map((o) => {
        if (o.isUserAd || o.fiat !== 'INR' || (o.asset !== 'USDT' && o.asset !== 'USDC')) {
          return o;
        }
        const nextBuy = randBetween(103.2, 110.86);
        const nextSell = randBetween(102.67, 105.0);
        return {
          ...o,
          quoteBuyPrice: nextBuy,
          quoteSellPrice: nextSell,
          price: o.merchantSide === 'SELL' ? nextBuy : nextSell,
        };
      })
    );
    notify('Refreshed live INR P2P Buy (₹103.20–₹110.86) & Sell (₹102.67–₹105.00) quotes', 'info');
  }, [notify]);

  const addPaymentMethod = useCallback(
    (pm: Omit<UserPaymentMethod, 'id'>) => {
      setPaymentMethods((prev) => [...prev, { ...pm, id: `pm-${Date.now()}` }]);
      notify(`Added ${pm.type} payment method`, 'success');
    },
    [notify]
  );

  const removePaymentMethod = useCallback(
    (id: string) => {
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
      notify('Payment method removed', 'info');
    },
    [notify]
  );

  const depositFunds = useCallback(
    (asset: CryptoSymbol, amount: number, network: string) => {
      if (amount <= 0) return;
      setBalances((prev) => ({
        ...prev,
        [asset]: { ...prev[asset], spot: prev[asset].spot + amount },
      }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'DEPOSIT',
          asset,
          amount,
          details: `${network} Deposit Credited`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Deposited ${amount} ${asset} via ${network}`, 'success');
    },
    [notify]
  );

  const withdrawFunds = useCallback(
    (asset: CryptoSymbol, amount: number, network: string, fee: number, address: string) => {
      const totalRequired = amount + fee;
      if (amount <= 0 || !address.trim()) {
        notify('Enter valid address and amount', 'error');
        return false;
      }
      if (balances[asset].spot < totalRequired) {
        notify(`Insufficient ${asset} Spot balance (including ${fee} ${asset} fee)`, 'error');
        return false;
      }
      setBalances((prev) => ({
        ...prev,
        [asset]: { ...prev[asset], spot: prev[asset].spot - totalRequired },
      }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'WITHDRAW',
          asset,
          amount,
          details: `Withdrew to ${address.slice(0, 8)}...${address.slice(-4)} via ${network}`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Withdrawal of ${amount} ${asset} submitted`, 'success');
      return true;
    },
    [balances, notify]
  );

  const transferFunds = useCallback(
    (asset: CryptoSymbol, amount: number, direction: 'SPOT_TO_FUNDING' | 'FUNDING_TO_SPOT') => {
      if (amount <= 0) {
        notify('Enter a valid amount', 'error');
        return false;
      }
      if (direction === 'SPOT_TO_FUNDING') {
        if (balances[asset].spot < amount) {
          notify(`Insufficient ${asset} in Spot Wallet`, 'error');
          return false;
        }
        setBalances((prev) => ({
          ...prev,
          [asset]: {
            ...prev[asset],
            spot: prev[asset].spot - amount,
            funding: prev[asset].funding + amount,
          },
        }));
      } else {
        if (balances[asset].funding < amount) {
          notify(`Insufficient ${asset} in Funding Wallet`, 'error');
          return false;
        }
        setBalances((prev) => ({
          ...prev,
          [asset]: {
            ...prev[asset],
            funding: prev[asset].funding - amount,
            spot: prev[asset].spot + amount,
          },
        }));
      }
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'TRANSFER',
          asset,
          amount,
          details: direction === 'SPOT_TO_FUNDING' ? 'Spot → Funding (P2P)' : 'Funding (P2P) → Spot',
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Transferred ${amount} ${asset}`, 'success');
      return true;
    },
    [balances, notify]
  );

  const subscribeEarn = useCallback(
    (productId: string, amount: number) => {
      const prod = EARN_PRODUCTS.find((p) => p.id === productId);
      if (!prod) return false;
      if (amount < prod.minAmount) {
        notify(`Minimum subscription is ${prod.minAmount} ${prod.asset}`, 'error');
        return false;
      }
      if (balances[prod.asset].spot < amount) {
        notify(`Insufficient ${prod.asset} Spot balance`, 'error');
        return false;
      }
      setBalances((prev) => ({
        ...prev,
        [prod.asset]: { ...prev[prod.asset], spot: prev[prod.asset].spot - amount },
      }));
      const pos: EarnPosition = {
        id: `ep-${Date.now()}`,
        productId: prod.id,
        asset: prod.asset,
        type: prod.type,
        durationDays: prod.durationDays,
        apr: prod.apr,
        principal: amount,
        accruedYield: Number(((amount * (prod.apr / 100)) / 365).toFixed(6)),
        startedAt: Date.now(),
        status: 'ACTIVE',
      };
      setEarnPositions((prev) => [pos, ...prev]);
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'EARN_STAKE',
          asset: prod.asset,
          amount,
          details: `Staked in ${prod.asset} ${prod.type === 'FLEXIBLE' ? 'Flexible' : `${prod.durationDays}D Locked`} (${prod.apr}% APR)`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Subscribed ${amount} ${prod.asset} at ${prod.apr}% APR`, 'success');
      return true;
    },
    [balances, notify]
  );

  const redeemEarn = useCallback(
    (positionId: string) => {
      const pos = earnPositions.find((p) => p.id === positionId && p.status === 'ACTIVE');
      if (!pos) return;
      const payout = pos.principal + pos.accruedYield;
      setEarnPositions((prev) => prev.map((p) => (p.id === positionId ? { ...p, status: 'REDEEMED' } : p)));
      setBalances((prev) => ({
        ...prev,
        [pos.asset]: { ...prev[pos.asset], spot: prev[pos.asset].spot + payout },
      }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'EARN_REDEEM',
          asset: pos.asset,
          amount: payout,
          details: `Redeemed ${pos.principal} ${pos.asset} + ${pos.accruedYield.toFixed(4)} yield`,
          status: 'COMPLETED',
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      notify(`Redeemed ${payout.toFixed(4)} ${pos.asset} to Spot Wallet`, 'success');
    },
    [earnPositions, notify]
  );

  const resetDemoState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBalances(INITIAL_BALANCES);
    setP2pOffers(INITIAL_P2P_OFFERS);
    setP2pOrders([]);
    setSpotOrders(INITIAL_SPOT_ORDERS);
    setTradeHistory(INITIAL_TRADE_EXECUTIONS);
    setEarnPositions(INITIAL_EARN_POSITIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setPaymentMethods(INITIAL_PAYMENT_METHODS);
    notify('Account balances & demo orders reset to defaults', 'info');
  }, [notify]);

  return (
    <ExchangeContext.Provider
      value={{
        activeTab,
        setActiveTab,
        authPage,
        prefillEmail,
        openAuthPage,
        closeAuthPage,
        currentUser,
        loginUser,
        signupUser,
        loginDemo,
        logoutUser,
        selectedSpotPair,
        setSelectedSpotPair,
        theme,
        toggleTheme,
        fiat,
        setFiat,
        hideBalances,
        toggleHideBalances,
        liveFeedEnabled,
        toggleLiveFeed,
        markets,
        candlesBySymbol,
        balances,
        totalPortfolioUsd,
        p2pOffers,
        p2pOrders,
        spotOrders,
        tradeHistory,
        earnPositions,
        transactions,
        paymentMethods,
        toast,
        notify,
        depositModalOpen,
        setDepositModalOpen,
        placeSpotOrder,
        cancelSpotOrder,
        convertAssets,
        createP2POrder,
        markP2POrderPaid,
        releaseP2POrder,
        cancelP2POrder,
        appealP2POrder,
        sendP2PChatMessage,
        createP2PAd,
        toggleP2PAdStatus,
        deleteP2PAd,
        randomizeP2PRates,
        addPaymentMethod,
        removePaymentMethod,
        depositFunds,
        withdrawFunds,
        transferFunds,
        subscribeEarn,
        redeemEarn,
        resetDemoState,
      }}
    >
      {children}
    </ExchangeContext.Provider>
  );
};

export function useExchange() {
  const ctx = useContext(ExchangeContext);
  if (!ctx) throw new Error('useExchange must be used inside ExchangeProvider');
  return ctx;
}

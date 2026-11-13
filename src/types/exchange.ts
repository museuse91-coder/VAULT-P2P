export type NavTab = 'home' | 'markets' | 'spot' | 'p2p' | 'earn' | 'wallet';

export type AuthMode = 'login' | 'signup';

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  createdAt: number;
}

export type FiatCurrency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'INR' | 'NGN';

export type CryptoSymbol =
  | 'USDT'
  | 'USDC'
  | 'BTC'
  | 'ETH'
  | 'BNB'
  | 'SOL'
  | 'XRP'
  | 'ADA'
  | 'DOGE'
  | 'AVAX';

export interface MarketAsset {
  symbol: CryptoSymbol;
  name: string;
  category: 'Layer 1' | 'Stablecoin' | 'Exchange' | 'Payments' | 'DeFi';
  price: number; // USD price
  change24h: number; // percentage
  high24h: number;
  low24h: number;
  volume24h: number; // in USD
  marketCap: number; // in USD
  sparkline: number[];
  networks: { name: string; fee: number; minWithdraw: number; eta: string }[];
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface RecentMarketTrade {
  id: string;
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
}

export type SpotOrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';
export type TradeSide = 'BUY' | 'SELL';

export interface SpotOrder {
  id: string;
  pair: string; // e.g. BTC/USDT
  baseAsset: CryptoSymbol;
  quoteAsset: CryptoSymbol;
  side: TradeSide;
  type: SpotOrderType;
  price: number;
  stopPrice?: number;
  amount: number;
  filled: number;
  total: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: number;
}

export interface SpotTradeExecution {
  id: string;
  orderId: string;
  pair: string;
  side: TradeSide;
  price: number;
  amount: number;
  fee: number;
  feeAsset: CryptoSymbol;
  total: number;
  timestamp: number;
}

export type PaymentMethodType =
  | 'Bank Transfer'
  | 'Wise'
  | 'Revolut'
  | 'SEPA Instant'
  | 'Zelle'
  | 'UPI'
  | 'Faster Payments'
  | 'PayPal';

export interface UserPaymentMethod {
  id: string;
  type: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  bankOrProvider: string;
}

export interface P2POffer {
  id: string;
  /**
   * 'SELL' means the merchant is selling crypto (user clicks "Buy").
   * 'BUY' means the merchant is buying crypto (user clicks "Sell").
   */
  merchantSide: 'SELL' | 'BUY';
  merchantId: string;
  merchantName: string;
  isVerified: boolean;
  isOnline: boolean;
  isUserAd?: boolean;
  completedOrders: number;
  completionRate: number; // e.g. 99.4
  avgReleaseMinutes: number;
  asset: CryptoSymbol;
  fiat: FiatCurrency;
  price: number; // fiat price per 1 crypto unit
  availableAmount: number;
  minLimit: number; // fiat
  maxLimit: number; // fiat
  paymentMethods: PaymentMethodType[];
  paymentWindowMinutes: number;
  terms: string;
}

export type P2POrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID_AWAITING_RELEASE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'APPEAL';

export interface P2PChatMessage {
  id: string;
  sender: 'USER' | 'COUNTERPARTY' | 'SYSTEM';
  text: string;
  timestamp: number;
}

export interface P2POrder {
  id: string;
  offerId: string;
  userSide: 'BUY' | 'SELL'; // BUY = user buying crypto from seller; SELL = user selling crypto to buyer
  counterpartyName: string;
  counterpartyVerified: boolean;
  asset: CryptoSymbol;
  fiat: FiatCurrency;
  price: number;
  cryptoAmount: number;
  fiatAmount: number;
  paymentMethod: PaymentMethodType;
  paymentDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    referenceCode: string;
  };
  status: P2POrderStatus;
  createdAt: number;
  expiresAt: number;
  messages: P2PChatMessage[];
}

export interface EarnProduct {
  id: string;
  asset: CryptoSymbol;
  type: 'FLEXIBLE' | 'LOCKED';
  durationDays: number; // 0 for flexible
  apr: number; // e.g. 6.8
  minAmount: number;
}

export interface EarnPosition {
  id: string;
  productId: string;
  asset: CryptoSymbol;
  type: 'FLEXIBLE' | 'LOCKED';
  durationDays: number;
  apr: number;
  principal: number;
  accruedYield: number;
  startedAt: number;
  status: 'ACTIVE' | 'REDEEMED';
}

export interface WalletBalance {
  spot: number;
  spotLocked: number;
  funding: number;
  fundingLocked: number;
}

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'P2P_BUY' | 'P2P_SELL' | 'CONVERT' | 'EARN_STAKE' | 'EARN_REDEEM';
  asset: CryptoSymbol;
  amount: number;
  details: string;
  status: 'COMPLETED' | 'PENDING';
  timestamp: number;
}

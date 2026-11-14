import { CryptoSymbol, FiatCurrency } from '../types/exchange';
import { FIAT_RATES } from '../data/seedData';

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 10) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

export function formatCrypto(amount: number, symbol?: CryptoSymbol): string {
  if (symbol === 'USDT' || symbol === 'USDC') {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (symbol === 'BTC' || symbol === 'ETH') {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  if (amount >= 1000) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function formatCompactUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatCompactFiat(usdValue: number, fiat: FiatCurrency): string {
  const info = FIAT_RATES[fiat];
  const converted = usdValue * info.rateFromUsd;
  if (fiat === 'INR') {
    if (converted >= 1e7) return `₹${(converted / 1e7).toFixed(2)} Cr`;
    if (converted >= 1e5) return `₹${(converted / 1e5).toFixed(2)} L`;
    return `₹${converted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (converted >= 1e12) return `${info.symbol}${(converted / 1e12).toFixed(2)}T`;
  if (converted >= 1e9) return `${info.symbol}${(converted / 1e9).toFixed(2)}B`;
  if (converted >= 1e6) return `${info.symbol}${(converted / 1e6).toFixed(2)}M`;
  if (converted >= 1e3) return `${info.symbol}${(converted / 1e3).toFixed(1)}K`;
  return `${info.symbol}${converted.toFixed(2)}`;
}

export function formatFiat(amount: number, fiat: FiatCurrency): string {
  const info = FIAT_RATES[fiat];
  const locale = fiat === 'INR' ? 'en-IN' : 'en-US';
  const digits = fiat === 'NGN' ? 0 : fiat === 'INR' ? (amount < 200 ? 2 : 0) : 2;
  return `${info.symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatOrderLimit(min: number, max: number, fiat: FiatCurrency): string {
  const locale = fiat === 'INR' ? 'en-IN' : 'en-US';
  const minStr = min.toLocaleString(locale, { maximumFractionDigits: 2 });
  const maxStr = max.toLocaleString(locale, { maximumFractionDigits: 2 });
  return `${minStr} ${fiat} to ${maxStr} ${fiat}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

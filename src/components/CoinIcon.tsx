import React from 'react';
import { CryptoSymbol } from '../types/exchange';

const COIN_STYLES: Record<CryptoSymbol, { bg: string; fg: string; glyph: string }> = {
  BTC: { bg: '#F7931A', fg: '#FFFFFF', glyph: '₿' },
  ETH: { bg: '#627EEA', fg: '#FFFFFF', glyph: 'Ξ' },
  USDT: { bg: '#26A17B', fg: '#FFFFFF', glyph: '₮' },
  USDC: { bg: '#2775CA', fg: '#FFFFFF', glyph: '$' },
  BNB: { bg: '#F0B90B', fg: '#0B0E11', glyph: 'B' },
  SOL: { bg: '#14F195', fg: '#0B0E11', glyph: 'S' },
  XRP: { bg: '#23292F', fg: '#FFFFFF', glyph: 'X' },
  ADA: { bg: '#0033AD', fg: '#FFFFFF', glyph: 'A' },
  DOGE: { bg: '#C2A633', fg: '#FFFFFF', glyph: 'Ð' },
  AVAX: { bg: '#E84142', fg: '#FFFFFF', glyph: '▲' },
};

export const CoinIcon: React.FC<{ symbol: CryptoSymbol; size?: number }> = ({ symbol, size = 28 }) => {
  const style = COIN_STYLES[symbol] ?? { bg: '#475569', fg: '#FFFFFF', glyph: symbol[0] };
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display font-bold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: style.bg,
        color: style.fg,
        fontSize: Math.round(size * 0.46),
      }}
      aria-hidden="true"
    >
      {style.glyph}
    </span>
  );
};

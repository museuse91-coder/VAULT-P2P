import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Candle } from '../types/exchange';
import { formatPrice } from '../utils/format';

interface CandlestickChartProps {
  symbol: string;
  candles: Candle[];
  isDark: boolean;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'] as const;

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ symbol, candles, isDark }) => {
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>('1H');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 700, height: 360 });

  // Derive timeframe-adjusted candles cleanly
  const displayCandles = useMemo(() => {
    if (candles.length === 0) return [];
    if (timeframe === '1H') return candles;
    const factor =
      timeframe === '1m' ? 0.25 : timeframe === '5m' ? 0.45 : timeframe === '15m' ? 0.7 : timeframe === '4H' ? 1.4 : 2.1;
    const base = candles[0].open;
    return candles.map((c, idx) => {
      const offset = (c.close - base) * factor;
      const open = idx === 0 ? c.open : base + (candles[idx - 1].close - base) * factor;
      const close = base + offset;
      const spread = (c.high - c.low) * factor;
      const high = Math.max(open, close) + spread * 0.45;
      const low = Math.max(0.0001, Math.min(open, close) - spread * 0.45);
      return { ...c, open, high, low, close };
    });
  }, [candles, timeframe]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(280, Math.floor(entry.contentRect.height));
        setSize({ width: w, height: h });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    const padLeft = 12;
    const padRight = 68;
    const padTop = 18;
    const padBottom = 26;
    const chartW = size.width - padLeft - padRight;
    const totalH = size.height - padTop - padBottom;
    const priceH = totalH * 0.78;
    const volH = totalH * 0.18;
    const volTop = padTop + priceH + totalH * 0.04;

    ctx.clearRect(0, 0, size.width, size.height);

    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;
    for (const c of displayCandles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxV) maxV = c.volume;
    }
    const pPad = (maxP - minP) * 0.08 || 1;
    minP -= pPad;
    maxP += pPad;

    const yForPrice = (p: number) => padTop + ((maxP - p) / (maxP - minP)) * priceH;
    const gridColor = isDark ? 'rgba(43, 49, 57, 0.75)' : 'rgba(226, 232, 240, 0.9)';
    const textColor = isDark ? '#848E9C' : '#64748B';

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';

    const rows = 5;
    for (let i = 0; i <= rows; i++) {
      const y = padTop + (priceH / rows) * i;
      const pVal = maxP - ((maxP - minP) / rows) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, Math.round(y) + 0.5);
      ctx.lineTo(padLeft + chartW, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillText(formatPrice(pVal), padLeft + chartW + 6, y + 4);
    }

    const step = chartW / displayCandles.length;
    const candleW = Math.max(2, Math.min(10, step * 0.65));

    // Candles + Volume
    displayCandles.forEach((c, idx) => {
      const x = padLeft + idx * step + step / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? '#0ECB81' : '#F6465D';

      // Volume bar
      const vBarH = maxV > 0 ? (c.volume / maxV) * volH : 0;
      ctx.fillStyle = isUp ? 'rgba(14, 203, 129, 0.28)' : 'rgba(246, 70, 93, 0.28)';
      ctx.fillRect(x - candleW / 2, volTop + volH - vBarH, candleW, vBarH);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yForPrice(c.high));
      ctx.lineTo(x, yForPrice(c.low));
      ctx.stroke();

      // Body
      const yOpen = yForPrice(c.open);
      const yClose = yForPrice(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // MA(7) & MA(25)
    const drawMA = (period: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      let started = false;
      for (let i = period - 1; i < displayCandles.length; i++) {
        let sum = 0;
        for (let k = 0; k < period; k++) sum += displayCandles[i - k].close;
        const avg = sum / period;
        const x = padLeft + i * step + step / 2;
        const y = yForPrice(avg);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };
    drawMA(7, '#F0B90B');
    drawMA(25, '#8B5CF6');

    // Last price dashed line
    const last = displayCandles[displayCandles.length - 1];
    const lastY = yForPrice(last.close);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = last.close >= last.open ? '#0ECB81' : '#F6465D';
    ctx.beginPath();
    ctx.moveTo(padLeft, lastY);
    ctx.lineTo(padLeft + chartW, lastY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = last.close >= last.open ? '#0ECB81' : '#F6465D';
    ctx.fillRect(padLeft + chartW + 2, lastY - 9, 64, 18);
    ctx.fillStyle = '#0B0E11';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(formatPrice(last.close), padLeft + chartW + 5, lastY + 3);

    // Crosshair on hover
    if (hoverIdx !== null && displayCandles[hoverIdx]) {
      const c = displayCandles[hoverIdx];
      const cx = padLeft + hoverIdx * step + step / 2;
      const cy = yForPrice(c.close);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isDark ? 'rgba(234, 236, 239, 0.35)' : 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx, padTop);
      ctx.lineTo(cx, padTop + totalH);
      ctx.moveTo(padLeft, cy);
      ctx.lineTo(padLeft + chartW, cy);
      ctx.stroke();
      ctx.restore();
    }
  }, [displayCandles, size, isDark, hoverIdx]);

  const activeCandle =
    hoverIdx !== null && displayCandles[hoverIdx]
      ? displayCandles[hoverIdx]
      : displayCandles[displayCandles.length - 1];

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 12;
    const chartW = size.width - 12 - 68;
    if (x < 0 || x > chartW || displayCandles.length === 0) {
      setHoverIdx(null);
      return;
    }
    const idx = Math.min(displayCandles.length - 1, Math.max(0, Math.floor((x / chartW) * displayCandles.length)));
    setHoverIdx(idx);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-[#2B3139]">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                timeframe === tf
                  ? 'bg-slate-200 dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                  : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {activeCandle && (
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-500 dark:text-[#848E9C] tabular-nums">
            <span className="text-slate-700 dark:text-[#EAECEF] font-semibold">{symbol}/USDT</span>
            <span>O <strong className="text-slate-900 dark:text-[#EAECEF]">{formatPrice(activeCandle.open)}</strong></span>
            <span>H <strong className="text-[#0ECB81]">{formatPrice(activeCandle.high)}</strong></span>
            <span>L <strong className="text-[#F6465D]">{formatPrice(activeCandle.low)}</strong></span>
            <span>C <strong className="text-slate-900 dark:text-[#EAECEF]">{formatPrice(activeCandle.close)}</strong></span>
            <span className="text-[#F0B90B]">MA(7)</span>
            <span className="text-violet-400">MA(25)</span>
          </div>
        )}
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-[300px] w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="block w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
};

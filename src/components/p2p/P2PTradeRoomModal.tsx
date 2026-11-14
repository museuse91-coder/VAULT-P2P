import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, Send, ShieldCheck, X } from 'lucide-react';
import { useExchange } from '../../context/ExchangeContext';
import { P2POrder } from '../../types/exchange';
import { formatCrypto, formatFiat } from '../../utils/format';

interface P2PTradeRoomModalProps {
  orderId: string | null;
  onClose: () => void;
}

export const P2PTradeRoomModal: React.FC<P2PTradeRoomModalProps> = ({ orderId, onClose }) => {
  const {
    p2pOrders,
    markP2POrderPaid,
    releaseP2POrder,
    cancelP2POrder,
    appealP2POrder,
    sendP2PChatMessage,
  } = useExchange();

  const [chatText, setChatText] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [showAppealBox, setShowAppealBox] = useState(false);
  const [now, setNow] = useState(Date.now());

  const order: P2POrder | undefined = p2pOrders.find((o) => o.id === orderId);

  useEffect(() => {
    if (!orderId) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [orderId]);

  if (!order) return null;

  const remainingSec = Math.max(0, Math.floor((order.expiresAt - now) / 1000));
  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    sendP2PChatMessage(order.id, chatText);
    setChatText('');
  };

  const handleAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    appealP2POrder(order.id, appealReason);
    setAppealReason('');
    setShowAppealBox(false);
  };

  const stepIndex =
    order.status === 'PENDING_PAYMENT'
      ? 1
      : order.status === 'PAID_AWAITING_RELEASE' || order.status === 'APPEAL'
        ? 2
        : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2.5 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-[#2B3139] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-[#EAECEF]">
                {order.userSide === 'BUY' ? `Buy ${order.asset}` : `Sell ${order.asset}`} · {order.id}
              </h2>
              <span
                className={`text-xs font-semibold ${
                  order.status === 'COMPLETED'
                    ? 'text-[#0ECB81]'
                    : order.status === 'CANCELLED'
                      ? 'text-slate-400'
                      : order.status === 'APPEAL'
                        ? 'text-[#F6465D]'
                        : 'text-[#F0B90B]'
                }`}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#848E9C] mt-0.5">
              Counterparty: {order.counterpartyName} {order.counterpartyVerified ? '· Verified Merchant' : ''}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
              <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-[#F0B90B]">
                <Clock className="w-4 h-4" />
                <span>{mins}:{secs}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-500 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
              aria-label="Close trade room"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Step Escrow Progress */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#14171C] grid grid-cols-3 gap-4 text-xs">
          <div className={`font-medium ${stepIndex >= 1 ? 'text-slate-900 dark:text-[#EAECEF]' : 'text-slate-400'}`}>
            1. Escrow Locked
          </div>
          <div className={`font-medium ${stepIndex >= 2 ? 'text-slate-900 dark:text-[#EAECEF]' : 'text-slate-400'}`}>
            2. Fiat Payment Marked
          </div>
          <div className={`font-medium ${order.status === 'COMPLETED' ? 'text-[#0ECB81]' : 'text-slate-400'}`}>
            3. {order.status === 'CANCELLED' ? 'Cancelled' : 'Crypto Released'}
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-[#2B3139]">
          {/* Left: Payment & Escrow Controls */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200 dark:border-[#2B3139]">
              <div>
                <p className="text-xs text-slate-500 dark:text-[#848E9C]">Fiat Amount</p>
                <p className="font-mono text-base font-bold text-slate-900 dark:text-[#EAECEF] mt-0.5">
                  {formatFiat(order.fiatAmount, order.fiat)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-[#848E9C]">Unit Price</p>
                <p className="font-mono text-base font-semibold text-slate-900 dark:text-[#EAECEF] mt-0.5">
                  {formatFiat(order.price, order.fiat)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-[#848E9C]">Crypto Quantity</p>
                <p className="font-mono text-base font-bold text-[#0ECB81] mt-0.5">
                  {formatCrypto(order.cryptoAmount, order.asset)} {order.asset}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-[#EAECEF]">
                  {order.paymentMethod} Settlement Details
                </span>
                <span className="inline-flex items-center gap-1 text-[#F0B90B]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vault Escrow Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 pt-1">
                <span className="text-slate-500 dark:text-[#848E9C]">Account Name</span>
                <span className="font-medium text-slate-900 dark:text-[#EAECEF] text-right">{order.paymentDetails.accountName}</span>

                <span className="text-slate-500 dark:text-[#848E9C]">Bank / Network</span>
                <span className="font-medium text-slate-900 dark:text-[#EAECEF] text-right">{order.paymentDetails.bankName}</span>

                <span className="text-slate-500 dark:text-[#848E9C]">Account / ID</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(order.paymentDetails.accountNumber)}
                  className="inline-flex items-center justify-end gap-1.5 font-mono text-slate-900 dark:text-[#EAECEF] hover:text-[#F0B90B] cursor-pointer"
                >
                  <span>{order.paymentDetails.accountNumber}</span>
                  <Copy className="w-3 h-3" />
                </button>

                <span className="text-slate-500 dark:text-[#848E9C]">Reference Code</span>
                <span className="font-mono font-semibold text-[#F0B90B] text-right">{order.paymentDetails.referenceCode}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {order.status === 'COMPLETED' ? (
              <div className="flex items-center gap-3 p-4 rounded-md border border-[#0ECB81]/30 bg-[#0ECB81]/10 text-sm text-[#0ECB81]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  Escrow settled. {formatCrypto(order.cryptoAmount, order.asset)} {order.asset} has been transferred.
                </span>
              </div>
            ) : order.status === 'CANCELLED' ? (
              <div className="p-4 rounded-md border border-slate-200 dark:border-[#2B3139] text-sm text-slate-500 dark:text-[#848E9C]">
                This order was cancelled and any locked crypto returned to Funding Wallet.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {order.userSide === 'BUY' && order.status === 'PENDING_PAYMENT' && (
                    <button
                      type="button"
                      onClick={() => markP2POrderPaid(order.id)}
                      className="px-4 py-2.5 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold cursor-pointer"
                    >
                      Transferred, Notify Seller
                    </button>
                  )}

                  {order.userSide === 'BUY' && order.status === 'PAID_AWAITING_RELEASE' && (
                    <div className="text-xs text-[#F0B90B] font-medium">
                      Seller notified — verifying fiat receipt & releasing escrow automatically...
                    </div>
                  )}

                  {order.userSide === 'SELL' && (
                    <button
                      type="button"
                      onClick={() => releaseP2POrder(order.id)}
                      disabled={order.status === 'PENDING_PAYMENT'}
                      className="px-4 py-2.5 rounded-md bg-[#0ECB81] hover:bg-[#0BB574] text-[#0B0E11] text-sm font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {order.status === 'PENDING_PAYMENT'
                        ? 'Waiting for Buyer Payment...'
                        : 'Payment Received, Release Crypto'}
                    </button>
                  )}

                  {order.status === 'PENDING_PAYMENT' && (
                    <button
                      type="button"
                      onClick={() => cancelP2POrder(order.id)}
                      className="px-4 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] text-sm font-medium text-slate-700 dark:text-[#EAECEF] hover:bg-slate-100 dark:hover:bg-[#2B3139] cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}

                  {order.status !== 'APPEAL' && (
                    <button
                      type="button"
                      onClick={() => setShowAppealBox((s) => !s)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium text-[#F6465D] hover:bg-[#F6465D]/10 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Raise Appeal</span>
                    </button>
                  )}
                </div>

                {showAppealBox && (
                  <form onSubmit={handleAppeal} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Describe payment issue or mismatch..."
                      className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-md bg-[#F6465D] text-white text-xs font-semibold cursor-pointer"
                    >
                      Submit Appeal
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: Live Counterparty Chat */}
          <div className="lg:col-span-5 flex flex-col h-[380px] lg:h-auto bg-slate-50/50 dark:bg-[#14171C]">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2B3139] text-xs font-semibold text-slate-700 dark:text-[#EAECEF]">
              Escrow Trade Chat
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {order.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'USER'
                      ? 'items-end'
                      : m.sender === 'SYSTEM'
                        ? 'items-center'
                        : 'items-start'
                  }`}
                >
                  {m.sender === 'SYSTEM' ? (
                    <div className="px-3 py-1.5 rounded bg-slate-200/70 dark:bg-[#2B3139] text-[11px] text-slate-600 dark:text-[#848E9C] text-center max-w-[90%]">
                      {m.text}
                    </div>
                  ) : (
                    <div
                      className={`px-3.5 py-2 rounded-lg text-xs max-w-[85%] leading-relaxed ${
                        m.sender === 'USER'
                          ? 'bg-[#F0B90B] text-[#0B0E11] font-medium'
                          : 'bg-white dark:bg-[#1E2329] border border-slate-200 dark:border-[#2B3139] text-slate-800 dark:text-[#EAECEF]'
                      }`}
                    >
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-[#2B3139] flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Message counterparty..."
                className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

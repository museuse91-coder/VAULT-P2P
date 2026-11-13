import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { NavTab } from '../types/exchange';

const DIRECT_TABS: { id: NavTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'markets', label: 'Markets' },
  { id: 'spot', label: 'Spot' },
  { id: 'p2p', label: 'P2P' },
];

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    authPage,
    openAuthPage,
    currentUser,
    logoutUser,
    setDepositModalOpen,
  } = useExchange();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    setMoreOpen(false);
  };

  const isMoreActive = authPage === null && (activeTab === 'earn' || activeTab === 'wallet');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-[#2B3139] bg-white/95 dark:bg-[#0B0E11]/95 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B] rounded"
        >
          Vault P2P
        </button>

        {/* Zone 2: Single-line navigation links + More dropdown */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {DIRECT_TABS.map((item) => {
            const active = authPage === null && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B] ${
                  active
                    ? 'text-slate-900 dark:text-[#EAECEF]'
                    : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F0B90B]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Binance-style More Tab Dropdown */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`relative py-5 inline-flex items-center gap-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B] ${
                isMoreActive || moreOpen
                  ? 'text-slate-900 dark:text-[#EAECEF]'
                  : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              {isMoreActive && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F0B90B]"
                  aria-hidden="true"
                />
              )}
            </button>

            {moreOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-80 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] shadow-xl p-3 grid grid-cols-1 gap-1 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect('wallet')}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#2B3139] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#EAECEF]">Wallet & Assets</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Spot, Funding (P2P), Transfer & Withdraw</div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect('earn')}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#2B3139] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#EAECEF]">Simple Earn</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Flexible & Locked APR staking vaults</div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect('spot')}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#2B3139] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#EAECEF]">Spot & Instant Convert</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Candlesticks, depth order book & 0-fee swap</div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect('p2p')}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#2B3139] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#EAECEF]">P2P Merchant Desk</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#848E9C]">Buyers, sellers, post ads & escrow rooms</div>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-[#2B3139]" />

                {currentUser ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      logoutUser();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#F6465D]/10 text-xs font-semibold text-[#F6465D] cursor-pointer"
                  >
                    Log Out ({currentUser.fullName})
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        openAuthPage('login');
                      }}
                      className="flex-1 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        openAuthPage('signup');
                      }}
                      className="flex-1 py-2 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-xs font-semibold text-[#0B0E11] cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setDepositModalOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-[#0B0E11] bg-[#F0B90B] hover:bg-[#D9A708] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B]"
            >
              Deposit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openAuthPage('login');
              }}
              className="px-4 py-2 text-sm font-semibold text-[#0B0E11] bg-[#F0B90B] hover:bg-[#D9A708] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B]"
            >
              Log In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-md text-slate-600 dark:text-[#848E9C] hover:bg-slate-100 dark:hover:bg-[#1E2329] cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] px-4 py-3 space-y-1">
          {[...DIRECT_TABS, { id: 'earn' as NavTab, label: 'Earn' }, { id: 'wallet' as NavTab, label: 'Wallet' }].map((item) => {
            const active = authPage === null && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-100 dark:bg-[#1E2329] text-slate-900 dark:text-[#EAECEF]'
                    : 'text-slate-600 dark:text-[#848E9C]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {!currentUser && (
            <div className="pt-2 border-t border-slate-200 dark:border-[#2B3139] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthPage('login');
                }}
                className="flex-1 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthPage('signup');
                }}
                className="flex-1 py-2 rounded-md bg-[#F0B90B] text-xs font-semibold text-[#0B0E11] cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

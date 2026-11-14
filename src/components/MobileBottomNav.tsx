import React from 'react';
import { BarChart2, CandlestickChart, Home, Users, Wallet } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';
import { NavTab } from '../types/exchange';

const BOTTOM_TABS: { id: NavTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'markets', label: 'Markets', Icon: BarChart2 },
  { id: 'spot', label: 'Spot', Icon: CandlestickChart },
  { id: 'p2p', label: 'P2P', Icon: Users },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
];

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, authPage } = useExchange();

  return (
    <nav
      aria-label="Mobile app navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-[#2B3139] bg-white/95 dark:bg-[#0B0E11]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {BOTTOM_TABS.map(({ id, label, Icon }) => {
          const isActive = authPage === null && activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B90B] ${
                isActive
                  ? 'text-[#F0B90B]'
                  : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-[#F0B90B] rounded-b" aria-hidden="true" />
              )}
              <Icon className="w-5 h-5" />
              <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

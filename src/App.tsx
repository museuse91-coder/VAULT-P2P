import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { ExchangeProvider, useExchange } from './context/ExchangeContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DepositModal } from './components/DepositModal';
import { AuthView } from './views/AuthView';
import { HomeView } from './views/HomeView';
import { MarketsView } from './views/MarketsView';
import { SpotView } from './views/SpotView';
import { P2PView } from './views/P2PView';
import { EarnView } from './views/EarnView';
import { WalletView } from './views/WalletView';

const ExchangeShell: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    authPage,
    openAuthPage,
    currentUser,
    logoutUser,
    toast,
    theme,
    toggleTheme,
  } = useExchange();

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B0E11] dark:text-[#EAECEF] transition-colors pb-16 md:pb-0">
      <Navbar />

      <main className="flex-1 w-full">
        {authPage !== null ? (
          <AuthView />
        ) : (
          <>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'markets' && <MarketsView />}
            {activeTab === 'spot' && <SpotView />}
            {activeTab === 'p2p' && <P2PView />}
            {activeTab === 'earn' && <EarnView />}
            {activeTab === 'wallet' && <WalletView />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#0B0E11] mt-8 sm:mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#848E9C] text-center sm:text-left">
          <div>Vault P2P Exchange · Zero-Fee Peer-to-Peer Escrow & Spot Trading</div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-5">
            <button type="button" onClick={() => setActiveTab('home')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              Home
            </button>
            <button type="button" onClick={() => setActiveTab('markets')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              Markets
            </button>
            <button type="button" onClick={() => setActiveTab('spot')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              Spot
            </button>
            <button type="button" onClick={() => setActiveTab('p2p')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              P2P
            </button>
            <button type="button" onClick={() => setActiveTab('earn')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              Earn
            </button>
            <button type="button" onClick={() => setActiveTab('wallet')} className="hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer">
              Wallet
            </button>
            {currentUser ? (
              <button type="button" onClick={logoutUser} className="hover:text-[#F6465D] cursor-pointer">
                Log Out ({currentUser.fullName})
              </button>
            ) : (
              <>
                <button type="button" onClick={() => openAuthPage('login')} className="hover:text-[#F0B90B] cursor-pointer">
                  Log In
                </button>
                <button type="button" onClick={() => openAuthPage('signup')} className="hover:text-[#F0B90B] cursor-pointer">
                  Sign Up
                </button>
              </>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
      <DepositModal />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 px-4 py-3 rounded-md border text-xs font-semibold shadow-lg text-center sm:text-left ${
            toast.tone === 'success'
              ? 'bg-white dark:bg-[#181A20] border-[#0ECB81] text-[#0ECB81]'
              : toast.tone === 'error'
                ? 'bg-white dark:bg-[#181A20] border-[#F6465D] text-[#F6465D]'
                : 'bg-white dark:bg-[#181A20] border-[#F0B90B] text-slate-900 dark:text-[#EAECEF]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ExchangeProvider>
      <ExchangeShell />
    </ExchangeProvider>
  );
}

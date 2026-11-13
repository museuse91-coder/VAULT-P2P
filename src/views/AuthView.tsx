import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';

export const AuthView: React.FC = () => {
  const { authPage, prefillEmail, openAuthPage, closeAuthPage, loginUser, signupUser, loginDemo } = useExchange();
  const mode = authPage === 'signup' ? 'signup' : 'login';

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState(prefillEmail || '');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showSignupPw, setShowSignupPw] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pwChecks = useMemo(() => {
    return {
      length: signupPassword.length >= 8,
      upper: /[A-Z]/.test(signupPassword),
      number: /[0-9]/.test(signupPassword),
    };
  }, [signupPassword]);

  const pwStrengthLabel = useMemo(() => {
    const score = Number(pwChecks.length) + Number(pwChecks.upper) + Number(pwChecks.number);
    if (!signupPassword) return { label: '', color: 'text-slate-400' };
    if (score <= 1) return { label: 'Weak', color: 'text-[#F6465D]' };
    if (score === 2) return { label: 'Fair', color: 'text-[#F0B90B]' };
    return { label: 'Strong', color: 'text-[#0ECB81]' };
  }, [pwChecks, signupPassword]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginUser(loginEmail, loginPassword);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (signupPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Please accept the Vault P2P Terms of Service to continue.');
      return;
    }
    const res = signupUser({ fullName, email: signupEmail, password: signupPassword });
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <button
          type="button"
          onClick={closeAuthPage}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Exchange</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left: Exchange Credentials & Escrow Overview */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#F0B90B]">Vault P2P Account Access</p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#EAECEF] [text-wrap:balance]">
                {mode === 'login'
                  ? 'Sign in to trade P2P escrow and spot markets.'
                  : 'Create your verified Vault P2P trading account.'}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-[#848E9C] max-w-xl">
                Access zero-fee peer-to-peer liquidity across 6 fiat currencies, live spot order books, instant zero-fee conversions, and flexible staking vaults from one unified wallet.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#2B3139] grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                  <ShieldCheck className="w-4 h-4 text-[#0ECB81]" />
                  <span>Protected P2P Escrow</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                  Seller crypto remains locked in Vault Escrow until fiat settlement is verified by both parties.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#EAECEF]">
                  <Lock className="w-4 h-4 text-[#F0B90B]" />
                  <span>Spot & Funding Segregation</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-[#848E9C]">
                  Transfer instantly at zero fee between your Spot trading balance and P2P Funding wallet.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#2B3139] grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-[#EAECEF]">0%</div>
              <div className="text-slate-500 dark:text-[#848E9C] mt-0.5">P2P Taker Fee</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-[#EAECEF]">10+</div>
              <div className="text-slate-500 dark:text-[#848E9C] mt-0.5">Spot & P2P Assets</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-[#EAECEF]">6</div>
              <div className="text-slate-500 dark:text-[#848E9C] mt-0.5">Fiat Currencies</div>
            </div>
          </div>
        </div>

        {/* Right: Login / Sign Up Form Panel */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-[#2B3139] bg-white dark:bg-[#181A20] p-6 sm:p-8">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-100 dark:bg-[#0B0E11] border border-slate-200 dark:border-[#2B3139] mb-6">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                openAuthPage('login');
              }}
              className={`py-2.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                  : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                openAuthPage('signup');
              }}
              className={`py-2.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#2B3139] text-slate-900 dark:text-[#EAECEF]'
                  : 'text-slate-500 dark:text-[#848E9C] hover:text-slate-900 dark:hover:text-[#EAECEF]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 px-4 py-3 rounded-md border border-[#F6465D]/40 bg-[#F6465D]/10 text-xs font-medium text-[#F6465D]"
            >
              {errorMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-xs font-medium text-slate-600 dark:text-[#848E9C]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('alex.mercer@vaultp2p.io');
                      setLoginPassword('VaultP2P@2026');
                    }}
                    className="text-xs font-medium text-[#F0B90B] hover:underline cursor-pointer"
                  >
                    Fill Demo Credentials
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-[#EAECEF] cursor-pointer"
                    aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#848E9C] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="accent-[#F0B90B]"
                />
                <span>Keep me signed in on this browser</span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold transition-colors cursor-pointer"
              >
                Log In
              </button>

              <div className="relative py-2 flex items-center">
                <div className="flex-1 border-t border-slate-200 dark:border-[#2B3139]" />
                <span className="px-3 text-[11px] text-slate-400">or</span>
                <div className="flex-1 border-t border-slate-200 dark:border-[#2B3139]" />
              </div>

              <button
                type="button"
                onClick={loginDemo}
                className="w-full py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] hover:border-[#F0B90B] text-xs font-semibold text-slate-900 dark:text-[#EAECEF] transition-colors cursor-pointer"
              >
                Continue with Demo Account (Alex Mercer)
              </button>

              <p className="text-center text-xs text-slate-500 dark:text-[#848E9C] pt-2">
                New to Vault P2P?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    openAuthPage('signup');
                  }}
                  className="font-semibold text-[#F0B90B] hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                  Full Name (Displayed on Verified P2P Desk)
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Jordan Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signup-password" className="text-xs font-medium text-slate-600 dark:text-[#848E9C]">
                      Password
                    </label>
                    {pwStrengthLabel.label && (
                      <span className={`text-[11px] font-semibold ${pwStrengthLabel.color}`}>
                        {pwStrengthLabel.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPw ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-9 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPw((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-[#EAECEF] cursor-pointer"
                      aria-label={showSignupPw ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type={showSignupPw ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] text-sm text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-[#848E9C]">
                <span className={`inline-flex items-center gap-1 ${pwChecks.length ? 'text-[#0ECB81]' : ''}`}>
                  <Check className="w-3 h-3" /> 8+ characters
                </span>
                <span className={`inline-flex items-center gap-1 ${pwChecks.upper ? 'text-[#0ECB81]' : ''}`}>
                  <Check className="w-3 h-3" /> Uppercase letter
                </span>
                <span className={`inline-flex items-center gap-1 ${pwChecks.number ? 'text-[#0ECB81]' : ''}`}>
                  <Check className="w-3 h-3" /> Number
                </span>
              </div>

              <div>
                <label htmlFor="signup-referral" className="block text-xs font-medium text-slate-600 dark:text-[#848E9C] mb-1.5">
                  Referral Code (Optional)
                </label>
                <input
                  id="signup-referral"
                  type="text"
                  placeholder="Enter invite code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#2B3139] bg-slate-50 dark:bg-[#0B0E11] font-mono text-xs text-slate-900 dark:text-[#EAECEF] focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-[#848E9C] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 accent-[#F0B90B]"
                />
                <span>
                  I agree to the Vault P2P Terms of Service, Escrow Rules, and AML Verification Policy.
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-md bg-[#F0B90B] hover:bg-[#D9A708] text-[#0B0E11] text-sm font-semibold transition-colors cursor-pointer"
              >
                Create Personal Account
              </button>

              <p className="text-center text-xs text-slate-500 dark:text-[#848E9C] pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    openAuthPage('login');
                  }}
                  className="font-semibold text-[#F0B90B] hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

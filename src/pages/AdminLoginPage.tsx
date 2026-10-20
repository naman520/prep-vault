import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useAdminAuth, DEFAULT_ADMIN_ID, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const { login, isAdmin, logout, adminUser } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after successful login
  const from = (location.state as any)?.from?.pathname || '/question-bank';

  const [idInput, setIdInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCredentialsHint, setShowCredentialsHint] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!idInput.trim()) {
      setErrorMessage('Please enter your Admin ID or Email.');
      return;
    }
    if (!passInput) {
      setErrorMessage('Please enter your Admin Password.');
      return;
    }

    const result = login(idInput, passInput);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleFillDemo = () => {
    setIdInput(DEFAULT_ADMIN_ID);
    setPassInput(DEFAULT_ADMIN_PASSWORD);
    setErrorMessage(null);
  };

  if (isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Admin Authenticated
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            You are logged in as <span className="font-semibold text-indigo-600 dark:text-indigo-400">{adminUser?.id}</span> with full administrative privileges to Question Bank & Storage.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/question-bank')}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 transition shadow-xs"
          >
            <Database className="w-4 h-4" />
            <span>Go to Question Bank & Storage</span>
          </button>

          <button
            onClick={() => logout()}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 transition"
          >
            Log Out of Admin Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-14 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
      {/* Icon & Title */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-4 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Administrator Access
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The <span className="font-semibold text-slate-700 dark:text-slate-200">Question Bank & Storage Manager</span> is restricted to administrators. Enter your credentials to unlock management tools.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Admin ID / Email
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoComplete="username"
              placeholder="e.g. admin"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Admin Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 transition shadow-xs active:scale-98"
        >
          <span>Unlock Administrator Access</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Admin Credentials helper toggle */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => setShowCredentialsHint(!showCredentialsHint)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition mx-auto"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{showCredentialsHint ? 'Hide Admin Credentials Info' : 'Show Admin Credentials'}</span>
        </button>

        {showCredentialsHint && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200">Pre-configured Admin Account:</span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Auto-fill
              </button>
            </div>
            <div className="font-mono text-[11px] space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 select-none">ID: </span>
                <span className="font-bold text-slate-900 dark:text-white">{DEFAULT_ADMIN_ID}</span>
                <span className="text-slate-400 select-none"> (or {DEFAULT_ADMIN_EMAIL})</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 select-none">Pass: </span>
                <span className="font-bold text-slate-900 dark:text-white">{DEFAULT_ADMIN_PASSWORD}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

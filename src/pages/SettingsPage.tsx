import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Type,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Lock,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import { useAdminAuth, DEFAULT_ADMIN_ID } from '../context/AdminAuthContext';
import type { AppSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, adminUser, logout } = useAdminAuth();
  const { theme, setTheme, brandName, setBrandName } = useTheme();

  const [inputBrand, setInputBrand] = useState(brandName);
  const [instantFeedback, setInstantFeedback] = useState(true);
  const [autoRevealExplanation, setAutoRevealExplanation] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(15);
  const [defaultQuestionCount, setDefaultQuestionCount] = useState(15);
  const [shuffleOptionsPractice, setShuffleOptionsPractice] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await db.settings.get('app-settings');
        if (s) {
          setInputBrand(s.brandName || 'PrepVault');
          setInstantFeedback(s.instantFeedback !== false);
          setAutoRevealExplanation(!!s.autoRevealExplanation);
          setDefaultDuration(s.defaultTestDurationMinutes || 15);
          setDefaultQuestionCount(s.defaultTestQuestionCount || 15);
          setShuffleOptionsPractice(!!s.shuffleOptionsInPractice);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await db.settings.put({
        id: 'app-settings',
        brandName: inputBrand.trim() || 'PrepVault',
        theme,
        instantFeedback,
        autoRevealExplanation,
        defaultTestDurationMinutes: defaultDuration,
        defaultTestQuestionCount: defaultQuestionCount,
        shuffleOptionsInPractice: shuffleOptionsPractice,
        shuffleOptionsInMockTest: true,
        keyboardShortcutsEnabled: true,
      });

      setBrandName(inputBrand.trim() || 'PrepVault');
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportBackup = async () => {
    try {
      const progress = await db.practiceProgress.toArray();
      const bookmarks = await db.bookmarks.toArray();
      const testResults = await db.testResults.toArray();
      const settings = await db.settings.get('app-settings');

      const backup = {
        exportedAt: Date.now(),
        version: '1.0.0',
        app: brandName,
        data: {
          practiceProgress: progress,
          bookmarks,
          testResults,
          settings,
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prepvault-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup failed:', err);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup.data) {
          alert('Invalid backup file format.');
          return;
        }

        await db.transaction('rw', db.practiceProgress, db.bookmarks, db.testResults, async () => {
          if (Array.isArray(backup.data.practiceProgress)) {
            await db.practiceProgress.clear();
            await db.practiceProgress.bulkPut(backup.data.practiceProgress);
          }
          if (Array.isArray(backup.data.bookmarks)) {
            await db.bookmarks.clear();
            await db.bookmarks.bulkPut(backup.data.bookmarks);
          }
          if (Array.isArray(backup.data.testResults)) {
            await db.testResults.clear();
            await db.testResults.bulkPut(backup.data.testResults);
          }
        });

        alert('Backup data successfully restored!');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to parse and restore backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllProgress = async () => {
    try {
      await db.practiceProgress.clear();
      await db.bookmarks.clear();
      await db.testResults.clear();
      await db.practiceSessions.clear();
      await db.activeTestSession.clear();

      setShowResetConfirm(false);
      alert('All practice progress, test results, and bookmarks have been reset.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to reset progress.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-500" />
          <span>Application Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Personalize branding, themes, testing preferences, and manage local data backups.
        </p>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Brand Name */}
        <div>
          <label htmlFor="brand-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Platform Brand Name
          </label>
          <div className="mt-2 flex gap-3">
            <div className="relative flex-1">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="brand-name-input"
                type="text"
                value={inputBrand}
                onChange={(e) => setInputBrand(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                placeholder="PrepVault"
              />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Brand name is configurable and displayed across the navigation bar, headers, and reports.
          </p>
        </div>

        {/* Color Theme Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Appearance & Theme
          </label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Practice Preferences */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Practice & Test Preferences
          </h2>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Instant Feedback
              </p>
              <p className="text-[11px] text-slate-500">
                Immediately highlight whether selected option is right or wrong upon selection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInstantFeedback(!instantFeedback)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                instantFeedback ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  instantFeedback ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Auto-Reveal Explanation
              </p>
              <p className="text-[11px] text-slate-500">
                Automatically display step-by-step explanations as soon as an answer is submitted.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRevealExplanation(!autoRevealExplanation)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                autoRevealExplanation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoRevealExplanation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            onClick={handleSaveSettings}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Data Backup & Restore Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-500" />
          <span>Data Backup & Portability</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your data lives exclusively in your browser’s IndexedDB. Export a JSON backup to transfer your progress to another device or browser.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2.5 text-xs font-bold transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Progress Backup</span>
          </button>

          <input
            type="file"
            ref={importFileInputRef}
            onChange={handleImportBackup}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2.5 text-xs font-bold transition"
          >
            <Upload className="w-4 h-4" />
            <span>Restore from Backup</span>
          </button>
        </div>
      </div>

      {/* Administrator & Storage Security */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Administrator & Question Bank Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The Question Bank & Storage Manager is restricted to verified administrators.
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              isAdmin
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            {isAdmin ? 'Admin Mode Active' : 'Standard User Mode'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAdmin
            ? `You are currently logged in as "${adminUser?.id || DEFAULT_ADMIN_ID}". You have unrestricted access to inspect IndexedDB storage quotas, import custom JSON question packs, and manage offline data.`
            : 'Question Bank & Storage Manager is currently hidden from standard users. Sign in with your Administrator credentials to manage question packs and local storage.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isAdmin ? (
            <>
              <button
                onClick={() => navigate('/question-bank')}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs"
              >
                <span>Open Question Bank & Storage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Exit Admin Mode</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/admin-login')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold transition shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In to Admin Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone: Reset Progress */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>Danger Zone</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Resetting clears all your practice histories, test scores, and bookmarks from local IndexedDB storage. Bundled question packs remain intact.
        </p>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/50 px-4 py-2 text-xs font-bold transition"
        >
          Reset All Learning Data
        </button>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Confirm Data Reset
                </h3>
                <p className="text-xs text-slate-500">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete all practice records, mock test attempts, and saved bookmarks?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllProgress}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2 text-xs font-bold"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

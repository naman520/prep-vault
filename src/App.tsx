import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AdminProtectedRoute } from './components/common/AdminProtectedRoute';
import { initializeDatabase } from './db/db';
import { getOrCreateDaily60Questions } from './services/dailyQuestionService';

import { DashboardPage } from './pages/DashboardPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { PracticePage } from './pages/PracticePage';
import { MockTestSetupPage } from './pages/MockTestSetupPage';
import { MockTestActivePage } from './pages/MockTestActivePage';
import { MockTestResultPage } from './pages/MockTestResultPage';
import { MockTestHistoryPage } from './pages/MockTestHistoryPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { SearchPage } from './pages/SearchPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { SettingsPage } from './pages/SettingsPage';
import { DailyChallengePage } from './pages/DailyChallengePage';
import { AdminLoginPage } from './pages/AdminLoginPage';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        // Automatically ensure today's 60 questions are seeded in the offline bank
        try {
          await getOrCreateDaily60Questions();
        } catch (dailyErr) {
          console.warn('Daily question pre-generation notice:', dailyErr);
        }
        setDbReady(true);
      })
      .catch((err) => {
        console.error('Database initialization failed:', err);
        setInitError('Failed to initialize local IndexedDB database.');
      });
  }, []);

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white font-sans">
        <div className="max-w-md rounded-2xl bg-slate-800 p-6 border border-rose-500/30 text-center">
          <h2 className="text-lg font-bold text-rose-400">Database Storage Error</h2>
          <p className="mt-2 text-sm text-slate-300">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Retry Launch
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wide text-indigo-300">
            Initializing PrepVault Offline Storage...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/mock-test" element={<MockTestSetupPage />} />
              <Route path="/mock-test/active" element={<MockTestActivePage />} />
              <Route path="/mock-test/result/:id" element={<MockTestResultPage />} />
              <Route path="/history" element={<MockTestHistoryPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/daily-challenge" element={<DailyChallengePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route
                path="/question-bank"
                element={
                  <AdminProtectedRoute>
                    <QuestionBankPage />
                  </AdminProtectedRoute>
                }
              />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}

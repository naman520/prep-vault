import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { db } from '../../db/db';

export const OfflineBadge: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [offlineCount, setOfflineCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await db.questions.count();
        setOfflineCount(count);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCount();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
        }`}
        title={isOnline ? 'Online - Database is synced locally' : 'Offline Mode Active - All core features work locally'}
      >
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        )}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <div
        className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        title="Total questions stored locally in your device IndexedDB"
      >
        <Database className="w-3.5 h-3.5 text-indigo-500" />
        <span>{offlineCount} Local Qs</span>
      </div>
    </div>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <WifiOff className="w-4 h-4 shrink-0 text-white" />
        <span className="text-white">
          <strong>Offline Mode Active:</strong> You are disconnected from the internet. All questions, practice sessions, mock tests, scoring, and bookmarks run completely from your local IndexedDB storage.
        </span>
      </div>
    </div>
  );
};

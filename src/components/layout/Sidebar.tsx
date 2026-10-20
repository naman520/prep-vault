import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  BookmarkCheck,
  History,
  Database,
  Settings,
  Sparkles,
  Search,
  Flame,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { isAdmin, logout, adminUser } = useAdminAuth();

  const baseNavItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/daily-challenge', label: 'Daily 60 Challenge', icon: Flame },
    { to: '/categories', label: 'Browse Topics', icon: Layers },
    { to: '/practice', label: 'Practice Mode', icon: GraduationCap },
    { to: '/mock-test', label: 'Mock Test Engine', icon: Sparkles },
    { to: '/bookmarks', label: 'Bookmarks', icon: BookmarkCheck },
    { to: '/history', label: 'Test History', icon: History },
    { to: '/search', label: 'Search Questions', icon: Search },
    // Question Bank is only accessible and visible to authenticated admins
    ...(isAdmin
      ? [{ to: '/question-bank', label: 'Question Bank & Storage', icon: Database, isAdminOnly: true }]
      : []),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-16 lg:pt-0 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>

          <nav className="space-y-1">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.isAdminOnly && (
                    <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      Admin
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Status & Offline Notice in Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          {isAdmin ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Admin Mode
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 truncate max-w-[100px]">
                    {adminUser?.id || 'admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  onCloseMobile();
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                title="Log out of Admin Mode"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            <NavLink
              to="/admin-login"
              onClick={onCloseMobile}
              className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin Portal</span>
              </div>
              <span className="text-[10px] text-slate-400">Sign in &rarr;</span>
            </NavLink>
          )}

          {/* 100% Offline Notice */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>Offline Ready</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              All question banks and storage persist locally in your browser.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

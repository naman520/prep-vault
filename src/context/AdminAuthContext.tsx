import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AdminUser {
  id: string;
  role: 'admin';
  loggedInAt: number;
}

interface AdminAuthContextType {
  isAdmin: boolean;
  adminUser: AdminUser | null;
  login: (id: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  defaultAdminId: string;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'prepvault_admin_auth';

// Default Admin Credentials
export const DEFAULT_ADMIN_ID = 'admin';
export const DEFAULT_ADMIN_EMAIL = 'admin@prepvault.local';
export const DEFAULT_ADMIN_PASSWORD = 'Admin@PrepVault2026!';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role === 'admin') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse admin session:', e);
    }
    return null;
  });

  const isAdmin = adminUser !== null;

  const login = (id: string, pass: string): { success: boolean; error?: string } => {
    const cleanId = id.trim().toLowerCase();
    const cleanPass = pass.trim();

    const isValidId = cleanId === DEFAULT_ADMIN_ID || cleanId === DEFAULT_ADMIN_EMAIL;
    const isValidPass = cleanPass === DEFAULT_ADMIN_PASSWORD;

    if (!isValidId) {
      return { success: false, error: 'Invalid Administrator ID or Email.' };
    }

    if (!isValidPass) {
      return { success: false, error: 'Invalid Administrator Password.' };
    }

    const session: AdminUser = {
      id: cleanId,
      role: 'admin',
      loggedInAt: Date.now(),
    };

    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.warn('Could not persist admin session to localStorage:', err);
    }

    setAdminUser(session);
    return { success: true };
  };

  const logout = () => {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch (err) {
      console.warn('Could not clear admin session:', err);
    }
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdmin,
        adminUser,
        login,
        logout,
        defaultAdminId: DEFAULT_ADMIN_ID,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

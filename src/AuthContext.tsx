import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchHero, MOCK_HEROES, type Hero } from '@/api/pik';

const KEY = 'codex.rootId';

interface AuthState {
  hero:         Hero | null;
  isLoading:    boolean;
  isRefreshing: boolean;
  isMock:       boolean;
  signIn:       (rootId: string, mockHero?: Hero) => Promise<void>;
  signOut:      () => void;
  refreshHero:  () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hero,         setHero]         = useState<Hero | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMock,       setIsMock]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) { setIsLoading(false); return; }
    fetchHero(stored)
      .then(h => { setHero(h); setIsMock(false); })
      .catch(() => {
        const mock = MOCK_HEROES.find(m => m.root_id === stored);
        if (mock) { setHero(mock); setIsMock(true); }
        else localStorage.removeItem(KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (rootId: string, mockHero?: Hero) => {
    localStorage.setItem(KEY, rootId);
    if (mockHero) { setHero(mockHero); setIsMock(true); return; }
    const h = await fetchHero(rootId);
    setHero(h); setIsMock(false);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY);
    setHero(null); setIsMock(false);
  }, []);

  const refreshHero = useCallback(async () => {
    if (!hero) return;
    setIsRefreshing(true);
    try {
      const h = await fetchHero(hero.root_id);
      setHero(h); setIsMock(false);
    } catch { /* keep existing */ }
    finally { setIsRefreshing(false); }
  }, [hero]);

  return (
    <Ctx.Provider value={{ hero, isLoading, isRefreshing, isMock, signIn, signOut, refreshHero }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

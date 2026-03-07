import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { fetchHero, MOCK_HEROES, type Hero } from '@/api/pik';

const KEY = 'codex.rootId';
const REFRESH_INTERVAL = 60_000;

interface AuthState {
  hero:         Hero | null;
  isLoading:    boolean;
  isRefreshing: boolean;
  isMock:       boolean;
  isOnline:     boolean;
  lastUpdated:  Date | null;
  signIn:       (rootId: string, mockHero?: Hero) => Promise<void>;
  signOut:      () => void;
  refreshHero:  (silent?: boolean) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hero,         setHero]         = useState<Hero | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMock,       setIsMock]       = useState(false);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroRef     = useRef<Hero | null>(null);

  heroRef.current = hero;

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) { setIsLoading(false); return; }
    fetchHero(stored)
      .then(h => { setHero(h); setIsMock(false); setLastUpdated(new Date()); })
      .catch(() => {
        const mock = MOCK_HEROES.find(m => m.root_id === stored);
        if (mock) { setHero(mock); setIsMock(true); }
        else localStorage.removeItem(KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!hero || isMock) return;
    intervalRef.current = setInterval(async () => {
      if (!heroRef.current || !navigator.onLine) return;
      try { const h = await fetchHero(heroRef.current.root_id); setHero(h); setLastUpdated(new Date()); }
      catch { /* silent */ }
    }, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hero?.root_id, isMock]);

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!heroRef.current || isMock || !navigator.onLine) return;
      try { const h = await fetchHero(heroRef.current.root_id); setHero(h); setLastUpdated(new Date()); }
      catch { /* silent */ }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isMock]);

  const signIn = useCallback(async (rootId: string, mockHero?: Hero) => {
    localStorage.setItem(KEY, rootId);
    if (mockHero) { setHero(mockHero); setIsMock(true); return; }
    const h = await fetchHero(rootId);
    setHero(h); setIsMock(false); setLastUpdated(new Date());
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHero(null); setIsMock(false); setLastUpdated(null);
  }, []);

  const refreshHero = useCallback(async (silent = false) => {
    if (!heroRef.current) return;
    if (!silent) setIsRefreshing(true);
    try { const h = await fetchHero(heroRef.current.root_id); setHero(h); setIsMock(false); setLastUpdated(new Date()); }
    catch { /* keep existing */ }
    finally { if (!silent) setIsRefreshing(false); }
  }, []);

  return (
    <Ctx.Provider value={{ hero, isLoading, isRefreshing, isMock, isOnline, lastUpdated, signIn, signOut, refreshHero }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

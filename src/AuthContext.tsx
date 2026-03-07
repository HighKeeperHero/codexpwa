import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { fetchHeroes, fetchHero, MOCK_HEROES, type Hero } from '@/api/pik';

interface AuthState {
  heroes:       Hero[];
  hero:         Hero | null;
  isLoading:    boolean;
  isRefreshing: boolean;
  isOnline:     boolean;
  isMock:       boolean;
  lastUpdated:  Date | null;
  signIn:       (heroId: string) => Promise<void>;
  signOut:      () => void;
  refreshHero:  () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; };

const SESSION_KEY = 'codex_hero_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [heroes,       setHeroes]       = useState<Hero[]>([]);
  const [hero,         setHero]         = useState<Hero | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [isMock,       setIsMock]       = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Online/offline events
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Load hero list on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchHeroes();
        setHeroes(list);
        setIsMock(false);
      } catch {
        setHeroes(MOCK_HEROES);
        setIsMock(true);
      }

      // Restore session
      const savedId = sessionStorage.getItem(SESSION_KEY);
      if (savedId) {
        try {
          const full = await fetchHero(savedId);
          setHero(full);
          setLastUpdated(new Date());
          setIsMock(false);
        } catch {
          const mock = MOCK_HEROES.find(h => h.root_id === savedId);
          if (mock) { setHero(mock); setIsMock(true); }
          else sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Auto-refresh every 60s while logged in
  useEffect(() => {
    if (!hero || isMock) return;
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const fresh = await fetchHero(hero.root_id);
        setHero(fresh);
        setLastUpdated(new Date());
      } catch {}
    }, 60_000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [hero?.root_id, isMock]);

  // Focus refresh
  useEffect(() => {
    if (!hero || isMock) return;
    const onFocus = async () => {
      if (!navigator.onLine) return;
      try {
        const fresh = await fetchHero(hero.root_id);
        setHero(fresh);
        setLastUpdated(new Date());
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hero?.root_id, isMock]);

  const signIn = useCallback(async (heroId: string) => {
    setIsLoading(true);
    sessionStorage.setItem(SESSION_KEY, heroId);
    try {
      const full = await fetchHero(heroId);
      setHero(full);
      setLastUpdated(new Date());
      setIsMock(false);
    } catch {
      const mock = MOCK_HEROES.find(h => h.root_id === heroId);
      if (mock) { setHero(mock); setIsMock(true); }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setHero(null);
    setLastUpdated(null);
  }, []);

  const refreshHero = useCallback(async () => {
    if (!hero || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fresh = await fetchHero(hero.root_id);
      setHero(fresh);
      setLastUpdated(new Date());
      setIsMock(false);
    } catch {}
    finally { setIsRefreshing(false); }
  }, [hero, isRefreshing]);

  return (
    <Ctx.Provider value={{ heroes, hero, isLoading, isRefreshing, isOnline, isMock, lastUpdated, signIn, signOut, refreshHero }}>
      {children}
    </Ctx.Provider>
  );
}

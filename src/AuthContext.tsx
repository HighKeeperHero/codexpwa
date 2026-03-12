import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';
import { fetchHero, type Hero } from '@/api/pik';
import type { AlignmentChoice } from '@/screens/AlignmentModal';

const BASE        = 'https://pik-prd-production.up.railway.app';
const SESSION_KEY = 'codex_session_token';
const ACCOUNT_KEY = 'codex_account_id';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FateAccount {
  account_id: string;
  email: string;
}

export interface HeroSummary {
  root_id:        string;
  hero_name:      string;
  fate_alignment: string;
  fate_level:     number;
  fate_xp:        number;
  equipped_title: string | null;
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthState {
  account:          FateAccount | null;
  heroes:           HeroSummary[];
  hero:             Hero | null;
  alignment:        AlignmentChoice | null;
  isLoading:        boolean;
  isRefreshing:     boolean;
  isOnline:         boolean;
  showAlignmentModal: boolean;
  sessionToken:     string | null;

  // Auth
  loginWithEmail:   (email: string, password: string) => Promise<void>;
  registerWithEmail:(email: string, password: string) => Promise<void>;
  signOut:          () => void;

  // Hero management
  refreshHeroes:    () => Promise<void>;
  selectHero:       (heroId: string) => Promise<void>;
  createHero:       (heroName: string) => Promise<void>;
  refreshHero:      () => Promise<void>;

  // Alignment
  setAlignment:     (a: AlignmentChoice) => void;
  dismissAlignmentModal: () => void;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account,    setAccount]    = useState<FateAccount | null>(null);
  const [heroes,     setHeroes]     = useState<HeroSummary[]>([]);
  const [hero,       setHero]       = useState<Hero | null>(null);
  const [alignment,  setAlignmentS] = useState<AlignmentChoice | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);

  // ── Online/offline ──────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Session restore ─────────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const token     = sessionStorage.getItem(SESSION_KEY);
        const accountId = sessionStorage.getItem(ACCOUNT_KEY);
        if (!token || !accountId) return;

        setSessionToken(token);

        // Fetch heroes for this account
        const res = await fetch(`${BASE}/api/account/heroes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { clearSession(); return; }

        const data = await res.json();
        const heroList: HeroSummary[] = data?.data ?? data ?? [];
        setHeroes(heroList);
        setAccount({ account_id: accountId, email: '' });

        // If only one hero, auto-select it
        if (heroList.length === 1) {
          await doSelectHero(heroList[0].root_id, token);
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  // ── Alignment modal trigger ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hero) return;
    const heroLevel = hero.progression.hero_level ?? hero.progression.fate_level;
    const needsAlignment =
      heroLevel >= 20 &&
      (!hero.alignment || hero.alignment === 'NONE');
    setShowAlignmentModal(needsAlignment);
  }, [hero]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
    setHeroes([]);
    setHero(null);
    setSessionToken(null);
  };

  const storeSession = (token: string, accountId: string) => {
    sessionStorage.setItem(SESSION_KEY, token);
    sessionStorage.setItem(ACCOUNT_KEY, accountId);
    setSessionToken(token);
  };

  const handleAuthResponse = async (data: any) => {
    const { account_id, email, session_token, heroes: heroList = [] } = data?.data ?? data;
    storeSession(session_token, account_id);
    setAccount({ account_id, email });
    setHeroes(heroList);

    // Auto-select if one hero
    if (heroList.length === 1) {
      await doSelectHero(heroList[0].root_id, session_token);
    }
  };

  const doSelectHero = async (heroId: string, token: string) => {
    try {
      // Tell backend which hero is active for this session
      await fetch(`${BASE}/api/account/heroes/${heroId}/select`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      // Fetch full hero profile
      const fullHero = await fetchHero(heroId);
      setHero(fullHero);
      const al = fullHero.alignment as AlignmentChoice;
      if (al && al !== 'NONE') setAlignmentS(al);
    } catch (e) {
      console.error('Failed to select hero', e);
    }
  };

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const loginWithEmail = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? 'Login failed');
    await handleAuthResponse(data);
  };

  const registerWithEmail = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/account/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? 'Registration failed');
    await handleAuthResponse(data);
  };

  const signOut = useCallback(() => {
    if (sessionToken) {
      fetch(`${BASE}/api/account/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      }).catch(() => {});
    }
    clearSession();
  }, [sessionToken]);

  // ── Hero actions ──────────────────────────────────────────────────────────────

  const refreshHeroes = async () => {
    if (!sessionToken) return;
    const res = await fetch(`${BASE}/api/account/heroes`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await res.json();
    setHeroes(data?.data ?? data ?? []);
  };

  const selectHero = async (heroId: string) => {
    if (!sessionToken) return;
    await doSelectHero(heroId, sessionToken);
  };

  const createHero = async (heroName: string) => {
    if (!sessionToken) throw new Error('Not authenticated');
    const res = await fetch(`${BASE}/api/account/heroes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_name: heroName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? 'Failed to create hero');
    await refreshHeroes();
    // Auto-select the new hero
    const created = data?.data ?? data;
    await doSelectHero(created.root_id, sessionToken);
  };

  const refreshHero = useCallback(async () => {
    if (!hero) return;
    setIsRefreshing(true);
    try {
      const updated = await fetchHero(hero.root_id);
      setHero(updated);
    } catch {}
    finally { setIsRefreshing(false); }
  }, [hero]);

  // ── Alignment ─────────────────────────────────────────────────────────────────

  const setAlignment = useCallback(async (a: AlignmentChoice) => {
    setAlignmentS(a);
    setShowAlignmentModal(false);
    if (!hero || !sessionToken) return;
    try {
      await fetch(`${BASE}/api/users/${hero.root_id}/alignment`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alignment: a }),
      });
      await refreshHero();
    } catch {}
  }, [hero, sessionToken, refreshHero]);

  const dismissAlignmentModal = useCallback(() => setShowAlignmentModal(false), []);

  return (
    <Ctx.Provider value={{
      account, heroes, hero, alignment, sessionToken,
      isLoading, isRefreshing, isOnline, showAlignmentModal,
      loginWithEmail, registerWithEmail, signOut,
      refreshHeroes, selectHero, createHero, refreshHero,
      setAlignment, dismissAlignmentModal,
    }}>
      {children}
    </Ctx.Provider>
  );
}

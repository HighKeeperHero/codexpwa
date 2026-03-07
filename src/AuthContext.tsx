import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode
} from 'react';
import { fetchHeroes, fetchHero, MOCK_HEROES, type Hero } from '@/api/pik';
import type { AlignmentChoice } from '@/screens/AlignmentModal';

// ── Alignment persistence ─────────────────────────────────────────────────────
// NOTE: PUT /api/users/:id/profile requires SessionGuard.
// Alignment is stored locally until Codex implements full passkey auth sessions.
// Once session auth exists, this should sync to PIK-PRD on write.

const ALIGNMENT_KEY_PREFIX = 'codex_alignment_';
const SESSION_KEY           = 'codex_hero_id';

function getStoredAlignment(rootId: string): AlignmentChoice | null {
  try { return (localStorage.getItem(`${ALIGNMENT_KEY_PREFIX}${rootId}`) as AlignmentChoice) ?? null; }
  catch { return null; }
}
function setStoredAlignment(rootId: string, a: AlignmentChoice) {
  try { localStorage.setItem(`${ALIGNMENT_KEY_PREFIX}${rootId}`, a); } catch {}
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthState {
  heroes:           Hero[];
  hero:             Hero | null;
  alignment:        AlignmentChoice | null;
  isLoading:        boolean;
  isRefreshing:     boolean;
  isOnline:         boolean;
  isMock:           boolean;
  lastUpdated:      Date | null;
  showAlignmentModal: boolean;
  signIn:           (heroId: string) => Promise<void>;
  signOut:          () => void;
  refreshHero:      () => Promise<void>;
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
  const [heroes,      setHeroes]      = useState<Hero[]>([]);
  const [hero,        setHero]        = useState<Hero | null>(null);
  const [alignment,   setAlignmentState] = useState<AlignmentChoice | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isRefreshing,setIsRefreshing]= useState(false);
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [isMock,      setIsMock]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);
  const alignmentPrompted = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Online/offline
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Boot: load hero list + restore session
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

      const savedId = sessionStorage.getItem(SESSION_KEY);
      if (savedId) {
        try {
          const full = await fetchHero(savedId);
          setHero(full);
          setLastUpdated(new Date());
          setIsMock(false);

          // Restore local alignment
          const stored = getStoredAlignment(savedId);
          setAlignmentState(stored);
        } catch {
          const mock = MOCK_HEROES.find(h => h.root_id === savedId);
          if (mock) { setHero(mock); setIsMock(true); }
          else sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Alignment modal trigger: show when level >= 20 and no alignment set
  useEffect(() => {
    if (!hero || alignmentPrompted.current) return;
    const hasAlignment = alignment && alignment !== 'NONE';
    const pirAlignmentSet = hero.alignment && hero.alignment !== 'NONE';
    // Also check PIK-stored alignment
    const effectiveAlignment = pirAlignmentSet ? hero.alignment as AlignmentChoice : alignment;
    if (hero.progression.fate_level >= 20 && !effectiveAlignment) {
      alignmentPrompted.current = true;
      const t = setTimeout(() => setShowAlignmentModal(true), 1200);
      return () => clearTimeout(t);
    }
  }, [hero, alignment]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!hero || isMock) return;
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const fresh = await fetchHero(hero.root_id);
        setHero(fresh);
        setLastUpdated(new Date());
      } catch {}
    }, 60_000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
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
    alignmentPrompted.current = false;
    try {
      const full = await fetchHero(heroId);
      setHero(full);
      setLastUpdated(new Date());
      setIsMock(false);
      const stored = getStoredAlignment(heroId);
      setAlignmentState(stored);
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
    setAlignmentState(null);
    alignmentPrompted.current = false;
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

  const setAlignment = useCallback((a: AlignmentChoice) => {
    if (!hero) return;
    setStoredAlignment(hero.root_id, a);
    setAlignmentState(a);
    setShowAlignmentModal(false);
  }, [hero]);

  const dismissAlignmentModal = useCallback(() => {
    setShowAlignmentModal(false);
    // Will re-prompt on next login unless alignment is chosen
  }, []);

  // Effective alignment: prefer PIK-stored > local
  const effectiveAlignment: AlignmentChoice | null =
    (hero?.alignment && hero.alignment !== 'NONE' && hero.alignment !== '')
      ? hero.alignment as AlignmentChoice
      : alignment;

  return (
    <Ctx.Provider value={{
      heroes, hero,
      alignment: effectiveAlignment,
      isLoading, isRefreshing, isOnline, isMock, lastUpdated,
      showAlignmentModal,
      signIn, signOut, refreshHero, setAlignment, dismissAlignmentModal,
    }}>
      {children}
    </Ctx.Provider>
  );
}

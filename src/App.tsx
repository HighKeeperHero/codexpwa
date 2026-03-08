import './index.css';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/AuthContext';
import { SplashScreen }      from '@/screens/SplashScreen';
import { LandingScreen }     from '@/screens/LandingScreen';
import { RegisterScreen }    from '@/screens/RegisterScreen';
import { LoginScreen }       from '@/screens/LoginScreen';
import { HomeScreen }        from '@/screens/HomeScreen';
import { QuestsScreen }      from '@/screens/QuestsScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { ProfileScreen }     from '@/screens/ProfileScreen';
import { AlignmentModal }    from '@/screens/AlignmentModal';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

// ── Route types ───────────────────────────────────────────────────────────────
type AppRoute = 'landing' | 'register' | 'login' | 'dashboard';
type DashTab  = 'home' | 'hunts' | 'rankings' | 'archive';

// ── Offline banner ─────────────────────────────────────────────────────────────
function OfflineBanner({ show }: { show: boolean }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: 'rgba(200,94,40,0.95)',
      padding: '10px 16px',
      textAlign: 'center', fontSize: 11, letterSpacing: '0.08em',
      color: '#fff', fontWeight: 600,
      transform: show ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.3s ease',
    }}>
      ⚡ OFFLINE — Showing cached data
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS: { id: DashTab; label: string; icon: string }[] = [
  { id: 'home',     label: 'Home',     icon: '◈' },
  { id: 'hunts',    label: 'Hunts',    icon: '⚔' },
  { id: 'rankings', label: 'Rankings', icon: '★' },
  { id: 'archive',  label: 'Archive',  icon: '◉' },
];

function TabBar({ active, onChange }: { active: DashTab; onChange: (t: DashTab) => void }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'rgba(11,10,8,0.96)',
      borderTop: '1px solid var(--border)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '10px 0', background: 'none', border: 'none',
            cursor: 'pointer',
          }}>
            <span style={{
              fontSize: 16, lineHeight: 1,
              color: isActive ? 'var(--gold)' : 'var(--text-3)',
              transition: 'color 0.15s',
              filter: isActive ? 'drop-shadow(0 0 4px rgba(200,160,78,0.5))' : 'none',
            }}>{tab.icon}</span>
            <span style={{
              fontSize: 8, letterSpacing: '0.1em', fontWeight: 600,
              color: isActive ? 'var(--gold)' : 'var(--text-3)',
              transition: 'color 0.15s',
            }}>{tab.label.toUpperCase()}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Returning hero card ───────────────────────────────────────────────────────
// Shown on landing when a session exists but needs re-confirmation
function ReturningHeroCard({ onContinue, onSwitch }: { onContinue: () => void; onSwitch: () => void }) {
  const { hero, alignment } = useAuth();
  if (!hero) return null;

  const tier      = TIER_FOR_LEVEL(hero.progression.fate_level);
  const ac        = ALIGNMENT_COLOR[alignment ?? ''] ?? ALIGNMENT_COLOR[hero.alignment] ?? 'var(--bronze)';
  const al        = ALIGNMENT_LABEL[alignment ?? ''] ?? ALIGNMENT_LABEL[hero.alignment] ?? null;

  return (
    <div style={{ width: '100%', maxWidth: 380, marginBottom: 24 }}>
      <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-3)', marginBottom: 10, textAlign: 'center' }}>
        WELCOME BACK
      </p>

      {/* Hero card */}
      <div
        onClick={onContinue}
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,94,40,0.03))',
          border: '1px solid rgba(200,160,78,0.3)',
          borderRadius: 14, cursor: 'pointer',
          marginBottom: 10, transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        {/* Alignment dot */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `${ac}18`,
          border: `1px solid ${ac}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {alignment === 'ORDER' ? '⚖' : alignment === 'CHAOS' ? '🜲' : alignment === 'LIGHT' ? '☀' : alignment === 'DARK' ? '☽' : '◈'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="serif-bold" style={{ fontSize: 18, color: 'var(--text-1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hero.display_name}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: tier.color, fontWeight: 700 }}>
              {tier.name}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
              Level {hero.progression.fate_level}
            </span>
            {al && (
              <>
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>·</span>
                <span style={{ fontSize: 10, color: ac, fontWeight: 600 }}>{al}</span>
              </>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="xp-track" style={{ height: 3 }}>
              <div className="xp-fill" style={{
                width: `${Math.min(100, (hero.progression.xp_in_current_level / hero.progression.xp_needed_for_next) * 100)}%`,
                background: `linear-gradient(90deg, ${ac}88, ${ac})`,
              }} />
            </div>
          </div>
        </div>

        <span style={{ color: 'var(--gold)', fontSize: 18, flexShrink: 0, opacity: 0.6 }}>›</span>
      </div>

      {/* Switch hero */}
      <button
        onClick={onSwitch}
        style={{
          width: '100%', padding: '11px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 10, cursor: 'pointer',
          color: 'var(--text-3)', fontSize: 11,
          letterSpacing: '0.06em',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(168,146,122,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        Switch Hero
      </button>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
function Dashboard() {
  const { isOnline, hero, showAlignmentModal, alignment, setAlignment, dismissAlignmentModal } = useAuth();
  const [tab, setTab] = useState<DashTab>('home');

  if (!hero) return null;

  return (
    <>
      <OfflineBanner show={!isOnline} />
      <div style={{ paddingBottom: 0 }}>
        {tab === 'home'     && <HomeScreen />}
        {tab === 'hunts'    && <QuestsScreen />}
        {tab === 'rankings' && <LeaderboardScreen />}
        {tab === 'archive'  && <ProfileScreen />}
      </div>
      <TabBar active={tab} onChange={setTab} />
      <AlignmentModal
        show={showAlignmentModal}
        heroName={hero.display_name}
        fateLevel={hero.progression.fate_level}
        onConfirm={setAlignment}
        onDismiss={dismissAlignmentModal}
      />
    </>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  const { hero, isLoading, signIn, signOut } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [route,      setRoute]      = useState<AppRoute>('landing');

  // Only advance past splash once BOTH animation finished AND auth resolved
  const readyToRoute = splashDone && !isLoading;

  // Once ready, set initial route based on session state
// Also catches sign-out: if hero disappears while on dashboard, return to landing
useEffect(() => {
  if (!readyToRoute) return;
  setRoute(hero ? 'dashboard' : 'landing');
}, [readyToRoute, hero]);

  // Show splash until both animation and loading are done
  if (!readyToRoute) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (route === 'landing') {
    // If we have a hero, show returning card on landing
    return (
      <LandingScreen
        returningHero={!!hero}
        onContinue={() => setRoute('dashboard')}
        onNewUser={() => { signOut(); setRoute('register'); }}
        onExistingUser={() => setRoute('login')}
        onSwitch={() => { signOut(); setRoute('login'); }}
      />
    );
  }

  if (route === 'register') {
    return (
      <RegisterScreen
        onComplete={async (_name, rootId) => {
          await signIn(rootId);
          setRoute('dashboard');
        }}
        onBack={() => setRoute('landing')}
      />
    );
  }

  if (route === 'login') {
    return (
      <LoginScreen
        onComplete={() => setRoute('dashboard')}
        onBack={() => setRoute('landing')}
      />
    );
  }

  return <Dashboard />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isDesktop = window.innerWidth > 500;
  return (
    <AuthProvider>
      <div style={{
        width: '100%', maxWidth: 480,
        margin: '0 auto', minHeight: '100dvh',
        background: 'var(--bg)', position: 'relative',
        boxShadow: isDesktop ? '0 0 60px rgba(0,0,0,0.8), inset 0 0 1px rgba(200,160,78,0.1)' : 'none',
        borderRadius: isDesktop ? 40 : 0,
      }}>
        <Router />
      </div>
    </AuthProvider>
  );
}

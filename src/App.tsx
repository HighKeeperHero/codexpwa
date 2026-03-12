import './index.css';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/AuthContext';
import { SplashScreen } from '@/screens/SplashScreen';
import { LandingScreen } from '@/screens/LandingScreen';
import { HeroSelectScreen } from '@/screens/HeroSelectScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { TrainingScreen } from '@/screens/TrainingScreen';
import { VenturesScreen } from '@/screens/VenturesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AlignmentModal } from '@/screens/AlignmentModal';
import VeilTearsScreen from '@/screens/VeilTearsScreen';
import { TierAscensionModal, checkTierAscension } from '@/screens/TierAscensionModal';
import type { Tier } from '@/api/pik';

type AppRoute = 'landing' | 'hero-select' | 'dashboard';
type DashTab = 'home' | 'training' | 'hunts' | 'archive' | 'veil';

// ── Offline banner ────────────────────────────────────────────────────────────
function OfflineBanner({ show }: { show: boolean }) {
  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:500,
      background:'rgba(200,94,40,0.95)',
      padding:'10px 16px', textAlign:'center', fontSize:11,
      letterSpacing:'0.08em', color:'#fff', fontWeight:600,
      transform: show ? 'translateY(0)' : 'translateY(-100%)',
      transition:'transform 0.3s ease',
    }}>
      ⚡ OFFLINE — Showing cached data
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS: { id: DashTab; label: string; icon: string }[] = [
  { id: 'home',     label: 'Home',     icon: '◈'  },
  { id: 'training', label: 'Training', icon: '✦'  },
  { id: 'hunts',    label: 'Ventures', icon: '◉'  },
  { id: 'archive',  label: 'Hero',     icon: '★'  },
  { id: 'veil',     label: 'Veil',     icon: '⚡' },
];

function TabBar({ active, onChange }: { active: DashTab; onChange: (t: DashTab) => void }) {
  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480,
      background:'rgba(11,10,8,0.96)',
      borderTop:'1px solid var(--border)',
      display:'grid', gridTemplateColumns:'repeat(5,1fr)',
      paddingBottom:'max(env(safe-area-inset-bottom),8px)',
      zIndex:100, backdropFilter:'blur(12px)',
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const isVeil   = tab.id === 'veil';
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center',
              gap:4, padding:'10px 0',
              background:'none', border:'none', cursor:'pointer',
              position:'relative',
            }}
          >
            {/* Active indicator — veil gets purple/red gradient */}
            {isActive && (
              <div style={{
                position:'absolute', top:0, left:'20%', right:'20%',
                height:2, borderRadius:'0 0 2px 2px',
                background: isVeil
                  ? 'linear-gradient(90deg,#8040C8,#CC1020)'
                  : 'var(--gold)',
              }} />
            )}
            <span style={{
              fontSize:16, lineHeight:1,
              color: isActive
                ? (isVeil ? '#A060E0' : 'var(--gold)')
                : 'var(--text-3)',
              transition:'color 0.15s',
              filter: isActive
                ? isVeil
                  ? 'drop-shadow(0 0 4px rgba(160,96,224,0.6))'
                  : 'drop-shadow(0 0 4px rgba(200,160,78,0.5))'
                : 'none',
            }}>{tab.icon}</span>
            <span style={{
              fontSize:8, letterSpacing:'0.1em', fontWeight:600,
              color: isActive
                ? (isVeil ? '#A060E0' : 'var(--gold)')
                : 'var(--text-3)',
              transition:'color 0.15s',
            }}>{tab.label.toUpperCase()}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
function Dashboard({ onReturnToHeroSelect }: { onReturnToHeroSelect: () => void }) {
  const { isOnline, hero, showAlignmentModal, alignment, setAlignment, dismissAlignmentModal } = useAuth();
  const [tab, setTab]                     = useState<DashTab>('home');
  const [ascensionTier, setAscensionTier] = useState<Tier | null>(null);

  // Fire tier ascension modal once per tier per hero
  useEffect(() => {
    if (!hero) return;
    const pending = checkTierAscension(hero.root_id, hero.progression.hero_level);
    if (pending) setAscensionTier(pending);
  }, [hero?.root_id, hero?.progression.hero_level]);

  if (!hero) return null;

  return (
    <>
      <OfflineBanner show={!isOnline} />
      <div style={{ paddingBottom:0 }}>
        {tab === 'home'     && <HomeScreen onSwitchHero={onReturnToHeroSelect} onNavigateToVeil={() => setTab('veil')} onNavigateToChronicle={() => setTab('archive')} onNavigateToTraining={() => setTab('training')} />}
        {tab === 'training' && <TrainingScreen />}
        {tab === 'hunts'    && <VenturesScreen />}
        {tab === 'archive'  && <ProfileScreen onReturnToHeroSelect={onReturnToHeroSelect} />}
        {tab === 'veil'     && <VeilTearsScreen />}
      </div>
      <TabBar active={tab} onChange={setTab} />
      <AlignmentModal
        show={showAlignmentModal}
        heroName={hero.display_name}
        fateLevel={hero.progression.fate_level}
        onConfirm={setAlignment}
        onDismiss={dismissAlignmentModal}
      />
      {ascensionTier && (
        <TierAscensionModal
          tier={ascensionTier}
          rootId={hero.root_id}
          onDismiss={() => setAscensionTier(null)}
        />
      )}
    </>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  const { account, hero, isLoading, signOut } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [route, setRoute] = useState<AppRoute>('landing');

  const readyToRoute = splashDone && !isLoading;

  useEffect(() => {
    if (!readyToRoute) return;
    if (!account) { setRoute('landing'); return; }
    if (!hero)    { setRoute('hero-select'); return; }
    setRoute('dashboard');
  }, [readyToRoute, account, hero]);

  const goToHeroSelect = () => setRoute('hero-select');

  if (!readyToRoute) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (route === 'landing') {
    return <LandingScreen onAuthenticated={() => setRoute('hero-select')} />;
  }

  if (route === 'hero-select') {
    return (
      <HeroSelectScreen
        onHeroSelected={() => setRoute('dashboard')}
        onSignOut={() => { signOut(); setRoute('landing'); }}
      />
    );
  }

  return <Dashboard onReturnToHeroSelect={goToHeroSelect} />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isDesktop = window.innerWidth > 500;
  return (
    <AuthProvider>
      <div style={{
        width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100dvh',
        background:'var(--bg)', position:'relative',
        boxShadow: isDesktop ? '0 0 60px rgba(0,0,0,0.8),inset 0 0 1px rgba(200,160,78,0.1)' : 'none',
        borderRadius: isDesktop ? 40 : 0,
      }}>
        <Router />
      </div>
    </AuthProvider>
  );
}

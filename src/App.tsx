import './index.css';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/AuthContext';
import { SplashScreen } from '@/screens/SplashScreen';
import { LandingScreen } from '@/screens/LandingScreen';
import { HeroSelectScreen } from '@/screens/HeroSelectScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { TrainingScreen } from '@/screens/TrainingScreen';
import { QuestsScreen } from '@/screens/QuestsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AlignmentModal } from '@/screens/AlignmentModal';
import VeilTearsScreen from '@/screens/VeilTearsScreen';

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
  { id: 'hunts',    label: 'Hunts',    icon: '◉'  },
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

// ── Alignment Announcement (pre-modal) ───────────────────────────────────────
function AlignmentAnnounce({ heroName, onProceed }: { heroName: string; onProceed: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <style>{`
        @keyframes announceIn {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glyphPulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.12); }
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400,
        background: 'linear-gradient(180deg, #16120A 0%, #0B0A08 100%)',
        border: '1px solid rgba(200,160,78,0.3)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 80px rgba(200,160,78,0.08)',
        padding: '36px 28px 28px',
        animation: 'announceIn 0.55s cubic-bezier(0.16,1,0.3,1) forwards',
        textAlign: 'center',
      }}>
        {/* Glyph */}
        <div style={{ marginBottom: 24 }}>
          <span style={{
            fontSize: 52, display: 'block', lineHeight: 1,
            animation: 'glyphPulse 2.4s ease infinite',
            filter: 'drop-shadow(0 0 16px rgba(200,160,78,0.6))',
          }}>◈</span>
        </div>

        {/* Heading */}
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>
          A Threshold Crossed
        </p>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, letterSpacing: '0.04em' }}>
          Level 20 Achieved
        </h2>

        {/* Body */}
        <p style={{ fontSize: 13, color: 'rgba(240,237,230,0.7)', lineHeight: 1.75, marginBottom: 10 }}>
          <strong style={{ color: 'var(--gold)' }}>{heroName}</strong>, you have proven your worth across the Veil.
        </p>
        <p style={{ fontSize: 13, color: 'rgba(240,237,230,0.65)', lineHeight: 1.75, marginBottom: 28 }}>
          The great Realms have taken notice. You may now align yourself with one — each grants its allies
          unique hunts, titles, and paths that others cannot walk.
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(200,160,78,0.2)' }} />
          <span style={{ fontSize: 10, color: 'rgba(200,160,78,0.5)', letterSpacing: '0.2em' }}>YOUR FATE AWAITS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(200,160,78,0.2)' }} />
        </div>

        <button onClick={onProceed} style={{
          width: '100%', padding: '15px',
          background: 'linear-gradient(135deg, rgba(200,160,78,0.9), rgba(200,160,78,0.6))',
          color: '#0B0A08', border: 'none', borderRadius: 12,
          fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
          letterSpacing: '0.1em', cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(200,160,78,0.3)',
        }}>
          Choose Your Alignment
        </button>
      </div>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
function Dashboard({ onReturnToHeroSelect }: { onReturnToHeroSelect: () => void }) {
  const { isOnline, hero, showAlignmentModal, alignment, setAlignment, dismissAlignmentModal } = useAuth();
  const [tab, setTab] = useState<DashTab>('home');
  const [showAnnounce, setShowAnnounce] = useState(false);

  // Show announcement first, then hand off to the full alignment modal
  useEffect(() => {
    if (showAlignmentModal) setShowAnnounce(true);
  }, [showAlignmentModal]);

  if (!hero) return null;

  return (
    <>
      <OfflineBanner show={!isOnline} />
      <div style={{ paddingBottom:0 }}>
        {tab === 'home'     && <HomeScreen onSwitchHero={onReturnToHeroSelect} onNavigateToVeil={() => setTab('veil')} onNavigateToChronicle={() => setTab('archive')} onNavigateToTraining={() => setTab('training')} />}
        {tab === 'training' && <TrainingScreen />}
        {tab === 'hunts'    && <QuestsScreen />}
        {tab === 'archive'  && <ProfileScreen onReturnToHeroSelect={onReturnToHeroSelect} />}
        {tab === 'veil'     && <VeilTearsScreen />}
      </div>
      <TabBar active={tab} onChange={setTab} />
      <AlignmentModal
        show={showAlignmentModal && !showAnnounce}
        heroName={hero.display_name}
        fateLevel={hero.progression.fate_level}
        onConfirm={setAlignment}
        onDismiss={dismissAlignmentModal}
      />
      {showAnnounce && (
        <AlignmentAnnounce
          heroName={hero.display_name}
          onProceed={() => setShowAnnounce(false)}
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

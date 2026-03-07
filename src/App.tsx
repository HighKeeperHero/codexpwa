import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/AuthContext';
import { LoginScreen }       from '@/screens/LoginScreen';
import { HomeScreen }        from '@/screens/HomeScreen';
import { QuestsScreen }      from '@/screens/QuestsScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { ProfileScreen }     from '@/screens/ProfileScreen';
import '@/index.css';

type Tab = 'home' | 'quests' | 'leaderboard' | 'profile';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home',        icon: '⊕', label: 'HOME'     },
  { id: 'quests',      icon: '◈', label: 'QUESTS'   },
  { id: 'leaderboard', icon: '✦', label: 'STANDING' },
  { id: 'profile',     icon: '◉', label: 'ARCHIVE'  },
];

function SplashScreen() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, background: 'var(--bg)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="orn-row" style={{ width: 120 }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize: 36, color: 'var(--gold)', letterSpacing: 10 }}>CODEX</h1>
        <p className="serif" style={{ fontSize: 10, color: 'var(--bronze)', letterSpacing: 4 }}>HEROES' VERITAS</p>
        <div className="orn-row" style={{ width: 120 }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 4, height: 4, borderRadius: '50%',
            background: 'var(--gold)', opacity: 0.3,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function OfflineBanner({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) {
      if (wasOffline) {
        setVisible(true); // show "back online"
        setWasOffline(false);
        timerRef.current = setTimeout(() => setVisible(false), 2500);
      }
    } else {
      setVisible(true);
      setWasOffline(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]);

  if (!visible) return null;

  return (
    <div className={`status-banner ${show ? 'offline' : 'online'}`}>
      <span>{show ? '○' : '●'}</span>
      <span style={{ fontSize: 11, letterSpacing: 0.5 }}>
        {show ? 'No connection — showing cached data' : 'Back online'}
      </span>
    </div>
  );
}

function AppShell() {
  const { hero, isLoading, isOnline } = useAuth();
  const [tab, setTab]     = useState<Tab>('home');
  const [prevTab, setPrev] = useState<Tab>('home');

  function goTab(t: Tab) {
    if (t === tab) return;
    setPrev(tab);
    setTab(t);
  }

  if (isLoading) return <SplashScreen />;
  if (!hero)     return <LoginScreen />;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>
      <OfflineBanner show={!isOnline} />

      {tab === 'home'        && <HomeScreen        key="home"        />}
      {tab === 'quests'      && <QuestsScreen      key="quests"      />}
      {tab === 'leaderboard' && <LeaderboardScreen key="leaderboard" />}
      {tab === 'profile'     && <ProfileScreen     key="profile"     />}

      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => goTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

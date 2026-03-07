import { useState } from 'react';
import { AuthProvider, useAuth } from '@/AuthContext';
import { LoginScreen }      from '@/screens/LoginScreen';
import { HomeScreen }       from '@/screens/HomeScreen';
import { QuestsScreen }     from '@/screens/QuestsScreen';
import { LeaderboardScreen }from '@/screens/LeaderboardScreen';
import { ProfileScreen }    from '@/screens/ProfileScreen';
import '@/index.css';

type Tab = 'home' | 'quests' | 'leaderboard' | 'profile';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home',        icon: '⊕', label: 'HOME' },
  { id: 'quests',      icon: '◈', label: 'QUESTS' },
  { id: 'leaderboard', icon: '✦', label: 'STANDING' },
  { id: 'profile',     icon: '◉', label: 'ARCHIVE' },
];

function AppShell() {
  const { hero, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  if (isLoading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)' }}>
        <span className="serif-bold" style={{ fontSize: 28, color: 'var(--gold)', letterSpacing: 6 }}>CODEX</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2 }}>Consulting the Archive…</span>
      </div>
    );
  }

  if (!hero) return <LoginScreen />;

  return (
    <div style={{ height: '100dvh', position: 'relative', background: 'var(--bg)' }}>
      {/* Screens */}
      {tab === 'home'        && <HomeScreen />}
      {tab === 'quests'      && <QuestsScreen />}
      {tab === 'leaderboard' && <LeaderboardScreen />}
      {tab === 'profile'     && <ProfileScreen />}

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
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

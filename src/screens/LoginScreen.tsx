import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { fetchHeroes, MOCK_HEROES, type Hero } from '@/api/pik';

const AC: Record<string, string> = { Order: '#C8A04E', Veil: '#7A5888', Wild: '#486E48' };

function HeroSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 3, background: 'var(--border-hi)', flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 18, width: '55%' }} />
        <div className="skeleton" style={{ height: 12, width: '35%' }} />
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [heroes,  setHeroes]  = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [isMock,  setIsMock]  = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetchHeroes()
      .then(h  => { setHeroes(h); setIsMock(false); })
      .catch(() => {
        setHeroes(MOCK_HEROES);
        setIsMock(true);
        setError(false);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(hero: Hero) {
    if (signing) return;
    setSigning(hero.root_id);
    try {
      if (isMock) await signIn(hero.root_id, hero);
      else await signIn(hero.root_id);
    } catch { setSigning(null); }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
      paddingTop: 'calc(var(--safe-top) + 60px)',
      paddingBottom: 'calc(var(--safe-bottom) + 40px)',
    }}>

      {/* Wordmark */}
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 52 }}>
        <div className="orn-row" style={{ width: 160 }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <h1 className="serif-bold" style={{ fontSize: 48, color: 'var(--gold)', letterSpacing: 12, lineHeight: 1 }}>
            CODEX
          </h1>
          <p className="serif" style={{ fontSize: 10, color: 'var(--bronze)', letterSpacing: 5 }}>
            HEROES' VERITAS
          </p>
        </div>
        <div className="orn-row" style={{ width: 160 }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7, marginTop: 4 }}>
          The official record of your heroic journey
        </p>
      </div>

      {/* Hero list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-3)', fontWeight: 600 }}>
            IDENTIFY YOUR HERO
          </span>
          {isMock && (
            <span style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--ember)', border: '1px solid rgba(200,94,40,0.35)', padding: '2px 8px', borderRadius: 4 }}>
              DEMO
            </span>
          )}
        </div>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading
            ? [1,2,3,4].map(i => <HeroSkeleton key={i} />)
            : heroes.map(hero => {
                const ac = AC[hero.alignment] ?? 'var(--bronze)';
                const isActive = signing === hero.root_id;
                return (
                  <button
                    key={hero.root_id}
                    onClick={() => handleSelect(hero)}
                    disabled={!!signing}
                    className="card card-pressable"
                    style={{
                      display: 'flex', width: '100%', textAlign: 'left',
                      opacity: signing && !isActive ? 0.45 : 1,
                      borderColor: isActive ? ac : undefined,
                    }}
                  >
                    <div style={{ width: 3, background: isActive ? ac : 'var(--border-hi)', flexShrink: 0, transition: 'background 0.2s' }} />
                    <div style={{ flex: 1, padding: '15px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span className="serif" style={{ fontSize: 18, color: 'var(--text-1)', letterSpacing: 0.3 }}>
                          {hero.display_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 8, letterSpacing: 1.5, fontWeight: 600,
                            color: ac, border: `1px solid ${ac}45`,
                            background: `${ac}12`, padding: '2px 7px', borderRadius: 3,
                          }}>
                            {hero.alignment?.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.5 }}>
                            LVL {hero.progression?.fate_level ?? 1}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.5 }}>
                            · {(hero.progression?.total_xp ?? 0).toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: 20, color: isActive ? ac : 'var(--text-3)', transition: 'color 0.2s', flexShrink: 0, fontWeight: 300 }}>
                        {isActive ? '…' : '›'}
                      </span>
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.8, marginTop: 'auto', paddingTop: 32, opacity: 0.6 }}>
        Your Fate ID is registered with the PIK.<br />
        Each session is permanently recorded.
      </p>
    </div>
  );
}

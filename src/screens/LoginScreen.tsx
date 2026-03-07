import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { fetchHeroes, MOCK_HEROES, type Hero } from '@/api/pik';

const ALIGNMENT_COLORS: Record<string, string> = {
  Order: '#D4A853', Veil: '#7C5C8A', Wild: '#4A8C5C',
};

export function LoginScreen() {
  const { signIn } = useAuth();
  const [heroes,  setHeroes]  = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [isMock,  setIsMock]  = useState(false);

  useEffect(() => {
    fetchHeroes()
      .then(h => { setHeroes(h); setIsMock(false); })
      .catch(() => { setHeroes(MOCK_HEROES); setIsMock(true); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(hero: Hero) {
    if (signing) return;
    setSigning(hero.root_id);
    try {
      if (isMock) await signIn(hero.root_id, hero);
      else await signIn(hero.root_id);
    } catch {
      setSigning(null);
    }
  }

  const acColor = (a: string) => ALIGNMENT_COLORS[a] ?? '#7C5C3A';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '0 24px', paddingTop: 'calc(var(--safe-top) + 48px)', paddingBottom: 32, gap: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="ornament-row">
          <div className="ornament-line" />
          <span className="ornament-glyph">◈</span>
          <div className="ornament-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize: 42, color: 'var(--gold)', letterSpacing: 8, textAlign: 'center', lineHeight: 1 }}>CODEX</h1>
        <p className="serif" style={{ fontSize: 11, color: 'var(--bronze)', letterSpacing: 4, textAlign: 'center' }}>HEROES' VERITAS</p>
        <div className="ornament-row">
          <div className="ornament-line" />
          <span className="ornament-glyph">◈</span>
          <div className="ornament-line" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6, marginTop: 4 }}>
          The official record of your heroic journey
        </p>
      </div>

      {/* Hero selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: 2.5, color: 'var(--text-dim)', fontWeight: 600 }}>IDENTIFY YOUR HERO</span>
          {isMock && <span style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--ember)', border: '1px solid rgba(212,104,42,0.4)', padding: '2px 8px', borderRadius: 4 }}>DEMO MODE</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: 12, letterSpacing: 1.5 }}>
            Consulting the Archive…
          </div>
        ) : (
          heroes.map(hero => (
            <button
              key={hero.root_id}
              onClick={() => handleSelect(hero)}
              disabled={!!signing}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                opacity: signing && signing !== hero.root_id ? 0.5 : 1,
                transition: 'opacity 0.15s',
                textAlign: 'left', width: '100%',
              }}
            >
              {/* Alignment accent */}
              <div style={{ width: 3, alignSelf: 'stretch', background: acColor(hero.alignment), flexShrink: 0 }} />

              <div style={{ flex: 1, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span className="serif" style={{ fontSize: 17, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                    {hero.display_name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 9, letterSpacing: 1.5, fontWeight: 600,
                      color: acColor(hero.alignment),
                      border: `1px solid ${acColor(hero.alignment)}50`,
                      background: `${acColor(hero.alignment)}15`,
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      {hero.alignment?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>
                      LVL {hero.progression?.fate_level ?? 1}
                    </span>
                  </div>
                  {hero.titles?.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--gold-dim)', fontStyle: 'italic', letterSpacing: 0.3 }}>
                      {hero.titles[hero.titles.length - 1].title_name}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: 24, color: signing === hero.root_id ? 'var(--gold)' : 'var(--gold)', flexShrink: 0 }}>
                  {signing === hero.root_id ? '…' : '›'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.7, opacity: 0.7, marginTop: 'auto' }}>
        Your identity is bound to the PIK.<br />
        Each session writes to the permanent record.
      </p>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

interface Props {
  returningHero:  boolean;
  onContinue:     () => void;
  onNewUser:      () => void;
  onExistingUser: () => void;
  onSwitch:       () => void;
}

export function LandingScreen({ returningHero, onContinue, onNewUser, onExistingUser, onSwitch }: Props) {
  const { hero, alignment } = useAuth();
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEntered(true), 80); return () => clearTimeout(t); }, []);

  const tier = hero ? TIER_FOR_LEVEL(hero.progression.fate_level) : null;
  const ac   = hero ? (ALIGNMENT_COLOR[alignment ?? ''] ?? ALIGNMENT_COLOR[hero.alignment] ?? 'var(--bronze)') : 'var(--gold)';
  const al   = hero ? (ALIGNMENT_LABEL[alignment ?? ''] ?? ALIGNMENT_LABEL[hero.alignment] ?? null) : null;
  const alignIcon = alignment === 'ORDER' ? '⚖' : alignment === 'CHAOS' ? '🜲' : alignment === 'LIGHT' ? '☀' : alignment === 'DARK' ? '☽' : '◈';

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes landingIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .land-item { opacity: 0; }
        .land-item.e { animation: landingIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Wordmark */}
      <div className={`land-item ${entered ? 'e' : ''}`} style={{ animationDelay: '0ms', textAlign: 'center', marginBottom: returningHero ? 32 : 48 }}>
        <div className="orn-row" style={{ width: 180, margin: '0 auto 20px' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize: 42, color: 'var(--gold)', letterSpacing: '0.35em', marginBottom: 8 }}>
          CODEX
        </h1>
        <p style={{ fontSize: 10, letterSpacing: '0.4em', color: 'var(--text-3)', fontFamily: 'var(--font-serif)' }}>
          HEROES' VERITAS
        </p>
        <div className="orn-row" style={{ width: 180, margin: '16px auto 0' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
      </div>

      <div className={`land-item ${entered ? 'e' : ''}`} style={{ animationDelay: '120ms', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* ── Returning hero card ── */}
        {returningHero && hero && tier && (
          <>
            <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-3)', marginBottom: 10 }}>
              WELCOME BACK
            </p>

            <div
              onClick={onContinue}
              style={{
                width: '100%', padding: '18px 20px',
                background: 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,94,40,0.03))',
                border: `1px solid ${ac}40`,
                borderRadius: 14, cursor: 'pointer', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                background: `${ac}18`, border: `1px solid ${ac}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                {alignIcon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="serif-bold" style={{ fontSize: 18, color: 'var(--text-1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hero.display_name}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: tier.color, fontWeight: 700 }}>{tier.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>·</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Level {hero.progression.fate_level}</span>
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
                      width: `${Math.min(100, (hero.progression.xp_in_current_level / Math.max(1, hero.progression.xp_needed_for_next)) * 100)}%`,
                      background: `linear-gradient(90deg, ${ac}88, ${ac})`,
                    }} />
                  </div>
                </div>
              </div>

              <span style={{ color: 'var(--gold)', fontSize: 18, flexShrink: 0, opacity: 0.6 }}>›</span>
            </div>

            {/* Switch / new account row */}
            <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 24 }}>
              <button
                onClick={onSwitch}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.06em',
                }}
              >
                Switch Hero
              </button>
              <button
                onClick={onNewUser}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.06em',
                }}
              >
                New Hero
              </button>
            </div>
          </>
        )}

        {/* ── First-time / no session ── */}
        {!returningHero && (
          <>
            {/* New user */}
            <button
              onClick={onNewUser}
              style={{
                width: '100%', padding: '22px 20px', marginBottom: 12,
                background: 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,160,78,0.03))',
                border: '1px solid rgba(200,160,78,0.25)',
                borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: 'rgba(200,160,78,0.12)', border: '1px solid rgba(200,160,78,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚔</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>New to the Codex</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>Claim your Fate ID and begin your record</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--gold)', opacity: 0.5, fontSize: 18, flexShrink: 0 }}>›</span>
            </button>

            {/* Existing user */}
            <button
              onClick={onExistingUser}
              style={{
                width: '100%', padding: '22px 20px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: 'rgba(37,32,24,0.8)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>◈</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>I Have a Fate ID</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>Continue your existing record</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)', opacity: 0.5, fontSize: 18, flexShrink: 0 }}>›</span>
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`land-item ${entered ? 'e' : ''}`} style={{ animationDelay: '240ms', marginTop: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', opacity: 0.5, lineHeight: 1.8 }}>
          Your Fate ID is registered with the PIK.<br />
          Each session is permanently recorded.
        </p>
      </div>
    </div>
  );
}

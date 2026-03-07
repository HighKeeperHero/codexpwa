import { useState, useEffect } from 'react';

interface Props {
  onNewUser:      () => void;
  onExistingUser: () => void;
}

export function LandingScreen({ onNewUser, onExistingUser }: Props) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEntered(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes landingIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .land-item { opacity: 0; }
        .land-item.entered { animation: landingIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Wordmark */}
      <div className={`land-item ${entered ? 'entered' : ''}`} style={{ animationDelay: '0ms', textAlign: 'center', marginBottom: 48 }}>
        <div className="orn-row" style={{ width: 180, margin: '0 auto 20px' }}>
          <div className="orn-line" />
          <span className="orn-glyph">◈</span>
          <div className="orn-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize: 42, color: 'var(--gold)', letterSpacing: '0.35em', marginBottom: 8 }}>
          CODEX
        </h1>
        <p style={{ fontSize: 10, letterSpacing: '0.4em', color: 'var(--text-3)', fontFamily: 'var(--font-serif)' }}>
          HEROES' VERITAS
        </p>
        <div className="orn-row" style={{ width: 180, margin: '16px auto 0' }}>
          <div className="orn-line" />
          <span className="orn-glyph">◈</span>
          <div className="orn-line" />
        </div>
      </div>

      {/* Choice cards */}
      <div className={`land-item ${entered ? 'entered' : ''}`} style={{ animationDelay: '150ms', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* New user */}
        <button
          onClick={onNewUser}
          style={{
            width: '100%', padding: '22px 20px',
            background: 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,160,78,0.03))',
            border: '1px solid rgba(200,160,78,0.25)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            textAlign: 'left', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,160,78,0.5)'; (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,160,78,0.12), rgba(200,160,78,0.05))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,160,78,0.25)'; (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,160,78,0.03))'; }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: 'rgba(200,160,78,0.12)',
            border: '1px solid rgba(200,160,78,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>⚔</div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gold)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>
              New to the Codex
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Claim your Fate ID and begin your record
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--gold)', opacity: 0.5, fontSize: 18, flexShrink: 0 }}>›</span>
        </button>

        {/* Existing user */}
        <button
          onClick={onExistingUser}
          style={{
            width: '100%', padding: '22px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            textAlign: 'left', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,146,122,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: 'rgba(37,32,24,0.8)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>◈</div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>
              I Have a Fate ID
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Continue your existing record
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-3)', opacity: 0.5, fontSize: 18, flexShrink: 0 }}>›</span>
        </button>
      </div>

      {/* Footer */}
      <div className={`land-item ${entered ? 'entered' : ''}`} style={{ animationDelay: '300ms', marginTop: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', opacity: 0.5, lineHeight: 1.8 }}>
          Your Fate ID is registered with the PIK.<br />
          Each session is permanently recorded.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

interface Props {
  onComplete: () => void;
  onBack?:    () => void;
}

export function LoginScreen({ onComplete, onBack }: Props) {
  const { heroes, signIn, isLoading } = useAuth();
  const [entered,  setEntered]  = useState(false);
  const [query,    setQuery]    = useState('');
  const [focused,  setFocused]  = useState(false);
  const [signingIn,setSigningIn]= useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, []);

  const filtered = query.trim().length === 0
    ? heroes
    : heroes.filter(h =>
        h.display_name.toLowerCase().includes(query.trim().toLowerCase())
      );

  const handleSelect = useCallback(async (rootId: string) => {
    if (signingIn) return;
    setSigningIn(true);
    await signIn(rootId);
    onComplete();
  }, [signIn, onComplete, signingIn]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="live-dot" style={{ width: 10, height: 10 }} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em' }}>LOADING RECORDS…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '0 20px 48px' }}>
      <style>{`
        @keyframes loginIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lg-item { opacity: 0; }
        .lg-item.e { animation: loginIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .hero-row { transition: background 0.15s ease; }
        .hero-row:active { background: rgba(200,160,78,0.06) !important; }
      `}</style>

      {/* Back */}
      {onBack && (
        <div style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)', marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            ← Back
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`lg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '0ms', textAlign: 'center', padding: onBack ? '8px 0 28px' : 'max(env(safe-area-inset-top),24px) 0 28px' }}>
        <div className="orn-row" style={{ width: 160, margin: '0 auto 16px' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <h1 className="serif-bold" style={{ fontSize: 32, color: 'var(--gold)', letterSpacing: '0.3em', marginBottom: 6 }}>CODEX</h1>
        <p style={{ fontSize: 9, letterSpacing: '0.35em', color: 'var(--text-3)' }}>HEROES' VERITAS</p>
        <div className="orn-row" style={{ width: 160, margin: '14px auto 0' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
      </div>

      {/* Subtitle */}
      <div className={`lg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '80ms', textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.05em', lineHeight: 1.7 }}>
          IDENTIFY YOUR HERO
        </p>
      </div>

      {/* Search */}
      <div className={`lg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '120ms', marginBottom: 16, position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by Fate Name…"
          style={{
            width: '100%', padding: '12px 16px',
            background: 'var(--surface)',
            border: `1px solid ${focused ? 'rgba(200,160,78,0.4)' : 'var(--border)'}`,
            borderRadius: 10, color: 'var(--text-1)', fontSize: 14,
            outline: 'none', transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
            boxShadow: focused ? '0 0 12px rgba(200,160,78,0.08)' : 'none',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        )}
      </div>

      {/* Hero list */}
      <div className={`lg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '160ms', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No heroes found
          </div>
        ) : filtered.map((h, i) => {
          const ac = ALIGNMENT_COLOR[h.alignment] ?? 'var(--bronze)';
          const al = ALIGNMENT_LABEL[h.alignment] ?? h.alignment;
          const isBusy = signingIn;
          return (
            <div
              key={h.root_id}
              className="hero-row"
              onClick={() => !isBusy && handleSelect(h.root_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.5 : 1,
                animationDelay: `${160 + i * 40}ms`,
              }}
            >
              {/* Alignment dot */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: ac, flexShrink: 0, boxShadow: `0 0 6px ${ac}60` }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="serif" style={{ fontSize: 16, color: 'var(--text-1)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.display_name}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                  {h.alignment && h.alignment !== 'NONE' && h.alignment !== '' && (
                    <span style={{ fontSize: 8, letterSpacing: '0.12em', color: ac, fontWeight: 700 }}>{al}</span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>LVL {h.progression.fate_level}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>·</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{h.progression.total_xp.toLocaleString()} XP</span>
                </div>
              </div>

              <span style={{ color: 'var(--text-3)', fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`lg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '280ms', marginTop: 'auto', paddingTop: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', opacity: 0.5, lineHeight: 1.8 }}>
          Your Fate ID is registered with the PIK.<br />
          Each session is permanently recorded.
        </p>
      </div>
    </div>
  );
}

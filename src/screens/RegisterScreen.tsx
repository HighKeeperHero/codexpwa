import { useState, useEffect, useRef } from 'react';
import { fetchHeroes } from '@/api/pik';

interface Props {
  onComplete: (heroName: string, rootId: string) => void;
  onBack:     () => void;
}

const ENROLLED_BY = 'self:codex-pwa';

export function RegisterScreen({ onComplete, onBack }: Props) {
  const [entered,   setEntered]   = useState(false);
  const [heroName,  setHeroName]  = useState('');
  const [taken,     setTaken]     = useState<string[]>([]);
  const [checking,  setChecking]  = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [focused,   setFocused]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  // Fetch taken names
  useEffect(() => {
    setChecking(true);
    fetchHeroes()
      .then(heroes => setTaken(heroes.map(h => h.display_name.toLowerCase())))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const trimmed    = heroName.trim();
  const nameLower  = trimmed.toLowerCase();
  const isTaken    = trimmed.length >= 2 && taken.includes(nameLower);
  const isValid    = trimmed.length >= 2 && trimmed.length <= 24 && !isTaken;

  // Suggestions if taken
  const suggestions: string[] = [];
  if (isTaken) {
    for (let i = 1; suggestions.length < 3; i++) {
      const c = `${trimmed}${i}`;
      if (!taken.includes(c.toLowerCase())) suggestions.push(c);
      if (i > 99) break;
    }
  }

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch('https://pik-prd-production.up.railway.app/api/users/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_name:    trimmed,
          fate_alignment: '',
          enrolled_by:  ENROLLED_BY,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message ?? json?.error ?? 'Enrollment failed');
      const data = json.data ?? json;
      const rootId = data.root_id as string;
      if (!rootId) throw new Error('No root_id returned');
      onComplete(trimmed, rootId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: '0 24px 48px',
    }}>
      <style>{`
        @keyframes regIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reg-item { opacity: 0; }
        .reg-item.e { animation: regIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Back */}
      <div style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)', marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380, margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '0ms', textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚔</div>
          <h1 className="serif-bold" style={{ fontSize: 26, color: 'var(--text-1)', letterSpacing: '0.05em', marginBottom: 10 }}>
            Claim Your Fate Name
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>
            The name the realms will know you by.<br />
            It is yours — and yours alone.
          </p>
        </div>

        {/* Input */}
        <div className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '100ms' }}>
          <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.15em', fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
            FATE NAME
          </label>
          <input
            ref={inputRef}
            type="text"
            value={heroName}
            onChange={e => setHeroName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Name your hero"
            maxLength={24}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--surface)',
              border: `1px solid ${focused ? 'rgba(200,160,78,0.5)' : 'var(--border)'}`,
              borderRadius: 10, color: 'var(--text-1)', fontSize: 16,
              outline: 'none', transition: 'border-color 0.2s ease',
              fontFamily: 'var(--font-serif)',
              boxShadow: focused ? '0 0 16px rgba(200,160,78,0.1)' : 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Validation feedback */}
        {trimmed.length >= 2 && (
          <div className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '0ms', marginTop: 10, marginBottom: 4, padding: '10px 14px', borderRadius: 8,
            background: isTaken ? 'rgba(200,94,40,0.08)' : 'rgba(72,110,72,0.1)',
            border: `1px solid ${isTaken ? 'rgba(200,94,40,0.25)' : 'rgba(72,110,72,0.25)'}`,
          }}>
            {isTaken ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: suggestions.length ? 8 : 0 }}>
                  ✘ "{trimmed}" is already claimed
                </p>
                {suggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {suggestions.map(s => (
                      <button key={s} onClick={() => setHeroName(s)} style={{
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(200,160,78,0.1)', border: '1px solid rgba(200,160,78,0.25)',
                        color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>{s}</button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: '#6A8A5A', fontWeight: 600 }}>
                ✔ "{trimmed}" is available
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {isValid && (
          <div className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '0ms', margin: '16px 0', padding: '16px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(200,160,78,0.06), rgba(200,94,40,0.03))',
            border: '1px solid rgba(200,160,78,0.15)', textAlign: 'center',
          }}>
            <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-3)', marginBottom: 8 }}>FATE ID PREVIEW</p>
            <p className="serif-bold" style={{ fontSize: 22, color: 'var(--text-1)', letterSpacing: '0.05em', marginBottom: 4 }}>{trimmed}</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>Level 1 · Bronze · Fate Unaligned</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(200,94,40,0.08)', border: '1px solid rgba(200,94,40,0.25)', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--ember)' }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '200ms', marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting || checking}
            style={{
              width: '100%', padding: '15px',
              background: isValid && !submitting
                ? 'linear-gradient(135deg, rgba(200,160,78,0.9), rgba(200,94,40,0.7))'
                : 'var(--surface)',
              border: `1px solid ${isValid ? 'rgba(200,160,78,0.4)' : 'var(--border)'}`,
              borderRadius: 10, cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              color: isValid && !submitting ? '#0B0A08' : 'var(--text-3)',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {submitting ? 'Sealing your fate…' : checking ? 'Checking names…' : 'Begin Your Record'}
          </button>
        </div>

        {/* Fine print */}
        <p className={`reg-item ${entered ? 'e' : ''}`} style={{ animationDelay: '300ms', marginTop: 20, fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7, opacity: 0.6 }}>
          Your Fate Name is permanent and registered<br />
          in the PIK across all venues.
        </p>
      </div>
    </div>
  );
}

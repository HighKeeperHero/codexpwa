// ============================================================
// LandmarkCard — Sprint 25
// Cinematic landmark discovery overlay.
//
// Flow:
//   'approach'  → Hero is in range. Shows landmark info + REVEAL button.
//   'loading'   → API call in-flight.
//   'revealed'  → Fragment text animates in sentence by sentence.
//   'complete'  → All sentences shown. SEAL AND DEPART button.
//
// Place at: src/screens/LandmarkCard.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NearbyLandmark {
  landmark_id:    string;
  name:           string;
  region:         string;
  tier:           number;
  type:           string;   // 'hv_venue' | 'public' | 'operator'
  distance_meters: number;
  radius_meters:  number;
  visits:         number;   // 0–3
  fragment_index: number | null;
}

interface Props {
  landmark:   NearbyLandmark;
  rootId:     string;
  onDismiss:  () => void;
}

const PIK_BASE = 'https://pik-prd-production.up.railway.app';

// ── Region color palette ──────────────────────────────────────────────────────

const REGION_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  'Wylds':          { primary: '#3A9E6A', glow: 'rgba(58,158,106,0.35)', bg: 'rgba(58,158,106,0.08)' },
  'Kingvale':       { primary: '#2E6EC8', glow: 'rgba(46,110,200,0.35)', bg: 'rgba(46,110,200,0.08)' },
  'Lochmaw':        { primary: '#1E8080', glow: 'rgba(30,128,128,0.35)', bg: 'rgba(30,128,128,0.08)' },
  'Origin Sands':   { primary: '#C8820A', glow: 'rgba(200,130,10,0.35)', bg: 'rgba(200,130,10,0.08)' },
  'Desolate Peaks': { primary: '#7A5050', glow: 'rgba(122,80,80,0.35)',  bg: 'rgba(122,80,80,0.08)'  },
  'Veil':           { primary: '#6040C0', glow: 'rgba(96,64,192,0.35)',  bg: 'rgba(96,64,192,0.08)'  },
};

const DEFAULT_COLOR = { primary: '#C8900A', glow: 'rgba(200,144,10,0.35)', bg: 'rgba(200,144,10,0.08)' };

// ── Tier labels ───────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  hv_venue: 'SOURCE',
  public:   'REGIONAL',
  operator: 'FIELD',
};

// ── Split fragment text into sentences for animated reveal ───────────────────

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end of string
  const raw = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
  return raw.map((s) => s.trim()).filter(Boolean);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LandmarkCard({ landmark, rootId, onDismiss }: Props) {
  const color   = REGION_COLORS[landmark.region] ?? DEFAULT_COLOR;
  const tierLabel = TIER_LABELS[landmark.type] ?? 'LANDMARK';

  type Phase = 'approach' | 'loading' | 'revealed' | 'complete';
  const [phase,    setPhase]    = useState<Phase>('approach');
  const [sentences, setSentences] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [error,    setError]    = useState<string | null>(null);

  // Animate sentences in one at a time after reveal
  useEffect(() => {
    if (phase !== 'revealed' || sentences.length === 0) return;
    if (visibleCount >= sentences.length) {
      const t = setTimeout(() => setPhase('complete'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleCount((n) => n + 1), 380);
    return () => clearTimeout(t);
  }, [phase, visibleCount, sentences.length]);

  const handleReveal = async () => {
    if (phase !== 'approach') return;
    setPhase('loading');
    setError(null);

    try {
      const res = await fetch(`${PIK_BASE}/api/landmarks/discover`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ root_id: rootId, landmark_id: landmark.landmark_id }),
      });
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      if (json.status !== 'ok') throw new Error(json.message ?? 'Unknown error');

      const text: string = json.data.fragment_text;
      const parts = splitIntoSentences(text);
      setSentences(parts);
      setVisibleCount(0);
      setPhase('revealed');
    } catch (err: any) {
      setError('The Veil resists. Try again.');
      setPhase('approach');
    }
  };

  return createPortal(
    <>
      <style>{`
        @keyframes lcFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lcPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes lcGlow {
          0%,100% { box-shadow: 0 0 20px ${color.glow}; }
          50%      { box-shadow: 0 0 40px ${color.glow}; }
        }
      `}</style>

      <div style={css.overlay} onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
        <div style={css.panel}>

          {/* ── Region header strip ── */}
          <div style={{ ...css.regionStrip, background: color.bg, borderBottom: `1px solid ${color.primary}30` }}>
            <span style={{ ...css.regionLabel, color: color.primary }}>{landmark.region.toUpperCase()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...css.tierBadge, borderColor: `${color.primary}60`, color: color.primary }}>
                {tierLabel}
              </span>
              <span style={css.distanceBadge}>{landmark.distance_meters}m</span>
            </div>
          </div>

          {/* ── Landmark name ── */}
          <div style={css.nameBlock}>
            <div style={css.fragmentCounter}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    ...css.fragmentDot,
                    background: i <= landmark.visits ? color.primary : 'rgba(255,255,255,0.12)',
                    boxShadow:  i <= landmark.visits ? `0 0 6px ${color.primary}` : 'none',
                  }}
                />
              ))}
              <span style={css.fragmentLabel}>
                {landmark.visits}/3 FRAGMENTS
              </span>
            </div>

            <h2 style={{ ...css.landmarkName, textShadow: `0 0 30px ${color.glow}` }}>
              {landmark.name}
            </h2>

            {landmark.fragment_index && (
              <p style={{ ...css.fragmentIndexLabel, color: color.primary }}>
                FRAGMENT {landmark.fragment_index} OF 3
              </p>
            )}
          </div>

          {/* ── Divider ── */}
          <div style={{ ...css.divider, background: `linear-gradient(90deg, transparent, ${color.primary}40, transparent)` }} />

          {/* ── Phase: approach ── */}
          {phase === 'approach' && (
            <div style={css.approachBlock}>
              <p style={css.approachLore}>
                {landmark.visits === 0
                  ? 'The Codex has registered this location. Something here is worth knowing.'
                  : landmark.visits === 1
                  ? 'You have been here before. The Veil has more to show you.'
                  : 'A third truth waits here. This will complete your knowledge of this place.'}
              </p>
              {error && <p style={css.errorText}>{error}</p>}
              <button
                style={{ ...css.revealButton, background: color.primary, animation: 'lcGlow 2.5s ease-in-out infinite' }}
                onClick={handleReveal}
              >
                REVEAL FRAGMENT {landmark.fragment_index}
              </button>
              <button style={css.passButton} onClick={onDismiss}>
                PASS BY
              </button>
            </div>
          )}

          {/* ── Phase: loading ── */}
          {phase === 'loading' && (
            <div style={css.loadingBlock}>
              <div style={{ ...css.loadingGlyph, color: color.primary, animation: 'lcPulse 1s ease-in-out infinite' }}>
                ◈
              </div>
              <p style={css.loadingText}>The Veil yields…</p>
            </div>
          )}

          {/* ── Phase: revealed / complete ── */}
          {(phase === 'revealed' || phase === 'complete') && (
            <div style={css.fragmentBlock}>
              <p style={{ ...css.fragmentEyebrow, color: color.primary }}>
                FRAGMENT {landmark.fragment_index} — {landmark.name.toUpperCase()}
              </p>
              <div style={css.fragmentTextContainer}>
                {sentences.slice(0, visibleCount).map((sentence, i) => (
                  <span
                    key={i}
                    style={{
                      ...css.fragmentSentence,
                      animation: 'lcFadeUp 0.5s ease forwards',
                    }}
                  >
                    {sentence}{' '}
                  </span>
                ))}
              </div>

              {phase === 'complete' && (
                <div style={{ animation: 'lcFadeUp 0.5s ease forwards' }}>
                  <div style={{ ...css.divider, background: `linear-gradient(90deg, transparent, ${color.primary}30, transparent)`, margin: '20px 0 16px' }} />
                  {landmark.visits + 1 >= 3 && (
                    <p style={css.completionNote}>
                      This location is fully known to you.
                    </p>
                  )}
                  <button style={css.passButton} onClick={onDismiss}>
                    SEAL AND DEPART
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    zIndex:         300,
    background:     'rgba(6,8,15,0.88)',
    backdropFilter: 'blur(8px)',
    display:        'flex',
    alignItems:     'flex-end',
    justifyContent: 'center',
  },
  panel: {
    width:           '100%',
    maxWidth:        480,
    background:      '#0A0D16',
    border:          '1px solid rgba(255,255,255,0.08)',
    borderRadius:    '20px 20px 0 0',
    paddingBottom:   'calc(32px + var(--tab-h, 64px) + env(safe-area-inset-bottom, 0px))',
    overflow:        'hidden',
  },

  // Region strip
  regionStrip: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '10px 20px',
  },
  regionLabel: {
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: '0.25em',
    fontFamily:    "'Cinzel', serif",
  },
  tierBadge: {
    fontSize:      7,
    fontWeight:    700,
    letterSpacing: '0.2em',
    border:        '1px solid',
    borderRadius:  4,
    padding:       '2px 6px',
    fontFamily:    "'Cinzel', serif",
  },
  distanceBadge: {
    fontSize:      9,
    color:         'rgba(232,224,204,0.45)',
    fontFamily:    'monospace',
    fontWeight:    700,
  },

  // Name block
  nameBlock: {
    padding:   '20px 20px 16px',
    textAlign: 'center',
  },
  fragmentCounter: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    marginBottom:   14,
  },
  fragmentDot: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    transition:   'all 0.3s ease',
  },
  fragmentLabel: {
    fontSize:      8,
    letterSpacing: '0.2em',
    color:         'rgba(232,224,204,0.45)',
    fontFamily:    "'Cinzel', serif",
    marginLeft:    4,
  },
  landmarkName: {
    fontFamily:    "'Cinzel Decorative', serif",
    fontSize:      22,
    fontWeight:    700,
    color:         '#E8E0CC',
    margin:        '0 0 8px',
    lineHeight:    1.2,
  },
  fragmentIndexLabel: {
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: '0.2em',
    margin:        0,
    fontFamily:    "'Cinzel', serif",
  },

  // Divider
  divider: {
    height: 1,
    margin: '0 20px',
  },

  // Approach phase
  approachBlock: {
    padding:   '20px 20px 0',
    textAlign: 'center',
    display:   'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  approachLore: {
    fontFamily: "'IM Fell English', serif",
    fontStyle:  'italic',
    fontSize:   13,
    color:      'rgba(232,224,204,0.6)',
    lineHeight: 1.7,
    maxWidth:   300,
    margin:     0,
  },
  errorText: {
    fontSize:   11,
    color:      '#C84020',
    margin:     0,
  },
  revealButton: {
    border:        'none',
    borderRadius:  8,
    padding:       '14px 40px',
    fontSize:      11,
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#06080F',
    cursor:        'pointer',
    fontFamily:    "'Cinzel', serif",
    width:         '100%',
    maxWidth:      280,
  },
  passButton: {
    background:    'transparent',
    border:        'none',
    fontSize:      10,
    color:         'rgba(232,224,204,0.3)',
    letterSpacing: '0.15em',
    cursor:        'pointer',
    fontFamily:    "'Cinzel', serif",
    padding:       '8px 20px',
  },

  // Loading phase
  loadingBlock: {
    padding:        '32px 20px',
    textAlign:      'center',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            12,
  },
  loadingGlyph: {
    fontSize: 32,
  },
  loadingText: {
    fontFamily: "'IM Fell English', serif",
    fontStyle:  'italic',
    fontSize:   13,
    color:      'rgba(232,224,204,0.5)',
    margin:     0,
  },

  // Fragment reveal phase
  fragmentBlock: {
    padding:   '20px 20px 0',
    textAlign: 'left',
  },
  fragmentEyebrow: {
    fontSize:      8,
    fontWeight:    700,
    letterSpacing: '0.2em',
    fontFamily:    "'Cinzel', serif",
    margin:        '0 0 14px',
  },
  fragmentTextContainer: {
    lineHeight: 1.9,
  },
  fragmentSentence: {
    fontFamily: "'IM Fell English', serif",
    fontStyle:  'italic',
    fontSize:   14,
    color:      '#C8C0B8',
  },
  completionNote: {
    fontSize:   10,
    color:      'rgba(232,224,204,0.35)',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.15em',
    textAlign:  'center',
    margin:     '0 0 4px',
  },
};

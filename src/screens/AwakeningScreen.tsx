// ============================================================
// AwakeningScreen — Sprint 21.1 + 21.2 + 21.3
//
// Four-step cinematic onboarding for new heroes.
// CRITICAL: Self-contained — zero dependency on live systems.
//   - No GPS, no Mapbox, no real backend calls during sequence
//   - All battle logic is scripted with guaranteed player victory
//   - Narrative reveal uses generateNarrative() (deterministic, no API)
//
// Flow:
//   Step 1 — Veil Disturbance   (atmospheric intro)
//   Step 2 — Veil Detection     (scripted tear encounter)
//   Step 3 — First Encounter    (scripted battle, guaranteed win)
//   Step 4 — Hero Recognition   (HeroFateReveal — narrative identity)
//
// Place at: src/screens/AwakeningScreen.tsx
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { generateNarrative } from '../api/pik';
import type { Hero } from '../api/pik';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  hero:       Hero;
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4;

// ── Constants ─────────────────────────────────────────────────────────────────

const VEIL_LORE = [
  'Something tears.',
  'Not fabric. Not flesh.',
  'The boundary between what is real and what waits behind it.',
  'You feel it before you see it.',
  'A pull. A pressure behind your eyes.',
  'The Veil has noticed you.',
];

const TEAR_LINES = [
  'A fracture in the air ahead.',
  'Something presses through from the other side.',
  'It has no name yet.',
  'Seal it — before it widens.',
];

const BATTLE_LINES = {
  opening:  'The shade coalesces. It remembers nothing but hunger.',
  attack:   ['You drive it back.', 'Your strike finds purchase.', 'The shade recoils.', 'It weakens.'],
  enemy:    ['The shade surges forward.', 'It strikes — you absorb the blow.', 'It tests your resolve.'],
  victory:  'The fracture seals. Silence returns. You are still standing.',
};

const NARRATIVE_LABELS: Record<string, string> = {
  region:  'YOUR ORIGIN',
  class:   'YOUR CLASS',
  origin:  'YOUR HISTORY',
  wound:   'YOUR WOUND',
  calling: 'YOUR CALLING',
};

// ── Step 1 — Veil Disturbance ─────────────────────────────────────────────────

function StepVeilDisturbance({ onNext }: { onNext: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible,   setVisible]   = useState(false);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lineIndex >= VEIL_LORE.length - 1) {
      const t = setTimeout(() => setCanAdvance(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineIndex(i => i + 1), 1400);
    return () => clearTimeout(t);
  }, [lineIndex]);

  return (
    <div style={css.fullscreen}>
      {/* Pulsing veil glyph */}
      <div style={{ ...css.glyphContainer, opacity: visible ? 1 : 0 }}>
        <div style={css.glyphRing} />
        <div style={{ ...css.glyphRing, animationDelay: '0.7s', opacity: 0.5 }} />
        <div style={css.glyphCore}>⊗</div>
      </div>

      {/* Narrative lines */}
      <div style={css.loreContainer}>
        {VEIL_LORE.slice(0, lineIndex + 1).map((line, i) => (
          <p key={i} style={{
            ...css.loreLine,
            opacity: i === lineIndex ? 1 : 0.35,
            fontSize: i === 0 ? '22px' : '15px',
            fontWeight: i === 0 ? 700 : 400,
            animation: 'awFadeUp 0.6s ease forwards',
          }}>
            {line}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div style={{ ...css.ctaContainer, opacity: canAdvance ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <button style={css.ctaButton} onClick={onNext}>
          LOOK BEYOND
        </button>
        <p style={css.skipHint} onClick={onNext}>skip intro</p>
      </div>
    </div>
  );
}

// ── Step 2 — Veil Detection ───────────────────────────────────────────────────

function StepVeilDetection({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'tear' | 'ready'>('intro');
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tear'),  800);
    const t2 = setTimeout(() => setPhase('ready'), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== 'tear') return;
    if (lineIndex >= TEAR_LINES.length - 1) return;
    const t = setTimeout(() => setLineIndex(i => i + 1), 900);
    return () => clearTimeout(t);
  }, [phase, lineIndex]);

  return (
    <div style={css.fullscreen}>
      {/* Minimal map stand-in — dark grid suggesting a location */}
      <div style={css.mapStandin}>
        <div style={css.mapGrid} />
        {/* Player dot */}
        <div style={css.playerDot} />
        {/* Tear marker */}
        <div style={{
          ...css.tearMarker,
          opacity:    phase === 'intro' ? 0 : 1,
          transform:  phase === 'intro' ? 'scale(0.5)' : 'scale(1)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <div style={css.tearRing} />
          <div style={{ ...css.tearRing, animationDelay: '0.5s' }} />
          <span style={css.tearGlyph}>⚡</span>
        </div>
      </div>

      {/* Narrative overlay */}
      <div style={css.detectionOverlay}>
        <div style={css.detectionText}>
          {TEAR_LINES.slice(0, lineIndex + 1).map((line, i) => (
            <p key={i} style={{
              ...css.loreLine,
              opacity:   i === lineIndex ? 1 : 0.3,
              animation: 'awFadeUp 0.5s ease forwards',
            }}>
              {line}
            </p>
          ))}
        </div>

        <div style={{ ...css.ctaContainer, opacity: phase === 'ready' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <button style={css.ctaButton} onClick={onNext}>
            APPROACH
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — First Encounter (scripted battle) ────────────────────────────────

function StepFirstEncounter({ onNext }: { onNext: () => void }) {
  const ENEMY_MAX = 60;
  const [enemyHp,    setEnemyHp]    = useState(ENEMY_MAX);
  const [playerHp,   setPlayerHp]   = useState(100);
  const [log,        setLog]        = useState(BATTLE_LINES.opening);
  const [phase,      setPhase]      = useState<'idle' | 'attacking' | 'enemy' | 'victory'>('idle');
  const [shards,     setShards]     = useState(0);
  const [flash,      setFlash]      = useState<'hit' | 'hurt' | null>(null);
  const turnRef = useRef(0);

  const handleAttack = () => {
    if (phase !== 'idle') return;
    setPhase('attacking');

    const turn   = turnRef.current++;
    const damage = 15 + Math.floor(Math.random() * 10);
    const newHp  = Math.max(0, enemyHp - damage);

    setFlash('hit');
    setTimeout(() => setFlash(null), 300);
    setLog(BATTLE_LINES.attack[turn % BATTLE_LINES.attack.length]);
    setEnemyHp(newHp);

    if (newHp <= 0) {
      setTimeout(() => {
        setShards(12);
        setPhase('victory');
        setLog(BATTLE_LINES.victory);
      }, 600);
      return;
    }

    // Enemy counter
    setTimeout(() => {
      const eDmg   = 8 + Math.floor(Math.random() * 6);
      const newPhp = Math.max(10, playerHp - eDmg); // can't die
      setFlash('hurt');
      setTimeout(() => setFlash(null), 300);
      setLog(BATTLE_LINES.enemy[turn % BATTLE_LINES.enemy.length]);
      setPlayerHp(newPhp);
      setPhase('idle');
    }, 900);
  };

  const enemyPct  = (enemyHp  / ENEMY_MAX) * 100;
  const playerPct = playerHp;

  return (
    <div style={css.fullscreen}>
      <div style={{
        ...css.battleContainer,
        background: flash === 'hit'  ? 'rgba(30,144,255,0.08)' :
                    flash === 'hurt' ? 'rgba(200,94,40,0.10)'  : 'transparent',
        transition: 'background 0.15s ease',
      }}>
        {/* Enemy */}
        <div style={css.enemySection}>
          <div style={css.enemyGlyph}>👁</div>
          <p style={css.enemyName}>VEIL SHADE</p>
          <div style={css.hpTrack}>
            <div style={{ ...css.hpFill, width: `${enemyPct}%`, background: '#1E90FF' }} />
          </div>
          <p style={css.hpLabel}>{enemyHp} / {ENEMY_MAX}</p>
        </div>

        {/* Battle log */}
        <div style={css.battleLog}>
          <p style={css.battleLogText}>{log}</p>
          {phase === 'victory' && shards > 0 && (
            <p style={css.shardsEarned}>+{shards} Veil Shards</p>
          )}
        </div>

        {/* Player */}
        <div style={css.playerSection}>
          <div style={css.hpTrack}>
            <div style={{ ...css.hpFill, width: `${playerPct}%`, background: 'var(--gold, #FFA500)' }} />
          </div>
          <p style={css.hpLabel}>HP {playerHp} / 100</p>
        </div>

        {/* Actions */}
        {phase !== 'victory' ? (
          <button
            style={{ ...css.ctaButton, opacity: phase === 'idle' ? 1 : 0.5 }}
            onClick={handleAttack}
            disabled={phase !== 'idle'}
          >
            STRIKE
          </button>
        ) : (
          <button style={css.ctaButton} onClick={onNext}>
            THE VEIL YIELDS →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 4 — Hero Recognition (HeroFateReveal) ────────────────────────────────

function StepHeroRecognition({ hero, onComplete }: { hero: Hero; onComplete: () => void }) {
  const narrative = generateNarrative(hero.root_id);
  const fields = [
    { key: 'region',  label: NARRATIVE_LABELS.region,  value: narrative.region  },
    { key: 'class',   label: NARRATIVE_LABELS.class,   value: narrative.class   },
    { key: 'origin',  label: NARRATIVE_LABELS.origin,  value: narrative.origin  },
    { key: 'wound',   label: NARRATIVE_LABELS.wound,   value: narrative.wound   },
    { key: 'calling', label: NARRATIVE_LABELS.calling, value: narrative.calling },
  ];

  const [revealed,   setRevealed]   = useState(0);
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    if (revealed >= fields.length) {
      const t = setTimeout(() => setCanComplete(true), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed(n => n + 1), 500);
    return () => clearTimeout(t);
  }, [revealed, fields.length]);

  return (
    <div style={css.fullscreen}>
      <div style={css.revealContainer}>
        <p style={css.revealEyebrow}>THE VEIL READS YOU</p>
        <h2 style={css.revealHeroName}>{hero.display_name}</h2>
        <div style={{ ...css.revealDivider, background: 'rgba(200,144,10,0.4)' }} />

        <div style={css.revealFields}>
          {fields.slice(0, revealed).map((f, i) => (
            <div key={f.key} style={{
              ...css.revealField,
              animation: 'awFadeUp 0.4s ease forwards',
            }}>
              <span style={css.revealFieldLabel}>{f.label}</span>
              <span style={css.revealFieldValue}>{f.value}</span>
            </div>
          ))}
        </div>

        <div style={{
          ...css.ctaContainer,
          opacity:    canComplete ? 1 : 0,
          transition: 'opacity 0.6s ease',
          marginTop:  '32px',
        }}>
          <button style={css.ctaButton} onClick={onComplete}>
            ENTER THE CODEX
          </button>
          <p style={{ ...css.skipHint, marginTop: 8 }}>
            Your identity is written. It cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AwakeningScreen({ hero, onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);

  const next = () => setStep(s => Math.min(s + 1, 4) as Step);

  return createPortal(
    <>
      <style>{`
        @keyframes awFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes awPulse {
          0%,100% { transform: scale(1);   opacity: 0.8; }
          50%      { transform: scale(1.15); opacity: 0.4; }
        }
        @keyframes awRing {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes awGlowPulse {
          0%,100% { box-shadow: 0 0 20px rgba(30,144,255,0.4); }
          50%      { box-shadow: 0 0 50px rgba(30,144,255,0.8); }
        }
      `}</style>

      <div style={css.overlay}>
        {/* Step indicator */}
        <div style={css.stepDots}>
          {([1, 2, 3, 4] as Step[]).map(s => (
            <div key={s} style={{
              ...css.stepDot,
              background: step >= s ? 'rgba(200,144,10,0.9)' : 'rgba(255,255,255,0.15)',
              transform:  step === s ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>

        {step === 1 && <StepVeilDisturbance onNext={next} />}
        {step === 2 && <StepVeilDetection   onNext={next} />}
        {step === 3 && <StepFirstEncounter  onNext={next} />}
        {step === 4 && <StepHeroRecognition hero={hero} onComplete={onComplete} />}
      </div>
    </>,
    document.body
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  overlay: {
    position:        'fixed',
    inset:           0,
    zIndex:          9000,
    background:      '#06080F',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  fullscreen: {
    width:           '100%',
    height:          '100%',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '24px 28px',
    position:        'relative',
  },

  // Step dots
  stepDots: {
    position:   'absolute',
    top:        '20px',
    left:       '50%',
    transform:  'translateX(-50%)',
    display:    'flex',
    gap:        '8px',
    zIndex:     10,
  },
  stepDot: {
    width:        '6px',
    height:       '6px',
    borderRadius: '50%',
    transition:   'all 0.3s ease',
  },

  // Glyph
  glyphContainer: {
    position:   'relative',
    width:      '120px',
    height:     '120px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom:   '40px',
    transition:     'opacity 0.8s ease',
  },
  glyphRing: {
    position:     'absolute',
    inset:        '-10px',
    borderRadius: '50%',
    border:       '1px solid rgba(30,144,255,0.4)',
    animation:    'awRing 2.5s ease-out infinite',
  },
  glyphCore: {
    fontSize:   '56px',
    color:      'rgba(30,144,255,0.7)',
    animation:  'awPulse 3s ease-in-out infinite',
    zIndex:     1,
  },

  // Lore text
  loreContainer: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '12px',
    maxWidth:      '320px',
    textAlign:     'center',
    marginBottom:  '40px',
  },
  loreLine: {
    fontFamily:    "'Cinzel', serif",
    color:         '#C8C0B8',
    lineHeight:    1.6,
    margin:        0,
    transition:    'opacity 0.4s ease',
  },

  // CTA
  ctaContainer: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '8px',
  },
  ctaButton: {
    background:    '#C8900A',
    border:        'none',
    borderRadius:  '6px',
    padding:       '14px 40px',
    fontSize:      '13px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#06080F',
    cursor:        'pointer',
    fontFamily:    "'Cinzel', serif",
  },
  skipHint: {
    fontSize:   '11px',
    color:      '#3A4A6A',
    cursor:     'pointer',
    margin:     0,
  },

  // Map stand-in
  mapStandin: {
    position:     'absolute',
    inset:        0,
    background:   '#08090F',
    overflow:     'hidden',
  },
  mapGrid: {
    position:           'absolute',
    inset:              0,
    backgroundImage:    'linear-gradient(rgba(30,46,72,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,46,72,0.3) 1px, transparent 1px)',
    backgroundSize:     '40px 40px',
    opacity:            0.5,
  },
  playerDot: {
    position:     'absolute',
    bottom:       '40%',
    left:         '50%',
    transform:    'translate(-50%, 0)',
    width:        '14px',
    height:       '14px',
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(200,144,10,0.9), rgba(200,144,10,0.3))',
    border:       '2px solid rgba(200,144,10,0.9)',
    boxShadow:    '0 0 12px rgba(200,144,10,0.6)',
  },
  tearMarker: {
    position:       'absolute',
    top:            '28%',
    left:           '62%',
    width:          '44px',
    height:         '44px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  tearRing: {
    position:     'absolute',
    inset:        '-6px',
    borderRadius: '50%',
    border:       '1px solid rgba(30,144,255,0.6)',
    animation:    'awRing 1.8s ease-out infinite',
  },
  tearGlyph: {
    fontSize:   '22px',
    color:      '#1E90FF',
    zIndex:     1,
    animation:  'awPulse 2s ease-in-out infinite',
  },
  detectionOverlay: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'flex-end',
    padding:        '0 28px 60px',
    background:     'linear-gradient(transparent 40%, rgba(6,8,15,0.95) 100%)',
  },
  detectionText: {
    textAlign:    'center',
    marginBottom: '32px',
  },

  // Battle
  battleContainer: {
    width:          '100%',
    maxWidth:       '380px',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '20px',
    borderRadius:   '12px',
    padding:        '24px',
    transition:     'background 0.15s ease',
  },
  enemySection: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '8px',
    width:         '100%',
  },
  enemyGlyph: {
    fontSize: '48px',
    filter:   'drop-shadow(0 0 12px rgba(30,144,255,0.6))',
  },
  enemyName: {
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '3px',
    color:         '#5A7AAA',
    margin:        0,
    fontFamily:    "'Cinzel', serif",
  },
  hpTrack: {
    width:        '100%',
    height:       '6px',
    background:   'rgba(255,255,255,0.08)',
    borderRadius: '4px',
    overflow:     'hidden',
  },
  hpFill: {
    height:       '100%',
    borderRadius: '4px',
    transition:   'width 0.4s ease',
  },
  hpLabel: {
    fontSize: '11px',
    color:    '#3A4A6A',
    margin:   0,
  },
  battleLog: {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(30,46,72,0.8)',
    borderRadius: '8px',
    padding:      '14px 16px',
    width:        '100%',
    minHeight:    '60px',
    display:      'flex',
    flexDirection: 'column',
    alignItems:   'center',
    justifyContent: 'center',
    gap:          '6px',
  },
  battleLogText: {
    fontSize:   '13px',
    color:      '#8FA8CC',
    textAlign:  'center',
    fontStyle:  'italic',
    margin:     0,
    fontFamily: "'Cinzel', serif",
  },
  shardsEarned: {
    fontSize:   '12px',
    color:      '#1E90FF',
    fontWeight: 700,
    margin:     0,
  },
  playerSection: {
    width: '100%',
  },

  // Hero reveal
  revealContainer: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    width:         '100%',
    maxWidth:      '380px',
    padding:       '0 4px',
  },
  revealEyebrow: {
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '3px',
    color:         '#3A4A6A',
    margin:        '0 0 12px',
    fontFamily:    "'Cinzel', serif",
  },
  revealHeroName: {
    fontSize:      '32px',
    fontWeight:    800,
    color:         '#C8900A',
    margin:        '0 0 16px',
    letterSpacing: '1px',
    fontFamily:    "'Cinzel', serif",
    textShadow:    '0 0 30px rgba(200,144,10,0.4)',
  },
  revealDivider: {
    width:        '60px',
    height:       '1px',
    marginBottom: '24px',
  },
  revealFields: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '12px',
    width:         '100%',
  },
  revealField: {
    display:        'flex',
    flexDirection:  'column',
    gap:            '2px',
    borderLeft:     '2px solid rgba(200,144,10,0.3)',
    paddingLeft:    '12px',
  },
  revealFieldLabel: {
    fontSize:      '8px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#3A4A6A',
    fontFamily:    "'Cinzel', serif",
  },
  revealFieldValue: {
    fontSize:   '14px',
    color:      '#C8C0B8',
    fontFamily: "'Cinzel', serif",
  },
};

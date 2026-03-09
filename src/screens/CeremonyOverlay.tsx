// src/screens/CeremonyOverlay.tsx
// ============================================================
// Sprint 9 — Feature 2: Level-Up & Wristband Tap Ceremonies
//
// Monitors hero state changes after initial load and fires
// fullscreen ceremonies for:
//   • fate_level increment  → Level-Up Ceremony
//   • sessions_completed increment → Session/Wristband Ceremony
//
// Uses createPortal to escape any CSS transform stacking context.
// Self-contained — no AuthContext changes required.
//
// Usage: drop <CeremonyOverlay /> anywhere inside AuthProvider.
//        HomeScreen is fine; it renders via portal to document.body.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/AuthContext';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, type Tier } from '@/api/pik';

// ── Types ─────────────────────────────────────────────────────

interface LevelUpCeremony {
  type:      'levelup';
  fromLevel: number;
  toLevel:   number;
  tier:      Tier;
  ac:        string;
  totalXp:   number;
}

interface SessionCeremony {
  type:       'session';
  venueName:  string;
  totalXp:    number;
  ac:         string;
}

type Ceremony = LevelUpCeremony | SessionCeremony;

// ── Palette ───────────────────────────────────────────────────
const CREAM     = '#E8E0CC';
const CREAM_DIM = 'rgba(232,224,204,0.55)';

// 16 particle angles (22.5° apart)
const PARTICLE_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);

// ── Root component ────────────────────────────────────────────

export function CeremonyOverlay() {
  const { hero } = useAuth() as any;

  const prevLevelRef    = useRef<number | null>(null);
  const prevSessionsRef = useRef<number | null>(null);
  const hasInitRef      = useRef(false);

  const [queue,   setQueue]   = useState<Ceremony[]>([]);
  const [current, setCurrent] = useState<Ceremony | null>(null);

  // ── Detect hero changes ──────────────────────────────────
  useEffect(() => {
    if (!hero) return;
    const level    = hero.progression?.fate_level ?? 1;
    const sessions = hero.progression?.sessions_completed ?? 0;

    if (!hasInitRef.current) {
      prevLevelRef.current    = level;
      prevSessionsRef.current = sessions;
      hasInitRef.current      = true;
      return;
    }

    const staged: Ceremony[] = [];

    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      staged.push({
        type:      'levelup',
        fromLevel: prevLevelRef.current,
        toLevel:   level,
        tier:      TIER_FOR_LEVEL(level),
        ac:        ALIGNMENT_COLOR[hero.alignment] ?? '#C8A04E',
        totalXp:   hero.progression?.total_xp ?? 0,
      });
    }

    if (prevSessionsRef.current !== null && sessions > prevSessionsRef.current) {
      // Find the most recent venue name from source_progression
      const recentSourceId = hero.recent_events?.[0]?.source_id ?? null;
      const venueEntry     = recentSourceId
        ? (hero.source_progression ?? []).find((s: any) => s.source_id === recentSourceId)
        : (hero.source_progression ?? [])[0];
      const venueName      = venueEntry?.source_name ?? 'Heroes\' Veritas';

      staged.push({
        type:      'session',
        venueName,
        totalXp:   hero.progression?.total_xp ?? 0,
        ac:        ALIGNMENT_COLOR[hero.alignment] ?? '#C8A04E',
      });
    }

    prevLevelRef.current    = level;
    prevSessionsRef.current = sessions;

    if (staged.length > 0) {
      setQueue(prev => [...prev, ...staged]);
    }
  }, [hero]);

  // ── Advance queue ────────────────────────────────────────
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [queue, current]);

  const dismiss = useCallback(() => setCurrent(null), []);

  if (!current) return null;

  return createPortal(
    current.type === 'levelup'
      ? <LevelUpOverlay ceremony={current} onDismiss={dismiss} />
      : <SessionOverlay ceremony={current} onDismiss={dismiss} />,
    document.body
  );
}

// ── Level-Up Ceremony ─────────────────────────────────────────

function LevelUpOverlay({
  ceremony, onDismiss,
}: { ceremony: LevelUpCeremony; onDismiss: () => void }) {
  const { tier, ac, fromLevel, toLevel, totalXp } = ceremony;

  // XP counter animation
  const [displayXp, setDisplayXp] = useState(0);
  const [phase,     setPhase]     = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Count XP from 0 → totalXp over 1.8s (starts at 0.8s)
    const delay   = setTimeout(() => {
      const dur   = 1800;
      const steps = 60;
      const inc   = totalXp / steps;
      let   count = 0;
      const iv    = setInterval(() => {
        count++;
        setDisplayXp(Math.round(Math.min(inc * count, totalXp)));
        if (count >= steps) clearInterval(iv);
      }, dur / steps);
      return () => clearInterval(iv);
    }, 800);

    // Auto lifecycle: enter → hold → exit → dismiss
    const t1 = setTimeout(() => setPhase('hold'), 500);
    const t2 = setTimeout(() => setPhase('exit'), 3800);
    const t3 = setTimeout(onDismiss, 4200);

    return () => { clearTimeout(delay); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      onClick={onDismiss}
      style={{
        position:   'fixed', inset: 0, zIndex: 900,
        display:    'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#070605',
        opacity:     phase === 'exit' ? 0 : 1,
        transition:  phase === 'exit' ? 'opacity 0.4s ease' : 'none',
        cursor:      'pointer',
        overflow:    'hidden',
      }}
    >
      <style>{`
        @keyframes lu-flood {
          0%   { opacity: 0; transform: scale(0.6); }
          40%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 0.12; transform: scale(1); }
        }
        @keyframes lu-slam {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(2.8); filter: blur(12px); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(0.96); filter: blur(0px); }
          80%  { transform: translate(-50%, -50%) scale(1.03); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes lu-rise {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lu-pulse-ring {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        @keyframes lu-hint {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.6; }
        }
      `}</style>

      {/* Tier color flood radial */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${tier.color}35 0%, ${tier.color}08 55%, transparent 80%)`,
        animation:  'lu-flood 1.2s ease forwards',
      }} />

      {/* Expanding rings */}
      {[0, 0.4, 0.8].map((delay, i) => (
        <div key={i} style={{
          position:        'absolute',
          left: '50%', top: '50%',
          width:           320, height: 320,
          borderRadius:    '50%',
          border:          `1px solid ${tier.color}50`,
          animation:       `lu-pulse-ring 1.6s ${delay}s ease-out infinite`,
        }} />
      ))}

      {/* Central tier glyph / name SLAM */}
      <div style={{
        position:    'absolute',
        left: '50%', top:  '42%',
        animation:   'lu-slam 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both',
        textAlign:   'center',
        whiteSpace:  'nowrap',
      }}>
        <div style={{
          fontSize:      120,
          color:         tier.color,
          fontFamily:    'Cinzel, serif',
          fontWeight:    700,
          lineHeight:    1,
          textShadow:    `0 0 60px ${tier.color}80, 0 0 120px ${tier.color}40`,
          letterSpacing: '0.04em',
        }}>
          {tier.name.toUpperCase()}
        </div>
        <div style={{
          fontSize:      18,
          color:         `${tier.color}CC`,
          fontFamily:    'Cinzel, serif',
          letterSpacing: '0.35em',
          marginTop:     8,
          textTransform: 'uppercase',
        }}>
          TIER UNLOCKED
        </div>
      </div>

      {/* Level numbers */}
      <div style={{
        position:    'absolute',
        left: '50%', top: '68%',
        transform:   'translateX(-50%)',
        animation:   'lu-rise 0.5s 0.6s ease both',
        textAlign:   'center',
        whiteSpace:  'nowrap',
      }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        20,
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 42, color: 'rgba(232,224,204,0.3)', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
            LV {fromLevel}
          </span>
          <span style={{ fontSize: 28, color: tier.color }}>→</span>
          <span style={{ fontSize: 56, color: CREAM, fontFamily: 'Cinzel, serif', fontWeight: 700, textShadow: `0 0 30px ${tier.color}60` }}>
            LV {toLevel}
          </span>
        </div>

        {/* XP counter */}
        <div style={{
          marginTop:   16,
          fontSize:    15,
          color:       CREAM_DIM,
          fontFamily:  'monospace',
          letterSpacing: '0.1em',
        }}>
          {displayXp.toLocaleString()} FATE XP
        </div>
      </div>

      {/* Top label */}
      <div style={{
        position:     'absolute',
        top:          60,
        left: '50%',
        transform:    'translateX(-50%)',
        animation:    'lu-rise 0.4s 0.2s ease both',
        textAlign:    'center',
        whiteSpace:   'nowrap',
      }}>
        <p style={{
          fontSize:      11,
          letterSpacing: '0.3em',
          color:         CREAM_DIM,
          fontFamily:    'Cinzel, serif',
          textTransform: 'uppercase',
        }}>
          ◈ &nbsp; Level Up &nbsp; ◈
        </p>
      </div>

      {/* Tap to dismiss hint */}
      <div style={{
        position:      'absolute',
        bottom:        48,
        left: '50%',
        transform:     'translateX(-50%)',
        fontSize:      10,
        letterSpacing: '0.18em',
        color:         'rgba(232,224,204,0.2)',
        fontFamily:    'Cinzel, serif',
        animation:     'lu-hint 2s 2s ease infinite',
        whiteSpace:    'nowrap',
      }}>
        TAP TO CONTINUE
      </div>
    </div>
  );
}

// ── Session / Wristband Ceremony ──────────────────────────────

function SessionOverlay({
  ceremony, onDismiss,
}: { ceremony: SessionCeremony; onDismiss: () => void }) {
  const { ac, venueName, totalXp } = ceremony;
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    const t3 = setTimeout(onDismiss, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      onClick={onDismiss}
      style={{
        position:   'fixed', inset: 0, zIndex: 900,
        display:    'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,7,5,0.97)',
        opacity:     phase === 'exit' ? 0 : 1,
        transition:  phase === 'exit' ? 'opacity 0.4s ease' : 'none',
        cursor:      'pointer',
        overflow:    'hidden',
      }}
    >
      <style>{`
        @keyframes se-burst {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        @keyframes se-particle {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes se-text-in {
          0%   { opacity: 0; transform: translateY(14px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes se-xp-in {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes se-glyph-spin {
          0%   { transform: translate(-50%,-50%) scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.1) rotate(8deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes se-hint {
          0%, 100% { opacity: 0.2; }
          50%       { opacity: 0.5; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position:   'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${ac}18 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Burst ring */}
      <div style={{
        position:     'absolute',
        left: '50%', top: '46%',
        width:         280, height: 280,
        borderRadius:  '50%',
        border:        `2px solid ${ac}`,
        animation:     'se-burst 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        pointerEvents: 'none',
      }} />

      {/* Particles */}
      {PARTICLE_ANGLES.map((angle, i) => {
        const rad    = (angle * Math.PI) / 180;
        const dist   = 90 + (i % 3) * 28;
        const dx     = Math.cos(rad) * dist;
        const dy     = Math.sin(rad) * dist;
        const size   = i % 4 === 0 ? 6 : i % 3 === 0 ? 4 : 3;
        const delay  = (i % 4) * 0.04;
        const dur    = 0.5 + (i % 3) * 0.12;
        return (
          <div key={i} style={{
            position:        'absolute',
            left:            `calc(50% + ${dx}px)`,
            top:             `calc(46% + ${dy}px)`,
            width:           size, height: size,
            borderRadius:    '50%',
            background:      i % 3 === 0 ? ac : `${ac}99`,
            transform:       'translate(-50%,-50%)',
            animation:       `se-particle ${dur}s ${delay}s ease-out forwards`,
            boxShadow:       `0 0 ${size * 2}px ${ac}`,
          }} />
        );
      })}

      {/* Central glyph */}
      <div style={{
        position:     'absolute',
        left: '50%', top: '46%',
        fontSize:      80,
        color:         ac,
        fontFamily:    'Cinzel, serif',
        animation:     'se-glyph-spin 0.65s 0.05s cubic-bezier(0.16,1,0.3,1) both',
        textShadow:    `0 0 40px ${ac}80`,
        lineHeight:    1,
      }}>
        ◈
      </div>

      {/* Main text */}
      <div style={{
        position:    'absolute',
        left: '50%',
        top:         '60%',
        transform:   'translateX(-50%)',
        textAlign:   'center',
        whiteSpace:  'nowrap',
        animation:   'se-text-in 0.4s 0.45s ease both',
      }}>
        <p style={{
          fontSize:      11,
          letterSpacing: '0.3em',
          color:         `${ac}CC`,
          fontFamily:    'Cinzel, serif',
          textTransform: 'uppercase',
          marginBottom:  12,
        }}>
          SESSION REGISTERED
        </p>
        <p style={{
          fontSize:      22,
          color:         CREAM,
          fontFamily:    'Cinzel, serif',
          fontWeight:    600,
          letterSpacing: '0.05em',
          marginBottom:  8,
          maxWidth:      280,
          whiteSpace:    'normal',
          textAlign:     'center',
        }}>
          {venueName}
        </p>
      </div>

      {/* XP line */}
      <div style={{
        position:    'absolute',
        left: '50%',
        top:         '76%',
        transform:   'translateX(-50%)',
        textAlign:   'center',
        animation:   'se-xp-in 0.4s 0.85s ease both',
        whiteSpace:  'nowrap',
      }}>
        <span style={{
          fontSize:      13,
          color:         CREAM_DIM,
          fontFamily:    'monospace',
          letterSpacing: '0.08em',
        }}>
          {totalXp.toLocaleString()} FATE XP
        </span>
      </div>

      {/* Top label */}
      <div style={{
        position:     'absolute',
        top:          56,
        left: '50%',
        transform:    'translateX(-50%)',
        animation:    'se-text-in 0.4s 0.3s ease both',
        whiteSpace:   'nowrap',
      }}>
        <p style={{
          fontSize:      9,
          letterSpacing: '0.3em',
          color:         CREAM_DIM,
          fontFamily:    'Cinzel, serif',
          opacity:       0.5,
        }}>
          ⌚ &nbsp; WRISTBAND TAP DETECTED
        </p>
      </div>

      {/* Tap hint */}
      <div style={{
        position:      'absolute',
        bottom:        44,
        left: '50%',
        transform:     'translateX(-50%)',
        fontSize:      10,
        letterSpacing: '0.18em',
        color:         'rgba(232,224,204,0.2)',
        fontFamily:    'Cinzel, serif',
        animation:     'se-hint 2s 1.5s ease infinite',
        whiteSpace:    'nowrap',
      }}>
        TAP TO CONTINUE
      </div>
    </div>
  );
}

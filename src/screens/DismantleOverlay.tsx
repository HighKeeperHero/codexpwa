// src/screens/DismantleOverlay.tsx
// ============================================================
// Cinematic 3-phase gear dismantle animation
//
// Phase 1 — EXAMINE (~600ms): item shown, scan line sweeps, rarity glow
// Phase 2 — SHATTER (~700ms): item fragments, particles scatter
// Phase 3 — YIELD   (∞):     components + Nexus tile in, Collect button
// ============================================================
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type Phase  = 'examine' | 'shatter' | 'yield';

export interface DismantleResult {
  nexus_gained:       number;
  components_gained:  ComponentGain[];
  new_nexus_balance:  number;
  new_components:     Record<string, number>;
}

export interface ComponentGain {
  id:       string;
  name:     string;
  icon:     string;
  quantity: number;
}

interface GearItem {
  inventory_id: string;
  item_name:    string;
  slot:         string;
  rarity:       Rarity;
  icon:         string;
}

interface Props {
  item:     GearItem;
  result:   DismantleResult | null;   // null while API in-flight
  onDismiss: () => void;
}

// ── Color maps ──────────────────────────────────────────────────
const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#8899AA', uncommon: '#34d399', rare: '#1E90FF',
  epic:      '#A855F7', legendary: '#FFA500',
};
const RARITY_GLOW: Record<Rarity, string> = {
  common:    'rgba(136,153,170,0.35)', uncommon: 'rgba(52,211,153,0.45)',
  rare:      'rgba(30,144,255,0.5)',   epic:     'rgba(168,85,247,0.55)',
  legendary: 'rgba(255,165,0,0.65)',
};

// ── Keyframes ────────────────────────────────────────────────────
const KF = `
  @keyframes dm-fadein  { from{opacity:0} to{opacity:1} }
  @keyframes dm-fadeout { from{opacity:1} to{opacity:0} }

  /* Phase 1: scan line sweeps down */
  @keyframes dm-scan {
    0%   { top: -4px; opacity: 0.8; }
    100% { top: 100%;  opacity: 0;   }
  }
  /* icon pulse glow on examine */
  @keyframes dm-pulse {
    0%,100% { filter: drop-shadow(0 0 6px currentColor); }
    50%     { filter: drop-shadow(0 0 22px currentColor) drop-shadow(0 0 50px currentColor); }
  }

  /* Phase 2: shatter — icon spins and shrinks */
  @keyframes dm-shatter {
    0%   { transform: scale(1)    rotate(0deg);   opacity:1; }
    30%  { transform: scale(1.3)  rotate(-8deg);  opacity:0.9; }
    70%  { transform: scale(0.4)  rotate(22deg);  opacity:0.4; }
    100% { transform: scale(0)    rotate(45deg);  opacity:0; }
  }
  /* flash on shatter */
  @keyframes dm-flash {
    0%{opacity:0} 20%{opacity:0.7} 100%{opacity:0}
  }
  /* fragment chips scatter */
  @keyframes dm-chip {
    0%   { transform: translate(0,0) rotate(0deg)   scale(1);   opacity:1; }
    100% { transform: translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
  }

  /* Phase 3: yield items slide up */
  @keyframes dm-tile-in {
    from { transform: translateY(20px); opacity:0; }
    to   { transform: translateY(0);    opacity:1; }
  }
  /* nexus counter tick up */
  @keyframes dm-nexus-pop {
    0%   { transform: scale(0.5); opacity:0; }
    70%  { transform: scale(1.15); }
    100% { transform: scale(1);    opacity:1; }
  }
  @keyframes dm-btn-in {
    from { transform: translateY(12px); opacity:0; }
    to   { transform: translateY(0);    opacity:1; }
  }
`;

// ── Chips ──────────────────────────────────────────────────────
const CHIPS = Array.from({ length: 16 }, (_, i) => {
  const angle = (360 / 16) * i * (Math.PI / 180);
  const dist  = 60 + Math.random() * 70;
  return {
    cx: `${Math.cos(angle) * dist}px`,
    cy: `${Math.sin(angle) * dist}px`,
    cr: `${-180 + Math.random() * 360}deg`,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.1,
  };
});

// ── Component ──────────────────────────────────────────────────
export function DismantleOverlay({ item, result, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('examine');
  const rarity = item.rarity;
  const color  = RARITY_COLOR[rarity];
  const glow   = RARITY_GLOW[rarity];

  // Track result in a ref so the timer can read it
  const resultRef = { current: result };
  resultRef.current = result;

  useEffect(() => {
    // examine → shatter
    const t1 = setTimeout(() => setPhase('shatter'), 600);
    // shatter → yield (wait for result too)
    const t2 = setTimeout(() => {
      const poll = setInterval(() => {
        if (resultRef.current) { clearInterval(poll); setPhase('yield'); }
      }, 80);
      setTimeout(() => { clearInterval(poll); setPhase('yield'); }, 4000);
    }, 600 + 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlay = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(11,15,26,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 0,
      animation: 'dm-fadein 0.2s ease both',
      overflow: 'hidden',
    }}>
      <style>{KF}</style>

      {/* ── PHASE 1: EXAMINE ────────────────────────────────── */}
      {phase === 'examine' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Scan box */}
          <div style={{
            position: 'relative', width: 120, height: 120,
            border: `1px solid ${color}55`,
            borderRadius: 16, overflow: 'hidden',
            background: `radial-gradient(circle, ${glow}30 0%, transparent 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Scan line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              animation: 'dm-scan 0.6s linear infinite',
              top: 0,
            }} />
            {/* Corner brackets */}
            {[
              { top: 0, left: 0, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
              { top: 0, right: 0, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
              { bottom: 0, left: 0, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
              { bottom: 0, right: 0, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }} />
            ))}
            <span style={{
              fontSize: 56, color, lineHeight: 1,
              animation: 'dm-pulse 0.6s ease infinite',
            }}>
              {item.icon ?? '⚔'}
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 10, color: color,
              letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 6px',
              animation: 'dm-fadein 0.3s 0.1s ease both', opacity: 0,
            }}>Analysing</p>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
              color: '#F0EDE6', margin: 0, letterSpacing: '0.05em',
              animation: 'dm-fadein 0.3s 0.2s ease both', opacity: 0,
            }}>{item.item_name}</p>
          </div>
        </div>
      )}

      {/* ── PHASE 2: SHATTER ────────────────────────────────── */}
      {phase === 'shatter' && (
        <div style={{ position: 'relative', width: 0, height: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Flash */}
          <div style={{
            position: 'fixed', inset: 0,
            background: `radial-gradient(circle, ${color}88 0%, transparent 60%)`,
            animation: 'dm-flash 0.7s ease both', pointerEvents: 'none',
          }} />
          {/* Item shattering */}
          <span style={{
            fontSize: 72, color,
            filter: `drop-shadow(0 0 20px ${color})`,
            animation: 'dm-shatter 0.65s ease both',
            position: 'absolute', zIndex: 2,
          }}>{item.icon ?? '⚔'}</span>
          {/* Chip fragments */}
          {CHIPS.map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: c.size, height: c.size,
              borderRadius: 2,
              background: color,
              boxShadow: `0 0 ${c.size}px ${color}`,
              ['--cx' as any]: c.cx,
              ['--cy' as any]: c.cy,
              ['--cr' as any]: c.cr,
              animation: `dm-chip 0.65s ${c.delay}s ease both`,
            }} />
          ))}
        </div>
      )}

      {/* ── PHASE 3: YIELD ──────────────────────────────────── */}
      {phase === 'yield' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, width: '100%', maxWidth: 320, padding: '0 24px', textAlign: 'center',
        }}>
          {/* Header */}
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 10, color: '#8FA8CC',
            letterSpacing: '0.25em', textTransform: 'uppercase',
            margin: '0 0 6px',
            animation: 'dm-fadein 0.3s ease both', opacity: 0,
          }}>Dismantled</p>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
            color: '#F0EDE6', margin: '0 0 24px',
            animation: 'dm-fadein 0.3s 0.05s ease both', opacity: 0,
          }}>{item.item_name}</p>

          {/* Yield grid */}
          {result && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: 10, marginBottom: 20, width: '100%',
            }}>
              {/* Nexus tile */}
              <div style={{
                background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)',
                borderRadius: 10, padding: '12px 16px', minWidth: 100,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                animation: 'dm-nexus-pop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0,
              }}>
                <span style={{ fontSize: 24 }}>◈</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFA500', fontFamily: 'Cinzel, serif' }}>
                  +{result.nexus_gained}
                </span>
                <span style={{ fontSize: 9, color: '#8FA8CC', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Nexus
                </span>
              </div>
              {/* Component tiles */}
              {result.components_gained.map((c, i) => (
                <div key={c.id} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '12px 16px', minWidth: 100,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  animation: `dm-tile-in 0.4s ${0.15 + i * 0.08}s ease both`, opacity: 0,
                }}>
                  <span style={{ fontSize: 24 }}>{c.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F0EDE6', fontFamily: 'Cinzel, serif' }}>
                    ×{c.quantity}
                  </span>
                  <span style={{ fontSize: 9, color: '#8FA8CC', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!result && (
            <p style={{ color: '#485E7A', fontSize: 13, marginBottom: 24 }}>
              Breaking it down…
            </p>
          )}

          {/* New balance */}
          {result && (
            <p style={{
              fontSize: 12, color: '#485E7A', margin: '0 0 20px',
              animation: 'dm-fadein 0.3s 0.5s ease both', opacity: 0,
            }}>
              Nexus balance: <span style={{ color: '#FFA500', fontWeight: 700 }}>{result.new_nexus_balance}</span>
            </p>
          )}

          <button onClick={onDismiss} style={{
            width: '100%', padding: '14px 0',
            background: result ? 'var(--gold)' : 'var(--surface)',
            color: result ? '#0B0A08' : 'var(--text-3)',
            border: `1px solid ${result ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: 10, fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.1em', cursor: result ? 'pointer' : 'not-allowed',
            animation: 'dm-btn-in 0.4s 0.55s ease both', opacity: 0,
          }}>
            {result ? 'COLLECT' : '…'}
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

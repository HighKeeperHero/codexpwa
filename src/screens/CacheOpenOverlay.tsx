// src/screens/CacheOpenOverlay.tsx
// ============================================================
// Cinematic 3-phase cache opening animation
//
// Phase 1 — CRACK  (~700ms): cache icon shakes, cracks appear, glow builds
// Phase 2 — BURST  (~600ms): explosion of rays, flash, icon shatters
// Phase 3 — REVEAL (~∞):    reward stamps in, claim button appears
//
// Usage:
//   <CacheOpenOverlay cache={pendingCache} reward={reward} onDismiss={...} />
//
// Pass reward=null while the API is in-flight. The overlay will hold at
// end-of-burst until reward is populated, then auto-advance to reveal.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── Types ──────────────────────────────────────────────────────
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type Phase  = 'crack' | 'burst' | 'reveal';

export interface CacheInfo {
  rarity: Rarity;
  label: string;
}

export interface CacheRewardPayload {
  reward_type: string;
  reward_value: string;
  display_name: string;
  rarity_tier: Rarity;
  xp_granted?: number;
  message?: string;
  slot?: string;
  description?: string;
  modifiers?: Record<string, number>;
}

interface Props {
  cache:    CacheInfo;
  reward:   CacheRewardPayload | null;   // null while API in-flight
  onDismiss: () => void;
}

// ── Color maps ─────────────────────────────────────────────────
const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#8899AA',
  uncommon:  '#34d399',
  rare:      '#1E90FF',
  epic:      '#A855F7',
  legendary: '#FFA500',
};
const RARITY_GLOW: Record<Rarity, string> = {
  common:    'rgba(136,153,170,0.4)',
  uncommon:  'rgba(52,211,153,0.5)',
  rare:      'rgba(30,144,255,0.55)',
  epic:      'rgba(168,85,247,0.6)',
  legendary: 'rgba(255,165,0,0.7)',
};
const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};
const RAY_COUNT: Record<Rarity, number> = {
  common: 4, uncommon: 6, rare: 8, epic: 10, legendary: 14,
};
const GEAR_SLOT_LABEL: Record<string, string> = {
  weapon: 'Weapon', helm: 'Helm', chest: 'Chest', arms: 'Arms', legs: 'Legs', rune: 'Rune',
};
const MODIFIER_LABEL: Record<string, string> = {
  xp_bonus_pct: 'XP Bonus', boss_damage_pct: 'Boss Dmg', luck_pct: 'Luck',
  defense: 'Defense', crit_pct: 'Crit', cooldown_pct: 'Cooldown', fate_affinity: 'Fate Affinity',
};
const REWARD_ICON: Record<string, string> = {
  xp_boost: '✦', title: '◈', gear: '⚔', marker: '⬡',
};
const REWARD_TYPE_LABEL: Record<string, string> = {
  xp_boost: 'Fate XP', title: 'Title Unlocked', gear: 'Gear Found', marker: 'Lore Fragment',
};

// ── Keyframe CSS ───────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes co-fadein    { from { opacity:0; } to { opacity:1; } }
  @keyframes co-fadeout   { from { opacity:1; } to { opacity:0; } }

  /* Phase 1: crack — shake + glow build */
  @keyframes co-shake {
    0%,100% { transform: translate(0,0) rotate(0deg); }
    10%     { transform: translate(-3px, 1px) rotate(-1deg); }
    20%     { transform: translate(3px,-1px) rotate(1deg); }
    30%     { transform: translate(-4px, 2px) rotate(-2deg); }
    40%     { transform: translate(4px,-2px) rotate(2deg); }
    50%     { transform: translate(-3px, 1px) rotate(-1deg); }
    60%     { transform: translate(5px,-1px) rotate(2deg); }
    70%     { transform: translate(-5px, 2px) rotate(-2deg); }
    80%     { transform: translate(4px,-2px) rotate(1deg); }
    90%     { transform: translate(-2px, 1px) rotate(-1deg); }
  }
  @keyframes co-glow-build {
    0%   { filter: drop-shadow(0 0 6px currentColor); }
    50%  { filter: drop-shadow(0 0 28px currentColor) drop-shadow(0 0 60px currentColor); }
    100% { filter: drop-shadow(0 0 48px currentColor) drop-shadow(0 0 100px currentColor); }
  }
  @keyframes co-crack-in {
    from { scaleX: 0; opacity: 0; }
    to   { scaleX: 1; opacity: 1; }
  }

  /* Phase 2: burst — icon explodes outward */
  @keyframes co-explode {
    0%   { transform: scale(1);   opacity: 1; }
    40%  { transform: scale(2.2); opacity: 0.8; }
    100% { transform: scale(4);   opacity: 0; }
  }
  /* Flash */
  @keyframes co-flash {
    0%   { opacity: 0; }
    15%  { opacity: 1; }
    100% { opacity: 0; }
  }
  /* Rays shoot outward */
  @keyframes co-ray {
    0%   { transform: var(--ray-rot) scaleX(0); opacity: 0.9; }
    60%  { transform: var(--ray-rot) scaleX(1); opacity: 0.6; }
    100% { transform: var(--ray-rot) scaleX(1.2); opacity: 0; }
  }
  /* Particle dots scatter */
  @keyframes co-particle {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
  }

  /* Phase 3: reveal — stamp + glow pulse + slide up */
  @keyframes co-stamp {
    0%   { transform: scale(2.5); opacity: 0; }
    60%  { transform: scale(0.92); opacity: 1; }
    80%  { transform: scale(1.06); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes co-drop {
    0%   { transform: translateY(-28px); opacity: 0; }
    70%  { transform: translateY(4px);   opacity: 1; }
    100% { transform: translateY(0);     opacity: 1; }
  }
  @keyframes co-rise {
    from { transform: translateY(18px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes co-ring-pulse {
    0%,100% { box-shadow: 0 0 0 0 var(--ring-color), 0 0 30px var(--ring-color); }
    50%     { box-shadow: 0 0 0 12px transparent,    0 0 60px var(--ring-color); }
  }
  @keyframes co-btn-in {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes co-xp-pop {
    0%   { transform: scale(0.6); opacity: 0; }
    70%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
`;

// ── Component ──────────────────────────────────────────────────
export function CacheOpenOverlay({ cache, reward, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('crack');
  const rewardRef = useRef<CacheRewardPayload | null>(null);

  // Keep a ref so the phase-advance timer can read the latest reward value
  rewardRef.current = reward;

  useEffect(() => {
    // crack → burst after 700ms
    const t1 = setTimeout(() => setPhase('burst'), 700);

    // burst → reveal: wait 600ms AND for reward to be ready
    const t2 = setTimeout(() => {
      // Poll for reward every 80ms (in case API is slow)
      const poll = setInterval(() => {
        if (rewardRef.current) {
          clearInterval(poll);
          setPhase('reveal');
        }
      }, 80);
      // Safety: advance anyway after 4s even if reward is null
      setTimeout(() => { clearInterval(poll); setPhase('reveal'); }, 4000);
    }, 700 + 600);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const cacheRarity  = cache.rarity;
  const color        = RARITY_COLOR[cacheRarity];
  const glow         = RARITY_GLOW[cacheRarity];
  const rayCount     = RAY_COUNT[cacheRarity];

  // Reward rarity for reveal phase (may differ from cache rarity)
  const rewardRarity = reward?.rarity_tier ?? cacheRarity;
  const rColor       = RARITY_COLOR[rewardRarity];
  const rGlow        = RARITY_GLOW[rewardRarity];

  const itemName = reward?.display_name || (
    reward?.reward_type === 'gear'     ? 'Gear Item' :
    reward?.reward_type === 'title'    ? 'New Title' :
    reward?.reward_type === 'xp_boost' ? `${reward.reward_value ?? '?'} XP` : 'Reward'
  );

  // Generate ray angles
  const rays = Array.from({ length: rayCount }, (_, i) => (360 / rayCount) * i);

  // Generate scatter particles
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle = (360 / 18) * i * (Math.PI / 180);
    const dist  = 80 + Math.random() * 80;
    return {
      px: Math.cos(angle) * dist,
      py: Math.sin(angle) * dist,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.15,
    };
  });

  // Crack line angles
  const cracks = [
    { angle: 32,  len: 55, top: '42%', left: '51%' },
    { angle: 145, len: 42, top: '48%', left: '47%' },
    { angle: 255, len: 38, top: '54%', left: '52%' },
  ];

  const overlay = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: phase === 'burst'
        ? `radial-gradient(circle, ${glow} 0%, rgba(11,15,26,0.97) 60%)`
        : 'rgba(11,15,26,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      animation: 'co-fadein 0.25s ease both',
    }}>
      <style>{KEYFRAMES}</style>

      {/* ── PHASE 1: CRACK ─────────────────────────────────── */}
      {phase === 'crack' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
          {/* Cache icon */}
          <div style={{
            fontSize: 96, lineHeight: 1, color,
            animation: 'co-shake 0.7s ease both, co-glow-build 0.7s ease both',
            position: 'relative',
          }}>
            ⬡
            {/* Crack lines */}
            {cracks.map((c, i) => (
              <div key={i} style={{
                position: 'absolute', top: c.top, left: c.left,
                width: c.len, height: 1.5,
                background: `linear-gradient(90deg, ${color}, transparent)`,
                transformOrigin: '0 50%',
                transform: `rotate(${c.angle}deg)`,
                animation: `co-fadein 0.3s ${0.2 + i * 0.1}s ease both`,
                opacity: 0,
                borderRadius: 2,
              }} />
            ))}
          </div>
          {/* Cache label */}
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 12, color, letterSpacing: '0.2em',
            textTransform: 'uppercase', margin: 0, opacity: 0.8,
            animation: 'co-fadein 0.3s 0.1s ease both',
          }}>
            {cache.label}
          </p>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 10, color: RARITY_COLOR[cacheRarity],
            letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0,
            animation: 'co-fadein 0.3s 0.2s ease both',
          }}>
            {RARITY_LABEL[cacheRarity]}
          </p>
        </div>
      )}

      {/* ── PHASE 2: BURST ─────────────────────────────────── */}
      {phase === 'burst' && (
        <div style={{ position: 'relative', width: 0, height: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Screen flash */}
          <div style={{
            position: 'fixed', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle, ${color}CC 0%, transparent 70%)`,
            animation: 'co-flash 0.6s ease both',
          }} />

          {/* Exploding icon */}
          <div style={{
            position: 'absolute', fontSize: 96, color,
            animation: 'co-explode 0.55s ease both',
            filter: `drop-shadow(0 0 30px ${color})`,
            zIndex: 2,
          }}>⬡</div>

          {/* Rays */}
          {rays.map((angle, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 180, height: 3,
              transformOrigin: '0 50%',
              ['--ray-rot' as any]: `rotate(${angle}deg)`,
              transform: `rotate(${angle}deg) scaleX(0)`,
              background: `linear-gradient(90deg, ${color}EE, ${color}44, transparent)`,
              animation: `co-ray 0.6s ${0.05 + i * 0.02}s ease both`,
              borderRadius: 4,
              opacity: 0,
            }} />
          ))}

          {/* Particles */}
          {particles.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
              ['--px' as any]: `${p.px}px`,
              ['--py' as any]: `${p.py}px`,
              animation: `co-particle 0.6s ${p.delay}s ease both`,
              opacity: 0,
            }} />
          ))}
        </div>
      )}

      {/* ── PHASE 3: REVEAL ────────────────────────────────── */}
      {phase === 'reveal' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, width: '100%', maxWidth: 320, padding: '0 24px',
          textAlign: 'center',
        }}>

          {/* Pulsing ring */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            border: `2px solid ${rColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ['--ring-color' as any]: rColor,
            animation: 'co-ring-pulse 1.6s ease infinite',
            marginBottom: 20,
            position: 'relative',
          }}>
            {/* Inner glow */}
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: `radial-gradient(circle, ${rGlow} 0%, transparent 70%)`,
            }} />
            {/* Reward icon */}
            <span style={{
              fontSize: 44, color: rColor,
              filter: `drop-shadow(0 0 16px ${rColor})`,
              animation: 'co-stamp 0.5s 0.05s cubic-bezier(0.34,1.56,0.64,1) both',
              position: 'relative', zIndex: 1,
            }}>
              {REWARD_ICON[reward?.reward_type ?? ''] ?? '✦'}
            </span>
          </div>

          {/* Reward type label */}
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 10, color: rColor,
            letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 8px',
            animation: 'co-rise 0.4s 0.15s ease both', opacity: 0,
          }}>
            {REWARD_TYPE_LABEL[reward?.reward_type ?? ''] ?? 'Reward'}
          </p>

          {/* Rarity badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${rColor}20`, border: `1px solid ${rColor}`,
            borderRadius: 999, padding: '3px 14px', marginBottom: 14,
            animation: 'co-stamp 0.45s 0.2s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: rColor, textTransform: 'uppercase' }}>
              {RARITY_LABEL[rewardRarity]}
            </span>
          </div>

          {/* Item name */}
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 700,
            color: '#F0EDE6', margin: '0 0 4px', lineHeight: 1.2,
            textShadow: `0 0 24px ${rColor}60`,
            animation: 'co-drop 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) both', opacity: 0,
          }}>
            {itemName}
          </p>

          {/* Slot label (gear only) */}
          {reward?.reward_type === 'gear' && reward.slot && (
            <p style={{
              fontSize: 11, color: '#8FA8CC', letterSpacing: '0.15em',
              textTransform: 'uppercase', margin: '0 0 14px',
              animation: 'co-rise 0.4s 0.4s ease both', opacity: 0,
            }}>
              {GEAR_SLOT_LABEL[reward.slot] ?? reward.slot}
            </p>
          )}

          {/* Modifiers */}
          {reward?.modifiers && Object.keys(reward.modifiers).length > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 14,
              width: '100%', textAlign: 'left',
              animation: 'co-rise 0.4s 0.42s ease both', opacity: 0,
            }}>
              {Object.entries(reward.modifiers).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '4px 0' }}>
                  <span style={{ color: '#8FA8CC' }}>{MODIFIER_LABEL[k] ?? k}</span>
                  <span style={{ color: rColor, fontWeight: 700 }}>+{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* XP granted */}
          {reward?.xp_granted && (
            <p style={{
              fontSize: 14, fontWeight: 700, margin: '0 0 12px',
              color: '#FFA500',
              animation: 'co-xp-pop 0.5s 0.48s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0,
            }}>
              +{reward.xp_granted} Fate XP
            </p>
          )}

          {/* Lore message */}
          <p style={{
            fontSize: 12, color: '#485E7A', fontStyle: 'italic',
            margin: '4px 0 24px', lineHeight: 1.6,
            animation: 'co-rise 0.4s 0.5s ease both', opacity: 0,
          }}>
            {reward?.message ?? 'The Veil has given what was kept for you.'}
          </p>

          {/* Claim button */}
          <button onClick={onDismiss} style={{
            width: '100%', padding: '14px 0',
            background: rColor, color: '#0B0A08',
            border: 'none', borderRadius: 10,
            fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.1em', cursor: 'pointer',
            boxShadow: `0 0 24px ${rGlow}`,
            animation: 'co-btn-in 0.4s 0.6s ease both', opacity: 0,
          }}>
            CLAIM
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

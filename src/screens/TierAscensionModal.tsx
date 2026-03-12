// ============================================================
// TierAscensionModal — Sprint 20.8.2
//
// Full-screen dramatic tier ascension reveal.
// Fires once per tier per hero, tracked in localStorage.
// Triggered from App.tsx after fetchHero resolves.
//
// Place at: src/screens/TierAscensionModal.tsx
//
// Usage in App.tsx:
//   import { TierAscensionModal, checkTierAscension } from './screens/TierAscensionModal';
//
//   // After hero loads:
//   const pending = checkTierAscension(hero.root_id, hero.progression.hero_level);
//   if (pending) setAscensionTier(pending);
//
//   // In JSX:
//   {ascensionTier && (
//     <TierAscensionModal
//       tier={ascensionTier}
//       onDismiss={() => setAscensionTier(null)}
//     />
//   )}
// ============================================================

import { useEffect, useState } from 'react';
import { createPortal }        from 'react-dom';
import { TIERS, Tier }         from '../api/pik';

// ── Tier lore & unlock data ───────────────────────────────

interface TierLore {
  lore:    string;
  unlocks: string[];
}

const TIER_LORE: Record<string, TierLore> = {
  Copper: {
    lore:    'You have bled for the Veil and returned. The world sees you differently now.',
    unlocks: [
      'Veil Shade encounters unlocked',
      'Uncommon loot pool active',
      'Refined Cores drop on dismantle',
      '1.3× quest reward multiplier',
    ],
  },
  Silver: {
    lore:    'Most who walk this path turn back. You have not. The Veil remembers.',
    unlocks: [
      'Veil Dormant encounters unlocked',
      'Rare loot pool active',
      'Arcane Essence drops on dismantle',
      'Recon missions available',
      '1.6× quest reward multiplier',
    ],
  },
  Gold: {
    lore:    'The fractures in the world bend toward you now. You are becoming something the Veil fears.',
    unlocks: [
      'Veil Double encounters unlocked',
      'Epic loot pool active',
      'Void Fragments drop on dismantle',
      'Hunt system unlocked',
      '2× quest reward multiplier',
    ],
  },
  Platinum: {
    lore:    'You have walked further than the old maps reach. What finds you now has no name in any record.',
    unlocks: [
      'Legendary loot pool active',
      'Alignment Hunts available',
      'Leaderboard placement active',
      '2.5× quest reward multiplier',
    ],
  },
  Adamantium: {
    lore:    'There is no title for what you are. The old words don\'t reach this far.',
    unlocks: [
      'Maximum tier reached',
      'Job Quest eligibility unlocked',
      '3× quest reward multiplier',
      'All loot tiers active',
    ],
  },
};

// ── Persistence helpers ────────────────────────────────────

const seenKey = (rootId: string, tierName: string) =>
  `tier_ascension_seen__${rootId}__${tierName}`;

/**
 * Call after hero data loads. Returns the Tier object if the
 * player has just crossed into a new tier they haven't seen,
 * or null if no modal should fire.
 */
export function checkTierAscension(rootId: string, heroLevel: number): Tier | null {
  const currentTier = TIERS.find(
    t => heroLevel >= t.min && heroLevel <= t.max && !t.isJob,
  );
  if (!currentTier || currentTier.name === 'Bronze') return null; // Bronze has no ascension moment
  const key = seenKey(rootId, currentTier.name);
  if (localStorage.getItem(key)) return null;
  return currentTier;
}

export function markTierSeen(rootId: string, tierName: string) {
  localStorage.setItem(seenKey(rootId, tierName), '1');
}

// ── Component ──────────────────────────────────────────────

interface Props {
  tier:      Tier;
  rootId:    string;
  onDismiss: () => void;
}

export function TierAscensionModal({ tier, rootId, onDismiss }: Props) {
  const [phase, setPhase]             = useState<'flash' | 'reveal' | 'unlocks' | 'ready'>('flash');
  const [unlocksShown, setUnlocksShown] = useState(0);

  const lore    = TIER_LORE[tier.name];
  const unlocks = lore?.unlocks ?? [];

  // Animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'),  600);
    const t2 = setTimeout(() => setPhase('unlocks'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Stagger unlock items
  useEffect(() => {
    if (phase !== 'unlocks') return;
    if (unlocksShown >= unlocks.length) {
      const t = setTimeout(() => setPhase('ready'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setUnlocksShown(n => n + 1), 220);
    return () => clearTimeout(t);
  }, [phase, unlocksShown, unlocks.length]);

  function handleDismiss() {
    markTierSeen(rootId, tier.name);
    onDismiss();
  }

  return createPortal(
    <div style={styles.overlay}>

      {/* Full-screen flash on enter */}
      <div style={{
        ...styles.flash,
        backgroundColor: tier.color,
        opacity: phase === 'flash' ? 0.25 : 0,
      }} />

      {/* Main card */}
      <div style={{
        ...styles.card,
        opacity:    phase === 'flash' ? 0 : 1,
        transform:  phase === 'flash' ? 'translateY(24px) scale(0.97)' : 'translateY(0) scale(1)',
      }}>

        {/* Tier glow ring */}
        <div style={{ ...styles.glowRing, boxShadow: `0 0 60px 8px ${tier.color}44, 0 0 120px 24px ${tier.color}22` }} />

        {/* Tier badge */}
        <div style={styles.badgeRow}>
          <div style={{ ...styles.tierBadge, color: tier.color, borderColor: `${tier.color}66` }}>
            {tier.name.toUpperCase()}
          </div>
        </div>

        {/* Header */}
        <div style={styles.ascendedLabel}>TIER ASCENSION</div>

        {/* Tier name */}
        <div style={{ ...styles.tierName, color: tier.color }}>
          {tier.name}
        </div>

        {/* Level range */}
        <div style={styles.levelRange}>
          {tier.name === 'Adamantium'
            ? 'Level 40 — Maximum Tier'
            : `Levels ${tier.min}–${tier.max}`}
        </div>

        {/* Divider */}
        <div style={{ ...styles.divider, backgroundColor: `${tier.color}44` }} />

        {/* Lore */}
        <div style={{
          ...styles.lore,
          opacity:   phase === 'flash' ? 0 : 1,
          transform: phase === 'flash' ? 'translateY(8px)' : 'translateY(0)',
        }}>
          "{lore?.lore}"
        </div>

        {/* Unlocks */}
        {(phase === 'unlocks' || phase === 'ready') && (
          <div style={styles.unlocksSection}>
            <div style={styles.unlocksTitle}>UNLOCKED</div>
            <div style={styles.unlocksList}>
              {unlocks.slice(0, unlocksShown).map((u, i) => (
                <div key={i} style={styles.unlockItem}>
                  <span style={{ ...styles.unlockDot, color: tier.color }}>◆</span>
                  <span style={styles.unlockText}>{u}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {phase === 'ready' && (
          <button style={{ ...styles.cta, backgroundColor: tier.color }} onClick={handleDismiss}>
            FORGE AHEAD
          </button>
        )}

        {/* Skip (always available) */}
        <button style={styles.skip} onClick={handleDismiss}>
          skip
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position:        'fixed',
    inset:           0,
    zIndex:          9999,
    backgroundColor: 'rgba(0,0,0,0.92)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '24px 16px',
  },
  flash: {
    position:   'fixed',
    inset:      0,
    zIndex:     9998,
    transition: 'opacity 0.6s ease',
    pointerEvents: 'none',
  },
  card: {
    position:        'relative',
    width:           '100%',
    maxWidth:        '420px',
    backgroundColor: '#0B0F1A',
    border:          '1px solid #1E2E48',
    borderRadius:    '16px',
    padding:         '40px 28px 28px',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '0',
    transition:      'opacity 0.5s ease, transform 0.5s ease',
    overflow:        'hidden',
  },
  glowRing: {
    position:      'absolute',
    inset:         0,
    borderRadius:  '16px',
    pointerEvents: 'none',
    zIndex:        0,
  },
  badgeRow: {
    position:       'relative',
    zIndex:         1,
    display:        'flex',
    justifyContent: 'center',
    marginBottom:   '20px',
  },
  tierBadge: {
    fontSize:      '11px',
    fontWeight:    700,
    letterSpacing: '3px',
    border:        '1px solid',
    borderRadius:  '4px',
    padding:       '4px 12px',
  },
  ascendedLabel: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '11px',
    fontWeight:    600,
    letterSpacing: '4px',
    color:         '#5A6A8A',
    marginBottom:  '10px',
  },
  tierName: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '42px',
    fontWeight:    800,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    lineHeight:    1,
    marginBottom:  '8px',
    textShadow:    '0 0 40px currentColor',
  },
  levelRange: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '12px',
    color:         '#5A6A8A',
    letterSpacing: '1px',
    marginBottom:  '20px',
  },
  divider: {
    position:     'relative',
    zIndex:       1,
    width:        '60px',
    height:       '1px',
    marginBottom: '20px',
  },
  lore: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '14px',
    color:         '#9AAABB',
    textAlign:     'center',
    lineHeight:    1.6,
    fontStyle:     'italic',
    marginBottom:  '24px',
    transition:    'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
  },
  unlocksSection: {
    position:  'relative',
    zIndex:    1,
    width:     '100%',
    marginBottom: '28px',
  },
  unlocksTitle: {
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '3px',
    color:         '#5A6A8A',
    marginBottom:  '12px',
    textAlign:     'center',
  },
  unlocksList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
  },
  unlockItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
    animation:  'fadeSlideUp 0.3s ease forwards',
  },
  unlockDot: {
    fontSize:   '8px',
    flexShrink: 0,
  },
  unlockText: {
    fontSize: '13px',
    color:    '#C8D4E0',
  },
  cta: {
    position:      'relative',
    zIndex:        1,
    width:         '100%',
    padding:       '14px',
    border:        'none',
    borderRadius:  '8px',
    fontSize:      '13px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#0B0F1A',
    cursor:        'pointer',
    marginBottom:  '12px',
    animation:     'fadeSlideUp 0.3s ease forwards',
  },
  skip: {
    background:    'none',
    border:        'none',
    color:         '#3A4A6A',
    fontSize:      '12px',
    cursor:        'pointer',
    padding:       '4px 8px',
  },
};

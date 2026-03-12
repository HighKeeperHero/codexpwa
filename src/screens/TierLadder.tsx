// ============================================================
// TierLadder — Sprint 20.8.3
//
// Compact tier progression ladder for the Hunts sub-tab header.
// Shows all tiers with current highlighted, next tier's unlock preview.
//
// Place at: src/screens/TierLadder.tsx
//
// Usage in VenturesScreen.tsx inside HuntsView, at the top:
//   import { TierLadder } from './TierLadder';
//   <TierLadder heroLevel={heroLevel} />
// ============================================================

import { TIERS, TIER_FOR_LEVEL } from '../api/pik';

const TIER_UNLOCKS: Record<string, string> = {
  Bronze:     'Basic quests · Common loot · Veil Minor',
  Copper:     'Uncommon loot · Veil Shade · Refined Cores',
  Silver:     'Rare loot · Veil Dormant · Arcane Essence · Recon',
  Gold:       'Epic loot · Veil Double · Void Fragments · Hunts',
  Platinum:   'Legendary loot · Alignment Hunts · Leaderboard',
  Adamantium: 'Maximum tier · Job Quest eligibility',
};

interface Props {
  heroLevel: number;
}

export function TierLadder({ heroLevel }: Props) {
  const currentTier = TIER_FOR_LEVEL(heroLevel);
  const adventureTiers = TIERS.filter(t => !t.isJob);

  // Find next tier
  const currentIdx = adventureTiers.findIndex(t => t.name === currentTier.name);
  const nextTier   = adventureTiers[currentIdx + 1] ?? null;

  // XP progress within current tier (level progress)
  const levelsInTier   = currentTier.max - currentTier.min + 1;
  const levelsEarned   = heroLevel - currentTier.min + 1;
  const tierProgress   = Math.min(1, levelsEarned / levelsInTier);

  return (
    <div style={styles.container}>

      {/* Current tier header */}
      <div style={styles.currentRow}>
        <div style={styles.currentLeft}>
          <span style={{ ...styles.currentTierName, color: currentTier.color }}>
            {currentTier.name}
          </span>
          <span style={styles.currentLevelRange}>
            Lv {currentTier.min}–{currentTier.max === 40 ? '40' : currentTier.max}
          </span>
        </div>
        <div style={styles.currentRight}>
          <span style={styles.levelLabel}>LEVEL</span>
          <span style={{ ...styles.levelValue, color: currentTier.color }}>{heroLevel}</span>
        </div>
      </div>

      {/* Progress bar through current tier */}
      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill,
          width:           `${tierProgress * 100}%`,
          backgroundColor: currentTier.color,
          boxShadow:       `0 0 8px ${currentTier.color}88`,
        }} />
      </div>

      {/* Tier pip row */}
      <div style={styles.pipRow}>
        {adventureTiers.map((tier, i) => {
          const isPast    = i < currentIdx;
          const isCurrent = tier.name === currentTier.name;
          const isLocked  = i > currentIdx;
          return (
            <div key={tier.name} style={styles.pipCol}>
              <div style={{
                ...styles.pip,
                backgroundColor: isPast || isCurrent ? tier.color : 'transparent',
                borderColor:     isCurrent ? tier.color : isPast ? `${tier.color}88` : '#1E2E48',
                boxShadow:       isCurrent ? `0 0 10px ${tier.color}88` : 'none',
                transform:       isCurrent ? 'scale(1.2)' : 'scale(1)',
              }} />
              <span style={{
                ...styles.pipLabel,
                color: isCurrent ? tier.color : isPast ? `${tier.color}88` : '#2A3A5A',
                fontWeight: isCurrent ? 700 : 400,
              }}>
                {tier.name === 'Adamantium' ? 'Adam.' : tier.name}
              </span>
              {isLocked && (
                <span style={styles.pipLevel}>Lv {tier.min}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Next tier unlock preview */}
      {nextTier && (
        <div style={styles.nextTierCard}>
          <div style={styles.nextTierLeft}>
            <span style={styles.nextTierLabel}>NEXT TIER</span>
            <span style={{ ...styles.nextTierName, color: nextTier.color }}>
              {nextTier.name}
            </span>
            <span style={styles.nextTierAt}>at level {nextTier.min}</span>
          </div>
          <div style={styles.nextTierDivider} />
          <div style={styles.nextTierUnlocks}>
            {TIER_UNLOCKS[nextTier.name]}
          </div>
        </div>
      )}

      {/* Adamantium — max tier reached */}
      {!nextTier && currentTier.name === 'Adamantium' && (
        <div style={{ ...styles.nextTierCard, justifyContent: 'center' }}>
          <span style={{ color: '#4ff0d0', fontSize: '12px', fontWeight: 700, letterSpacing: '2px' }}>
            ◆ MAXIMUM TIER REACHED ◆
          </span>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0D1424',
    border:          '1px solid #1E2E48',
    borderRadius:    '12px',
    padding:         '16px',
    marginBottom:    '20px',
    display:         'flex',
    flexDirection:   'column',
    gap:             '12px',
  },
  currentRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  currentLeft: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
  },
  currentTierName: {
    fontSize:      '18px',
    fontWeight:    800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textShadow:    '0 0 20px currentColor',
  },
  currentLevelRange: {
    fontSize: '11px',
    color:    '#5A6A8A',
  },
  currentRight: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-end',
    gap:           '2px',
  },
  levelLabel: {
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#3A4A6A',
  },
  levelValue: {
    fontSize:   '28px',
    fontWeight: 800,
    lineHeight:  1,
  },
  progressTrack: {
    height:          '3px',
    backgroundColor: '#1E2E48',
    borderRadius:    '2px',
    overflow:        'hidden',
  },
  progressFill: {
    height:        '100%',
    borderRadius:  '2px',
    transition:    'width 0.6s ease',
  },
  pipRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    paddingTop:     '4px',
  },
  pipCol: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '4px',
    flex:          1,
  },
  pip: {
    width:        '10px',
    height:       '10px',
    borderRadius: '50%',
    border:       '1.5px solid',
    transition:   'all 0.3s ease',
  },
  pipLabel: {
    fontSize:      '8px',
    letterSpacing: '0.5px',
    textAlign:     'center',
  },
  pipLevel: {
    fontSize: '8px',
    color:    '#2A3A5A',
  },
  nextTierCard: {
    display:         'flex',
    alignItems:      'center',
    gap:             '12px',
    backgroundColor: '#0B0F1A',
    border:          '1px solid #1E2E48',
    borderRadius:    '8px',
    padding:         '12px',
  },
  nextTierLeft: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
    minWidth:      '80px',
  },
  nextTierLabel: {
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#3A4A6A',
  },
  nextTierName: {
    fontSize:      '14px',
    fontWeight:    700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  nextTierAt: {
    fontSize: '10px',
    color:    '#5A6A8A',
  },
  nextTierDivider: {
    width:           '1px',
    height:          '40px',
    backgroundColor: '#1E2E48',
    flexShrink:      0,
  },
  nextTierUnlocks: {
    fontSize:   '11px',
    color:      '#7A8A9A',
    lineHeight: 1.5,
    flex:       1,
  },
};

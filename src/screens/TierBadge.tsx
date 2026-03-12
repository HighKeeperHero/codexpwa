// ============================================================
// TierBadge — Sprint 20.8.4
//
// Compact tier pill for HomeScreen and ProfileScreen.
// Sits next to hero level anywhere in the UI.
//
// Place at: src/screens/TierBadge.tsx
//
// Usage:
//   import { TierBadge } from './TierBadge';
//   <TierBadge heroLevel={hero.progression.hero_level} />
//
//   Optional size prop: 'sm' | 'md' (default 'md')
// ============================================================

import { TIER_FOR_LEVEL } from '../api/pik';

interface Props {
  heroLevel: number;
  size?: 'sm' | 'md';
}

export function TierBadge({ heroLevel, size = 'md' }: Props) {
  const tier = TIER_FOR_LEVEL(heroLevel);

  const fontSize      = size === 'sm' ? '9px'  : '10px';
  const padding       = size === 'sm' ? '2px 7px' : '3px 10px';
  const letterSpacing = size === 'sm' ? '1.5px' : '2px';

  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      gap:             '4px',
      fontSize,
      fontWeight:      700,
      letterSpacing,
      color:           tier.color,
      border:          `1px solid ${tier.color}55`,
      borderRadius:    '4px',
      padding,
      backgroundColor: `${tier.color}11`,
      textTransform:   'uppercase',
      lineHeight:      1,
      whiteSpace:      'nowrap',
    }}>
      <span style={{ fontSize: size === 'sm' ? '6px' : '7px', opacity: 0.8 }}>◆</span>
      {tier.name}
    </span>
  );
}

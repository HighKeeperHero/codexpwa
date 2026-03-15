// ============================================================
// MilestoneCeremony — Sprint 21.4
//
// Reusable full-screen milestone modal.
// Currently handles Level 1 — Hero Awakening.
// Level 20 Alignment Ceremony already handled by AlignmentModal.
// Level 40 Job Awakening deferred to Sprint 22.
//
// Seen state tracked per hero per milestone in localStorage:
//   key: milestone_seen__{rootId}__{milestoneId}
//
// Place at: src/screens/MilestoneCeremony.tsx
//
// Usage in App.tsx Dashboard:
//   import { MilestoneCeremony, checkMilestone } from './MilestoneCeremony';
//
//   useEffect(() => {
//     if (!hero) return;
//     const m = checkMilestone(hero.root_id, hero.progression.hero_level);
//     if (m) setMilestone(m);
//   }, [hero?.root_id, hero?.progression.hero_level]);
//
//   {milestone && (
//     <MilestoneCeremony
//       milestone={milestone}
//       heroName={hero.display_name}
//       rootId={hero.root_id}
//       onDismiss={() => setMilestone(null)}
//     />
//   )}
// ============================================================

import { useState, useEffect } from 'react';
import { createPortal }        from 'react-dom';

// ── Milestone definitions ─────────────────────────────────────────────────────

export interface Milestone {
  id:       string;
  level:    number;
  title:    string;
  subtitle: string;
  lore:     string;
  unlocks:  string[];
  color:    string;
  glyph:    string;
}

const MILESTONES: Milestone[] = [
  {
    id:       'hero_awakening',
    level:    1,
    title:    'HERO AWAKENING',
    subtitle: 'Your journey begins',
    lore:     'The Veil has noticed you. That is enough — for now.',
    glyph:    '◈',
    color:    '#C8900A',
    unlocks: [
      'Daily quests available',
      'Veil Tear encounters unlocked',
      'Hero identity established',
      'Fate Caches can be earned',
    ],
  },
  // Level 20 — Alignment Ceremony handled by AlignmentModal (Sprint 20.4)
  // Level 40 — Job Awakening deferred to Sprint 22
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const seenKey = (rootId: string, milestoneId: string) =>
  `milestone_seen__${rootId}__${milestoneId}`;

/**
 * Returns the Milestone to display if the hero has just reached a milestone
 * level they haven't seen yet. Returns null if nothing to show.
 */
export function checkMilestone(rootId: string, heroLevel: number): Milestone | null {
  for (const m of MILESTONES) {
    if (heroLevel >= m.level && !localStorage.getItem(seenKey(rootId, m.id))) {
      return m;
    }
  }
  return null;
}

export function markMilestoneSeen(rootId: string, milestoneId: string) {
  localStorage.setItem(seenKey(rootId, milestoneId), '1');
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  milestone: Milestone;
  heroName:  string;
  rootId:    string;
  onDismiss: () => void;
}

export function MilestoneCeremony({ milestone, heroName, rootId, onDismiss }: Props) {
  const [phase, setPhase]             = useState<'flash' | 'reveal' | 'unlocks' | 'ready'>('flash');
  const [unlocksShown, setUnlocksShown] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'),  500);
    const t2 = setTimeout(() => setPhase('unlocks'), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== 'unlocks') return;
    if (unlocksShown >= milestone.unlocks.length) {
      const t = setTimeout(() => setPhase('ready'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setUnlocksShown(n => n + 1), 200);
    return () => clearTimeout(t);
  }, [phase, unlocksShown, milestone.unlocks.length]);

  const handleDismiss = () => {
    markMilestoneSeen(rootId, milestone.id);
    onDismiss();
  };

  return createPortal(
    <div style={styles.overlay}>
      {/* Flash */}
      <div style={{
        ...styles.flash,
        backgroundColor: milestone.color,
        opacity: phase === 'flash' ? 0.2 : 0,
      }} />

      {/* Card */}
      <div style={{
        ...styles.card,
        opacity:   phase === 'flash' ? 0 : 1,
        transform: phase === 'flash' ? 'translateY(20px) scale(0.97)' : 'translateY(0) scale(1)',
      }}>
        <div style={{ ...styles.glowRing, boxShadow: `0 0 60px 8px ${milestone.color}33` }} />

        {/* Glyph */}
        <div style={{ ...styles.glyph, color: milestone.color }}>
          {milestone.glyph}
        </div>

        {/* Labels */}
        <div style={styles.eyebrow}>MILESTONE</div>
        <div style={{ ...styles.title, color: milestone.color }}>
          {milestone.title}
        </div>
        <div style={styles.subtitle}>{milestone.subtitle}</div>
        <div style={{ ...styles.heroName }}>— {heroName} —</div>

        {/* Divider */}
        <div style={{ ...styles.divider, background: `${milestone.color}44` }} />

        {/* Lore */}
        <div style={{
          ...styles.lore,
          opacity:   phase === 'flash' ? 0 : 1,
          transform: phase === 'flash' ? 'translateY(8px)' : 'translateY(0)',
        }}>
          "{milestone.lore}"
        </div>

        {/* Unlocks */}
        {(phase === 'unlocks' || phase === 'ready') && (
          <div style={styles.unlocksSection}>
            <div style={styles.unlocksLabel}>UNLOCKED</div>
            <div style={styles.unlocksList}>
              {milestone.unlocks.slice(0, unlocksShown).map((u, i) => (
                <div key={i} style={styles.unlockRow}>
                  <span style={{ ...styles.unlockDot, color: milestone.color }}>◆</span>
                  <span style={styles.unlockText}>{u}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {phase === 'ready' && (
          <button
            style={{ ...styles.cta, background: milestone.color }}
            onClick={handleDismiss}
          >
            BEGIN
          </button>
        )}

        <button style={styles.skip} onClick={handleDismiss}>skip</button>
      </div>
    </div>,
    document.body,
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    zIndex:         9998,
    background:     'rgba(0,0,0,0.92)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px 16px',
  },
  flash: {
    position:      'fixed',
    inset:         0,
    zIndex:        9997,
    transition:    'opacity 0.5s ease',
    pointerEvents: 'none',
  },
  card: {
    position:        'relative',
    width:           '100%',
    maxWidth:        '400px',
    background:      '#0B0F1A',
    border:          '1px solid #1E2E48',
    borderRadius:    '16px',
    padding:         '36px 24px 24px',
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
  glyph: {
    fontSize:     '40px',
    marginBottom: '12px',
    position:     'relative',
    zIndex:       1,
    filter:       'drop-shadow(0 0 16px currentColor)',
  },
  eyebrow: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '4px',
    color:         '#3A4A6A',
    marginBottom:  '6px',
    fontFamily:    "'Cinzel', serif",
  },
  title: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '22px',
    fontWeight:    800,
    letterSpacing: '2px',
    textAlign:     'center',
    marginBottom:  '4px',
    fontFamily:    "'Cinzel', serif",
    textShadow:    '0 0 30px currentColor',
  },
  subtitle: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '12px',
    color:         '#5A6A8A',
    letterSpacing: '1px',
    marginBottom:  '8px',
  },
  heroName: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '13px',
    color:         '#8899AA',
    fontStyle:     'italic',
    marginBottom:  '16px',
    fontFamily:    "'Cinzel', serif",
  },
  divider: {
    position:     'relative',
    zIndex:       1,
    width:        '48px',
    height:       '1px',
    marginBottom: '16px',
  },
  lore: {
    position:      'relative',
    zIndex:        1,
    fontSize:      '13px',
    color:         '#8899AA',
    textAlign:     'center',
    fontStyle:     'italic',
    lineHeight:    1.6,
    marginBottom:  '20px',
    fontFamily:    "'Cinzel', serif",
    transition:    'opacity 0.5s ease, transform 0.5s ease',
  },
  unlocksSection: {
    position:     'relative',
    zIndex:       1,
    width:        '100%',
    marginBottom: '20px',
  },
  unlocksLabel: {
    fontSize:      '9px',
    fontWeight:    700,
    letterSpacing: '3px',
    color:         '#3A4A6A',
    marginBottom:  '10px',
    textAlign:     'center',
    fontFamily:    "'Cinzel', serif",
  },
  unlocksList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '7px',
  },
  unlockRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  unlockDot: {
    fontSize:   '7px',
    flexShrink: 0,
  },
  unlockText: {
    fontSize: '12px',
    color:    '#C0CCE0',
  },
  cta: {
    position:      'relative',
    zIndex:        1,
    width:         '100%',
    padding:       '13px',
    border:        'none',
    borderRadius:  '8px',
    fontSize:      '12px',
    fontWeight:    700,
    letterSpacing: '2px',
    color:         '#0B0F1A',
    cursor:        'pointer',
    marginBottom:  '10px',
    fontFamily:    "'Cinzel', serif",
  },
  skip: {
    background:  'none',
    border:      'none',
    color:       '#2A3A5A',
    fontSize:    '11px',
    cursor:      'pointer',
    padding:     '4px',
  },
};

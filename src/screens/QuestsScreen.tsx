import { useState } from 'react';
import { useAuth } from '@/AuthContext';
import { ALIGNMENT_COLOR } from '@/api/pik';

// ── Hunt definitions per alignment ────────────────────────────────────────────

const ALIGNMENT_META: Record<string, {
  color: string; label: string; realm: string; icon: string;
  desc: string;
}> = {
  ORDER: { color: '#4A7EC8', label: 'Order',  realm: 'The Realm of Structure', icon: '⚖',  desc: 'Law, celestial balance, and unyielding discipline.' },
  CHAOS: { color: '#C85E28', label: 'Chaos',  realm: 'The Realm of Entropy',   icon: '🜲', desc: 'Entropy, change, and untamed power.' },
  LIGHT: { color: '#C8A04E', label: 'Light',  realm: 'The Realm of Radiance',  icon: '☀', desc: 'Solar force, truth, and blinding clarity.' },
  DARK:  { color: '#7A5888', label: 'Dark',   realm: 'The Realm of Shadow',    icon: '☽',  desc: 'Lunar mystery, hidden knowledge, and shadow.' },
};

type Difficulty = 'Standard' | 'Veteran' | 'Elite';
interface Hunt {
  id:         string;
  title:      string;
  brief:      string;
  objective:  string;
  difficulty: Difficulty;
  xp_reward:  number;
  tags:       string[];
}

const HUNTS: Record<string, Hunt[]> = {
  ORDER: [
    {
      id: 'ord-1',
      title: 'The Warden\'s Accounting',
      brief: 'The sentinel house\'s ledger has gone missing before the reckoning cycle.',
      objective: 'Recover all three ledger fragments from the Obsidian Spire before the third bell toll.',
      difficulty: 'Standard',
      xp_reward: 250,
      tags: ['Recovery', 'Timed'],
    },
    {
      id: 'ord-2',
      title: 'Seal the Breach',
      brief: 'A rift in the outer ward is letting something through. The guard rotation ends at dawn.',
      objective: 'Locate and close the breach before the next watch rotation. Leave no witnesses to its existence.',
      difficulty: 'Veteran',
      xp_reward: 400,
      tags: ['Elimination', 'Stealth'],
    },
    {
      id: 'ord-3',
      title: 'Judgment at the Threshold',
      brief: 'An accused stands before the council with no advocate. The verdict will be rendered at midnight.',
      objective: 'Gather sufficient testimony to deliver a just ruling before the council convenes.',
      difficulty: 'Standard',
      xp_reward: 300,
      tags: ['Investigation', 'Narrative'],
    },
    {
      id: 'ord-4',
      title: 'The Unbroken Line',
      brief: 'Three watchtowers have gone dark in sequence. Something is hunting the sentinels.',
      objective: 'Restore all three signal towers and eliminate whatever is dismantling the chain of watch.',
      difficulty: 'Elite',
      xp_reward: 600,
      tags: ['Combat', 'Escort'],
    },
  ],
  CHAOS: [
    {
      id: 'cha-1',
      title: 'Break the Pattern',
      brief: 'The Order has run the same ritual for seven cycles. It is time to interrupt it.',
      objective: 'Disrupt the ritual at its most critical point. Maximum disruption. Minimum survivors.',
      difficulty: 'Veteran',
      xp_reward: 450,
      tags: ['Sabotage', 'Combat'],
    },
    {
      id: 'cha-2',
      title: 'The Wildfire Accord',
      brief: 'The flame-speakers are about to be extinguished by a truce neither side signed.',
      objective: 'Locate the Accord document and ensure it does not survive the night.',
      difficulty: 'Standard',
      xp_reward: 280,
      tags: ['Destruction', 'Stealth'],
    },
    {
      id: 'cha-3',
      title: 'Unmaking the Map',
      brief: 'A cartographer is completing a full survey of the Collapsed Quarter. The knowledge cannot leave.',
      objective: 'Prevent the survey from reaching the Order archive by any means necessary.',
      difficulty: 'Standard',
      xp_reward: 260,
      tags: ['Pursuit', 'Elimination'],
    },
    {
      id: 'cha-4',
      title: 'Entropy\'s Dividend',
      brief: 'The sealed archive is the last thing standing between Order and total collapse. Good.',
      objective: 'Breach the archive, take what cannot be replaced, and leave nothing behind that serves Order.',
      difficulty: 'Elite',
      xp_reward: 650,
      tags: ['Raid', 'High Risk'],
    },
  ],
  LIGHT: [
    {
      id: 'lgt-1',
      title: 'The Exposed Lie',
      brief: 'Someone forged the records. The forgery is hidden in plain sight.',
      objective: 'Follow the trail of false ink back to the hand that held the quill. Bring proof.',
      difficulty: 'Standard',
      xp_reward: 270,
      tags: ['Investigation', 'Expose'],
    },
    {
      id: 'lgt-2',
      title: 'Purge at Dawnfall',
      brief: 'The reliquary is contaminated. If the infection reaches the outer halls, it cannot be stopped.',
      objective: 'Clear all infected chambers before the next sun-cycle. Do not let it spread.',
      difficulty: 'Veteran',
      xp_reward: 420,
      tags: ['Elimination', 'Timed'],
    },
    {
      id: 'lgt-3',
      title: 'Testimony of Ash',
      brief: 'The burned testimonies are still readable — if you know where to look.',
      objective: 'Recover all surviving testimony fragments before the second fire is set.',
      difficulty: 'Standard',
      xp_reward: 290,
      tags: ['Recovery', 'Timed'],
    },
    {
      id: 'lgt-4',
      title: 'The Illuminated Path',
      brief: 'The last keeper of the sun-charts must cross three levels of absolute darkness.',
      objective: 'Escort the Keeper through the lower vaults. No light. No margin for error.',
      difficulty: 'Elite',
      xp_reward: 580,
      tags: ['Escort', 'High Stakes'],
    },
  ],
  DARK: [
    {
      id: 'drk-1',
      title: 'The Unseen Hand',
      brief: 'Someone is feeding patrol coordinates to the Order. They believe they are invisible.',
      objective: 'Identify the informant without alerting them. The identification must be confirmed, not assumed.',
      difficulty: 'Veteran',
      xp_reward: 440,
      tags: ['Investigation', 'Stealth'],
    },
    {
      id: 'drk-2',
      title: 'Veil Without Witness',
      brief: 'The extraction must be clean. No confirmed sightings. No trail.',
      objective: 'Complete the extraction and exit the Spire without triggering a single confirmed sighting.',
      difficulty: 'Elite',
      xp_reward: 620,
      tags: ['Stealth', 'Precision'],
    },
    {
      id: 'drk-3',
      title: 'The Price of Silence',
      brief: 'The debt-stone changes hands tonight. The bearer does not know what they carry.',
      objective: 'Intercept the exchange and recover the debt-stone before it reaches the Hollow Market.',
      difficulty: 'Standard',
      xp_reward: 260,
      tags: ['Interception', 'Stealth'],
    },
    {
      id: 'drk-4',
      title: 'Midnight Reckoning',
      brief: 'The courier leaves at the third bell. The message cannot reach its destination.',
      objective: 'Stop the courier at the third gate. Retrieve the message. Leave no evidence of interception.',
      difficulty: 'Standard',
      xp_reward: 300,
      tags: ['Pursuit', 'Elimination'],
    },
  ],
};

const GENERIC_HUNTS: Hunt[] = [
  {
    id: 'gen-1',
    title: 'The Wanderer\'s Trial',
    brief: 'Every hero begins somewhere. This is where yours begins.',
    objective: 'Complete your first session at a Heroes\' Veritas venue.',
    difficulty: 'Standard',
    xp_reward: 150,
    tags: ['Introduction'],
  },
  {
    id: 'gen-2',
    title: 'First Blood',
    brief: 'The Veil does not yield to the untested.',
    objective: 'Survive your first boss encounter.',
    difficulty: 'Standard',
    xp_reward: 200,
    tags: ['Combat'],
  },
];

const DIFF_COLOR: Record<Difficulty, string> = {
  Standard: '#6A8A5A',
  Veteran:  '#C8A04E',
  Elite:    '#C85E28',
};

export function QuestsScreen() {
  const { hero, alignment } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!hero) return null;

  const fateLevel    = hero.progression.fate_level;
  const hasAlignment = alignment && alignment !== 'NONE' && alignment !== '';
  const isLocked     = fateLevel < 20;
  const meta         = hasAlignment ? ALIGNMENT_META[alignment] : null;
  const hunts        = hasAlignment ? (HUNTS[alignment] ?? GENERIC_HUNTS) : GENERIC_HUNTS;
  const ac           = meta?.color ?? ALIGNMENT_COLOR[alignment ?? ''] ?? 'var(--bronze)';

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" />
            <span className="orn-glyph" style={{ color: hasAlignment ? ac : 'var(--gold)' }}>
              {meta?.icon ?? '◈'}
            </span>
            <div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>
            {hasAlignment ? `${meta!.label.toUpperCase()} HUNTS` : 'HUNTS'}
          </h1>
          {meta && (
            <p style={{ fontSize: 10, letterSpacing: '0.15em', color: ac, opacity: 0.8 }}>
              {meta.realm.toUpperCase()}
            </p>
          )}
        </div>

        {/* Locked state — under level 20 */}
        {isLocked && (
          <div style={{
            padding: '20px 20px', borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 12 }}>◈</div>
            <p className="serif" style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 8 }}>
              Realm Alignment Locked
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 12 }}>
              Reach Fate Level 20 to choose your realm and unlock alignment-specific hunts.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="xp-track" style={{ flex: 1, height: 4 }}>
                <div className="xp-fill" style={{ width: `${Math.min(100, (fateLevel / 20) * 100)}%` }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--ember)', fontWeight: 600, flexShrink: 0 }}>
                Lv {fateLevel} / 20
              </span>
            </div>
          </div>
        )}

        {/* Unaligned — level 20+ but no choice made */}
        {!isLocked && !hasAlignment && (
          <div style={{
            padding: '20px', borderRadius: 12, marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(200,160,78,0.08), rgba(200,94,40,0.04))',
            border: '1px solid rgba(200,160,78,0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
            <p className="serif" style={{ fontSize: 16, color: 'var(--gold)', marginBottom: 8 }}>
              Choose Your Realm
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              You have reached Fate Level 20. Return to the Archive tab to choose your alignment and unlock realm-specific hunts.
            </p>
          </div>
        )}

        {/* Intro text */}
        {hasAlignment && meta && (
          <div style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 4,
            background: `${ac}08`, border: `1px solid ${ac}20`,
          }}>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, fontStyle: 'italic' }}>
              {meta.desc}
            </p>
          </div>
        )}

        {/* Hunt list */}
        <div className="divider">
          <span className="divider-label" style={{ color: hasAlignment ? ac : 'var(--bronze)' }}>
            {hasAlignment ? 'ACTIVE HUNTS' : 'AVAILABLE HUNTS'}  ·  {hunts.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hunts.map(hunt => {
            const isOpen = expanded === hunt.id;
            const dc     = DIFF_COLOR[hunt.difficulty];
            return (
              <div
                key={hunt.id}
                className="card card-pressable"
                onClick={() => setExpanded(isOpen ? null : hunt.id)}
                style={{
                  overflow: 'hidden',
                  ...(isOpen ? { borderColor: `${ac}40` } : {}),
                }}
              >
                <div style={{ display: 'flex', overflow: 'hidden' }}>
                  {/* Left accent */}
                  <div style={{ width: 3, background: isOpen ? ac : 'var(--border)', flexShrink: 0, transition: 'background 0.2s' }} />

                  <div style={{ flex: 1, padding: '14px 14px' }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p className="serif" style={{ fontSize: 15, color: 'var(--text-1)', letterSpacing: '0.02em', marginBottom: 4 }}>
                          {hunt.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                          {hunt.brief}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }}>
                        {isOpen ? '∧' : '∨'}
                      </span>
                    </div>

                    {/* Tags + reward */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.12em', color: dc, fontWeight: 700, border: `1px solid ${dc}40`, padding: '2px 7px', borderRadius: 4 }}>
                        {hunt.difficulty.toUpperCase()}
                      </span>
                      {hunt.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 8, letterSpacing: '0.08em', color: 'var(--text-3)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 4 }}>
                          {tag.toUpperCase()}
                        </span>
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ember)', fontWeight: 600 }}>
                        +{hunt.xp_reward} XP
                      </span>
                    </div>

                    {/* Expanded objective */}
                    {isOpen && (
                      <div style={{
                        marginTop: 14, paddingTop: 14,
                        borderTop: '1px solid var(--border)',
                      }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>
                          OBJECTIVE
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                          {hunt.objective}
                        </p>
                        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8,
                          background: `${ac}08`, border: `1px solid ${ac}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Complete at a Heroes' Veritas venue</span>
                          <span style={{ fontSize: 11, color: ac, fontWeight: 700 }}>+{hunt.xp_reward} XP</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Class unlock teaser */}
        {fateLevel >= 30 && fateLevel < 40 && (
          <>
            <div className="divider"><span className="divider-label">COMING SOON</span></div>
            <div style={{ padding: '16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <p className="serif" style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>Class Specialization</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Reach Fate Level 40 to unlock your Class Quest and choose a specialization path.
              </p>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="xp-track" style={{ flex: 1, height: 3 }}>
                  <div className="xp-fill" style={{ width: `${Math.min(100, ((fateLevel - 30) / 10) * 100)}%`, background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>Lv {fateLevel} / 40</span>
              </div>
            </div>
          </>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

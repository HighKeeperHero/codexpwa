// src/screens/ChronicleScreen.tsx
// ============================================================
// Sprint 8+ — Chronicle Tab
// Surfaces all hero identity data currently hidden:
//   • Narrative profile (region/class/origin/wound/calling/virtue/vice)
//   • Fate tier + progression
//   • Computed gear modifiers
//   • Venue connections + per-venue stats
//   • Activity feed (recent_events)
//   • Fate markers
// All data already loaded via fetchHero() — zero new API calls.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import {
  TIER_FOR_LEVEL,
  ALIGNMENT_COLOR,
  ALIGNMENT_LABEL,
  MODIFIER_LABEL,
  xpProgress,
} from '@/api/pik';

// ── Module-level lore cache (survives re-renders, cleared on page reload) ─────
// Maps rootId → generated lore string so the API is only called once per hero
// per browser session regardless of how many times the Chronicle tab is opened.
const LORE_CACHE = new Map<string, string>();


// ── Types (local mirrors matching pik.ts shapes) ─────────────

type Section = 'identity' | 'modifiers' | 'venues' | 'feed';

// ── Constants ────────────────────────────────────────────────

const EVENT_ICON: Record<string, string> = {
  'progression.xp_granted':       '✦',
  'progression.level_up':         '⬡',
  'progression.session_completed':'◈',
  'loot.cache_opened':            '⬡',
  'loot.cache_granted':           '⬡',
  'gear.item_equipped':           '⚔',
  'gear.item_acquired':           '⊕',
  'title.unlocked':               '◆',
  'title.equipped':               '◆',
  'fate_marker.added':            '◇',
};

const EVENT_LABEL: Record<string, string> = {
  'progression.xp_granted':       'Fate XP gained',
  'progression.level_up':         'Level up',
  'progression.session_completed':'Session completed',
  'loot.cache_opened':            'Cache opened',
  'loot.cache_granted':           'Cache earned',
  'gear.item_equipped':           'Gear equipped',
  'gear.item_acquired':           'Gear acquired',
  'title.unlocked':               'Title unlocked',
  'title.equipped':               'Title equipped',
  'fate_marker.added':            'Fate marker added',
};

// ── Main Component ───────────────────────────────────────────

export function ChronicleScreen() {
  const { hero } = useAuth();
  const [section, setSection] = useState<Section>('identity');

  if (!hero) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 13,
          color: 'rgba(232,224,204,0.45)', margin: 0,
        }}>
          No hero selected
        </p>
      </div>
    );
  }

  const tier          = TIER_FOR_LEVEL(hero.progression.fate_level);
  const alignColor    = ALIGNMENT_COLOR[hero.alignment] ?? '#5A4E3C';
  const prog          = hero.progression;
  const modifiers     = hero.gear?.computed_modifiers;
  const hasModifiers  = modifiers && Object.values(modifiers).some(v => v !== 0);
  const venues        = hero.source_progression ?? [];
  const events        = hero.recent_events ?? [];
  const markers       = prog.fate_markers ?? [];
  const narrative     = hero.narrative;

  const sectionLabels: { key: Section; label: string; count?: number }[] = [
    { key: 'identity',  label: 'Identity' },
    { key: 'modifiers', label: 'Power' },
    { key: 'venues',    label: 'Venues',  count: venues.length },
    { key: 'feed',      label: 'Chronicle', count: events.length > 0 ? events.length : undefined },
  ];

  return (
    <div style={{ padding: '0 0 80px' }}>

      {/* Sticky section nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{ display: 'flex', gap: 6, padding: '14px 16px 12px' }}>
          {sectionLabels.map(({ key, label, count }) => {
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                style={{
                  flex: 1, padding: '7px 4px',
                  background:   active ? alignColor : 'var(--surface)',
                  color:        active ? '#0B0A08' : 'rgba(232,224,204,0.45)',
                  border:       `1px solid ${active ? alignColor : 'var(--border)'}`,
                  borderRadius: 8,
                  fontFamily:   'Cinzel, serif',
                  fontSize:     10, fontWeight: 700, letterSpacing: '0.04em',
                  cursor:       'pointer',
                  display:      'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span style={{
                    fontSize: 9,
                    background: active ? 'rgba(0,0,0,0.2)' : alignColor,
                    color: '#0B0A08',
                    borderRadius: 999, padding: '1px 5px',
                    fontFamily: 'monospace',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '4px 16px 0' }}>

        {/* ── IDENTITY ─────────────────────────────────────────── */}
        {section === 'identity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Tier + XP bar */}
            <TierCard
              tier={tier}
              hero={hero}
              alignColor={alignColor}
            />

            {/* AI Lore Excerpt — generated once per hero, cached in session */}
            {narrative && (
              <LoreExcerpt
                rootId={hero.root_id}
                narrative={narrative}
                alignColor={alignColor}
              />
            )}

            {/* Narrative profile */}
            {narrative && (
              <NarrativeCard narrative={narrative} alignColor={alignColor} />
            )}

            {/* Equipped title */}
            {prog.equipped_title && (
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${alignColor}60`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <Label>Sworn Title</Label>
                <p style={{
                  fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
                  color: alignColor, margin: 0, textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  {prog.equipped_title.replace(/^title_/, '').replace(/_/g, ' ')}
                </p>
              </div>
            )}

            {/* Fate markers */}
            {markers.length > 0 && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <Label>Fate Markers</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {markers.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <span style={{
                        color: alignColor, fontSize: 10, flexShrink: 0, marginTop: 2,
                      }}>◇</span>
                      <p style={{
                        fontSize: 12, color: 'rgba(232,224,204,0.7)',
                        margin: 0, lineHeight: 1.5, fontStyle: 'italic',
                      }}>
                        "{m}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── MODIFIERS (computed gear stats) ──────────────────── */}
        {section === 'modifiers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Loadout summary */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <Label>Active Loadout</Label>
              {hero.gear?.equipment ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['weapon','helm','chest','arms','legs','rune'] as const).map(slot => {
                    const item = (hero.gear!.equipment as any)[slot];
                    return item ? (
                      <div key={slot} style={{
                        background: 'rgba(232,224,204,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 8px',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <span style={{ fontSize: 11 }}>{item.icon ?? '⚔'}</span>
                        <p style={{
                          fontSize: 10, color: 'rgba(232,224,204,0.6)',
                          margin: 0, fontFamily: 'Cinzel, serif',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {slot}
                        </p>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(232,224,204,0.35)', margin: 0, fontStyle: 'italic' }}>
                  No gear equipped
                </p>
              )}
            </div>

            {/* Computed stat bars */}
            {hasModifiers ? (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <Label>Gear Modifiers</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(modifiers!).map(([key, val]) => {
                    if (!val) return null;
                    const label = MODIFIER_LABEL[key] ?? key;
                    const pct   = Math.min(100, Math.abs(val));
                    const isPos = val > 0;
                    return (
                      <ModifierBar
                        key={key}
                        label={label}
                        value={val}
                        pct={pct}
                        isPositive={isPos}
                        alignColor={alignColor}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptySection
                icon="⊕"
                title="No Modifiers Active"
                body="Equip gear from the Vault to unlock stat bonuses."
              />
            )}
          </div>
        )}

        {/* ── VENUES ───────────────────────────────────────────── */}
        {section === 'venues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {venues.length === 0 ? (
              <EmptySection
                icon="◈"
                title="No Venues Linked"
                body="Complete a session at Heroes Veritas to begin your cross-venue identity."
              />
            ) : venues.map(v => (
              <VenueCard key={v.source_id} venue={v} alignColor={alignColor} />
            ))}
          </div>
        )}

        {/* ── ACTIVITY FEED ─────────────────────────────────────── */}
        {section === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.length === 0 ? (
              <EmptySection
                icon="◇"
                title="Chronicle Empty"
                body="Complete a session to begin your chronicle."
              />
            ) : events.map(e => (
              <EventCard
                key={e.event_id}
                event={e}
                alignColor={alignColor}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'Cinzel, serif', fontSize: 9,
      color: 'rgba(232,224,204,0.35)', letterSpacing: '0.15em',
      textTransform: 'uppercase', margin: '0 0 10px',
    }}>
      {children}
    </p>
  );
}

function TierCard({ tier, hero, alignColor }: { tier: any; hero: any; alignColor: string }) {
  const prog  = hero.progression;
  const pct   = xpProgress(prog);
  const label = ALIGNMENT_LABEL[hero.alignment] ?? hero.alignment;

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface), ${tier.color}12)`,
      border: `1px solid ${tier.color}60`,
      borderRadius: 12, padding: '16px 14px',
      boxShadow: `0 0 20px ${tier.color}18`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, flexShrink: 0,
          background: `radial-gradient(circle, ${tier.color}30 0%, transparent 70%)`,
          border: `2px solid ${tier.color}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
          color: tier.color,
        }}>
          {prog.fate_level}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
            color: '#e8e0cc', margin: '0 0 2px',
          }}>
            {hero.display_name}
          </p>
          <p style={{
            fontSize: 11, color: alignColor, margin: 0,
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
          }}>
            {label} · {tier.name}
          </p>
        </div>
      </div>

      {/* XP bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{
          height: 4, background: 'rgba(232,224,204,0.08)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round(pct * 100)}%`,
            background: `linear-gradient(90deg, ${tier.color}, ${tier.color}cc)`,
            borderRadius: 2,
            transition: 'width 1s ease',
          }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, color: 'rgba(232,224,204,0.45)', margin: 0, fontFamily: 'monospace' }}>
          {prog.xp_in_current_level.toLocaleString()} / {prog.xp_to_next_level.toLocaleString()} XP
        </p>
        <p style={{ fontSize: 10, color: 'rgba(232,224,204,0.45)', margin: 0, fontFamily: 'monospace' }}>
          {prog.sessions_completed} sessions
        </p>
      </div>
    </div>
  );
}

// ── LoreExcerpt ───────────────────────────────────────────────
// Calls /api/lore on first render for this rootId.
// Shows a shimmer skeleton while loading, the lore text once ready,
// or silently nothing on error (non-blocking).

function LoreExcerpt({
  rootId, narrative, alignColor,
}: {
  rootId: string;
  narrative: any;
  alignColor: string;
}) {
  const [lore,    setLore]    = useState<string | null>(LORE_CACHE.get(rootId) ?? null);
  const [loading, setLoading] = useState(!LORE_CACHE.has(rootId));
  const fetched = useRef(LORE_CACHE.has(rootId));

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const generate = async () => {
      try {
        const res = await fetch('/api/lore', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            rootId,
            region:  narrative.region,
            class:   narrative.class,
            origin:  narrative.origin,
            wound:   narrative.wound,
            calling: narrative.calling,
            virtue:  narrative.virtue,
            vice:    narrative.vice,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();
        if (data?.lore) {
          LORE_CACHE.set(rootId, data.lore);
          setLore(data.lore);
        }
      } catch {
        // Silently fail — lore is a bonus, not critical
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [rootId]);

  // Shimmer while loading
  if (loading) {
    return (
      <div style={{
        background:   'var(--surface)',
        border:       `1px solid ${alignColor}25`,
        borderRadius: 12,
        padding:      '16px 14px',
        overflow:     'hidden',
        position:     'relative',
      }}>
        <style>{`
          @keyframes lore-shimmer {
            0%   { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
        `}</style>
        {/* Shimmer lines */}
        {[100, 88, 94, 60].map((w, i) => (
          <div key={i} style={{
            height:     11,
            width:      `${w}%`,
            borderRadius: 4,
            marginBottom: i < 3 ? 10 : 0,
            background: `linear-gradient(90deg,
              rgba(232,224,204,0.04) 0%,
              rgba(232,224,204,0.10) 40%,
              rgba(232,224,204,0.04) 80%)`,
            backgroundSize: '800px 100%',
            animation:  `lore-shimmer 1.6s ${i * 0.1}s infinite linear`,
          }} />
        ))}
      </div>
    );
  }

  // Nothing if failed
  if (!lore) return null;

  return (
    <div style={{
      background:   'var(--surface)',
      border:       `1px solid ${alignColor}40`,
      borderRadius: 12,
      padding:      '16px 14px',
      boxShadow:    `0 0 24px ${alignColor}0a`,
      position:     'relative',
      overflow:     'hidden',
    }}>
      {/* Subtle top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${alignColor}60, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        marginBottom:  12,
      }}>
        <span style={{ color: alignColor, fontSize: 11 }}>◈</span>
        <p style={{
          fontFamily:    'Cinzel, serif',
          fontSize:      9,
          color:         `${alignColor}99`,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin:        0,
        }}>
          Fate Chronicle — First Entry
        </p>
        <span style={{
          marginLeft:    'auto',
          fontSize:      8,
          letterSpacing: '0.1em',
          color:         'rgba(232,224,204,0.2)',
          fontFamily:    'Cinzel, serif',
          textTransform: 'uppercase',
        }}>
          AI · Unique
        </span>
      </div>

      {/* Lore text */}
      <p style={{
        fontFamily:  'Georgia, serif',
        fontSize:    13,
        fontStyle:   'italic',
        color:       'rgba(232,224,204,0.80)',
        lineHeight:  1.75,
        margin:      0,
        letterSpacing: '0.01em',
      }}>
        {lore}
      </p>
    </div>
  );
}

function NarrativeCard({ narrative, alignColor }: { narrative: any; alignColor: string }) {
  const rows = [
    { label: 'Region',   value: narrative.region },
    { label: 'Class',    value: narrative.class },
    { label: 'Origin',   value: narrative.origin },
    { label: 'Wound',    value: narrative.wound },
    { label: 'Calling',  value: narrative.calling },
    { label: 'Virtue',   value: narrative.virtue },
    { label: 'Vice',     value: narrative.vice },
  ];

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${alignColor}40`,
      borderRadius: 12, padding: '14px 14px',
      boxShadow: `0 0 16px ${alignColor}10`,
    }}>
      <Label>Fate Codex</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ label, value }) => value ? (
          <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 9,
              color: 'rgba(232,224,204,0.35)', letterSpacing: '0.1em',
              textTransform: 'uppercase', margin: 0,
              minWidth: 52, paddingTop: 1,
            }}>
              {label}
            </p>
            <p style={{
              fontSize: 12, color: '#e8e0cc',
              margin: 0, lineHeight: 1.4, flex: 1,
            }}>
              {value}
            </p>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

function ModifierBar({
  label, value, pct, isPositive, alignColor,
}: {
  label: string; value: number; pct: number; isPositive: boolean; alignColor: string;
}) {
  const barColor = isPositive ? alignColor : '#f87171';
  const sign     = isPositive ? '+' : '';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{
          fontSize: 11, color: 'rgba(232,224,204,0.7)',
          margin: 0, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em',
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: 'monospace', fontSize: 11,
          color: isPositive ? barColor : '#f87171',
          fontWeight: 700, margin: 0,
        }}>
          {sign}{value}%
        </p>
      </div>
      <div style={{
        height: 3, background: 'rgba(232,224,204,0.06)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function VenueCard({ venue, alignColor }: { venue: any; alignColor: string }) {
  const lastDate = venue.last_activity
    ? new Date(venue.last_activity).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
    : null;

  const stats = [
    { label: 'Sessions',   value: venue.sessions },
    { label: 'XP',         value: venue.xp_contributed?.toLocaleString() },
    { label: 'Boss Kills', value: venue.boss_kills },
    { label: 'Caches',     value: venue.caches_granted },
  ].filter(s => s.value != null && s.value !== 0);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: `${alignColor}20`,
          border: `1px solid ${alignColor}60`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: alignColor,
        }}>
          ◈
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            color: '#e8e0cc', margin: '0 0 2px',
          }}>
            {venue.source_name ?? venue.source_id}
          </p>
          {lastDate && (
            <p style={{ fontSize: 10, color: 'rgba(232,224,204,0.35)', margin: 0 }}>
              Last visit {lastDate}
            </p>
          )}
        </div>
        {venue.best_boss_pct > 0 && (
          <div style={{
            flexShrink: 0, textAlign: 'right',
          }}>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
              color: '#f59e0b', margin: '0 0 1px',
            }}>
              {venue.best_boss_pct}%
            </p>
            <p style={{ fontSize: 9, color: 'rgba(232,224,204,0.35)', margin: 0 }}>
              best boss
            </p>
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, background: 'rgba(232,224,204,0.04)',
              borderRadius: 6, padding: '6px 8px', textAlign: 'center',
            }}>
              <p style={{
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                color: alignColor, margin: '0 0 2px',
              }}>
                {value}
              </p>
              <p style={{
                fontSize: 9, color: 'rgba(232,224,204,0.35)', margin: 0,
                fontFamily: 'Cinzel, serif', letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, alignColor }: { event: any; alignColor: string }) {
  const icon  = EVENT_ICON[event.event_type]  ?? '◇';
  const label = EVENT_LABEL[event.event_type] ?? event.event_type.replace(/\./g, ' ').replace(/_/g, ' ');

  const timeStr = event.ts
    ? new Date(event.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '';

  const detail: string[] = [];
  if (event.payload?.xp)                          detail.push(`+${event.payload.xp} XP`);
  if (event.changes?.reward_name)                 detail.push(String(event.changes.reward_name));
  if (event.changes?.reward_rarity)               detail.push(String(event.changes.reward_rarity));

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        background: `${alignColor}18`,
        border: `1px solid ${alignColor}40`,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: alignColor,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, color: '#e8e0cc', margin: '0 0 2px',
          textTransform: 'capitalize',
        }}>
          {label}
        </p>
        {detail.length > 0 && (
          <p style={{ fontSize: 11, color: alignColor, margin: '0 0 2px', fontWeight: 700 }}>
            {detail.join(' · ')}
          </p>
        )}
        {timeStr && (
          <p style={{ fontSize: 10, color: 'rgba(232,224,204,0.3)', margin: 0 }}>
            {timeStr}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptySection({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 28, marginBottom: 12, color: 'rgba(232,224,204,0.45)', opacity: 0.4 }}>
        {icon}
      </div>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: 13,
        color: 'rgba(232,224,204,0.45)', margin: '0 0 8px',
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 12, color: 'rgba(232,224,204,0.35)',
        margin: 0, lineHeight: 1.6,
      }}>
        {body}
      </p>
    </div>
  );
}

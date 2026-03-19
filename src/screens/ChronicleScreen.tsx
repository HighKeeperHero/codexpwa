// src/screens/ChronicleScreen.tsx
// Sprint 22.1 — Full Chronicle Timeline
// - Dedicated timeline fetch from /api/users/:root_id/timeline
// - Category filter tabs: All, Combat, Gear, Progression, Titles
// - Milestone markers for level_up, tier_ascension, awakening events
// - Shareable moments via tap → share (22.3)
// - Full event type coverage for all Sprint 21+ events

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL, MODIFIER_LABEL, xpProgress } from '@/api/pik';
import { ShareFateCard } from './ShareFateCard';

const BASE = 'https://pik-prd-production.up.railway.app';
const LORE_CACHE = new Map<string, string>();

type Section  = 'identity' | 'modifiers' | 'venues' | 'feed';
type Category = 'all' | 'combat' | 'gear' | 'progression' | 'titles';

// ── Event metadata ────────────────────────────────────────────────────────────
const EVENT_ICON: Record<string, string> = {
  'progression.xp_granted':        '✦',
  'progression.level_up':          '⬡',
  'progression.session_completed': '◈',
  'loot.cache_opened':             '⬡',
  'loot.cache_granted':            '⬡',
  'gear.item_equipped':            '⚔',
  'gear.item_acquired':            '⊕',
  'gear.item_dismantled':          '◌',
  'title.unlocked':                '◆',
  'title.equipped':                '◆',
  'identity.title_equipped':       '◆',
  'identity.title_earned':         '◆',
  'fate_marker.added':             '◇',
  'veil.tear_sealed':              '⚡',
  'veil.cache_earned':             '⬡',
  'veil_quest_complete':           '✦',
  'identity.hero_awakened':        '◈',
  'identity.onboarding_complete':  '◈',
  'identity.tier_ascension':       '⬡',
  'identity.alignment_chosen':     '⚖',
};

const EVENT_LABEL: Record<string, string> = {
  'progression.xp_granted':        'Fate XP gained',
  'progression.level_up':          'Level up',
  'progression.session_completed': 'Session completed',
  'loot.cache_opened':             'Cache opened',
  'loot.cache_granted':            'Cache earned',
  'gear.item_equipped':            'Gear equipped',
  'gear.item_acquired':            'Gear acquired',
  'gear.item_dismantled':          'Gear dismantled',
  'title.unlocked':                'Title unlocked',
  'title.equipped':                'Title equipped',
  'identity.title_equipped':       'Title equipped',
  'identity.title_earned':         'Title earned',
  'fate_marker.added':             'Fate marker added',
  'veil.tear_sealed':              'Veil Tear sealed',
  'veil.cache_earned':             'Cache from the Veil',
  'veil_quest_complete':           'Veil quest complete',
  'identity.hero_awakened':        'Hero Awakened',
  'identity.onboarding_complete':  'Entered the Codex',
  'identity.tier_ascension':       'Tier ascension',
  'identity.alignment_chosen':     'Alignment chosen',
};

const MILESTONE_EVENTS = new Set([
  'progression.level_up',
  'identity.hero_awakened',
  'identity.onboarding_complete',
  'identity.tier_ascension',
  'identity.alignment_chosen',
  'identity.title_earned',
  'veil_quest_complete',
]);

const CATEGORY_MAP: Record<string, Category> = {
  'progression.xp_granted':        'progression',
  'progression.level_up':          'progression',
  'progression.session_completed': 'progression',
  'identity.hero_awakened':        'progression',
  'identity.onboarding_complete':  'progression',
  'identity.tier_ascension':       'progression',
  'identity.alignment_chosen':     'progression',
  'loot.cache_opened':             'gear',
  'loot.cache_granted':            'gear',
  'gear.item_equipped':            'gear',
  'gear.item_acquired':            'gear',
  'gear.item_dismantled':          'gear',
  'veil.tear_sealed':              'combat',
  'veil.cache_earned':             'combat',
  'veil_quest_complete':           'combat',
  'title.unlocked':                'titles',
  'title.equipped':                'titles',
  'identity.title_equipped':       'titles',
  'identity.title_earned':         'titles',
};

// ── Main screen ───────────────────────────────────────────────────────────────
export function ChronicleScreen() {
  const { hero } = useAuth();
  const [section,   setSection]   = useState<Section>('identity');
  const [category,  setCategory]  = useState<Category>('all');
  const [timeline,  setTimeline]  = useState<any[]>([]);
  const [tlLoading, setTlLoading] = useState(false);
  const [tlLoaded,  setTlLoaded]  = useState(false);
  const [shareEvent, setShareEvent] = useState<any | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!hero?.root_id || tlLoaded) return;
    setTlLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/users/${hero.root_id}/timeline`);
      const json = await res.json();
      const raw  = json?.data?.data ?? json?.data ?? json ?? [];
      setTimeline(Array.isArray(raw) ? raw : []);
      setTlLoaded(true);
    } catch {
      setTimeline([]);
    } finally {
      setTlLoading(false);
    }
  }, [hero?.root_id, tlLoaded]);

  useEffect(() => {
    if (section === 'feed') fetchTimeline();
  }, [section, fetchTimeline]);

  if (!hero) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No hero selected</p>
    </div>
  );

  const prog       = hero.progression;
  const heroLevel  = prog.hero_level ?? prog.fate_level;
  const tier       = TIER_FOR_LEVEL(heroLevel);
  const alignColor = ALIGNMENT_COLOR[hero.alignment] ?? '#5A4E3C';
  const modifiers  = hero.gear?.computed_modifiers;
  const hasModifiers = modifiers && Object.values(modifiers).some(v => v !== 0);
  const venues     = hero.source_progression ?? [];
  const narrative  = hero.narrative;

  // Filter timeline by category
  const filteredTimeline = timeline.filter(e => {
    if (category === 'all') return true;
    return CATEGORY_MAP[e.event_type] === category;
  });

  const sectionLabels: { key: Section; label: string; count?: number }[] = [
    { key: 'identity',  label: 'Identity' },
    { key: 'modifiers', label: 'Power' },
    { key: 'venues',    label: 'Venues',    count: venues.length || undefined },
    { key: 'feed',      label: 'Chronicle', count: timeline.length > 0 ? timeline.length : undefined },
  ];

  const categoryLabels: { key: Category; label: string }[] = [
    { key: 'all',         label: 'All'         },
    { key: 'combat',      label: 'Combat'      },
    { key: 'gear',        label: 'Gear'        },
    { key: 'progression', label: 'Progress'    },
    { key: 'titles',      label: 'Titles'      },
  ];

  return (
    <div className="screen-enter" style={{ padding: '0 0 80px' }}>
      {/* Sticky section nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ display: 'flex', gap: 6, padding: '14px 16px 12px' }}>
          {sectionLabels.map(({ key, label, count }) => {
            const active = section === key;
            return (
              <button key={key} onClick={() => setSection(key)} style={{
                flex: 1, padding: '7px 4px',
                background: active ? alignColor : 'var(--surface)',
                color: active ? '#0B0F1A' : 'var(--text-3)',
                border: `1px solid ${active ? alignColor : 'var(--border)'}`,
                borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 12,
                fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span style={{ fontSize: 11, background: active ? 'rgba(0,0,0,0.2)' : alignColor, color: '#0B0F1A', borderRadius: 999, padding: '1px 5px', fontFamily: 'monospace' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '4px 16px 0' }}>

        {/* ── IDENTITY */}
        {section === 'identity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TierCard tier={tier} hero={hero} alignColor={alignColor} />
            {narrative && <LoreExcerpt rootId={hero.root_id} narrative={narrative} alignColor={alignColor} />}
            {narrative && <NarrativeCard narrative={narrative} alignColor={alignColor} />}
            {(hero.equipped_title ?? prog.equipped_title) && (
              <div style={{ background: 'var(--surface)', border: `1px solid ${alignColor}60`, borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <Label>Sworn Title</Label>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: alignColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {(hero.equipped_title ?? prog.equipped_title).replace(/^title_/, '').replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── POWER */}
        {section === 'modifiers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <Label>Active Loadout</Label>
              {hero.gear?.equipment ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['weapon','helm','chest','arms','legs','rune'] as const).map(slot => {
                    const item = (hero.gear!.equipment as any)[slot];
                    return item ? (
                      <div key={slot} style={{ background: 'rgba(240,237,230,0.05)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12 }}>{item.icon ?? '⚔'}</span>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot}</p>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' }}>No gear equipped</p>
              )}
            </div>
            {hasModifiers ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <Label>Gear Modifiers</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(modifiers!).map(([key, val]) => {
                    if (!val) return null;
                    const label = MODIFIER_LABEL[key] ?? key;
                    const pct   = Math.min(100, Math.abs(val as number));
                    const isPos = (val as number) > 0;
                    return <ModifierBar key={key} label={label} value={val as number} pct={pct} isPositive={isPos} />;
                  })}
                </div>
              </div>
            ) : (
              <EmptySection icon="⊕" title="No Modifiers Active" body="Equip gear from the Vault to unlock stat bonuses." />
            )}
          </div>
        )}

        {/* ── VENUES */}
        {section === 'venues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {venues.length === 0 ? (
              <EmptySection icon="◈" title="No Venues Linked" body="Complete a session at Heroes Veritas to begin your cross-venue identity." />
            ) : venues.map((v: any) => <VenueCard key={v.source_id} venue={v} alignColor={alignColor} />)}
          </div>
        )}

        {/* ── CHRONICLE */}
        {section === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 4, overflowX: 'auto', paddingBottom: 2 }}>
              {categoryLabels.map(({ key, label }) => {
                const active = category === key;
                return (
                  <button key={key} onClick={() => setCategory(key)} style={{
                    padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? alignColor : 'var(--border)'}`,
                    background: active ? `${alignColor}22` : 'transparent',
                    color: active ? alignColor : 'var(--text-3)',
                    fontSize: 11, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {tlLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em' }}>
                  Reading the Chronicle…
                </p>
              </div>
            )}

            {!tlLoading && filteredTimeline.length === 0 && (
              <EmptySection icon="◇" title="Chronicle Empty" body={
                category === 'all'
                  ? 'Your story has not yet been written.'
                  : `No ${category} events recorded yet.`
              } />
            )}

            {filteredTimeline.map((e: any, i: number) => (
              <EventCard
                key={e.event_id ?? i}
                event={e}
                alignColor={alignColor}
                isMilestone={MILESTONE_EVENTS.has(e.event_type)}
                onShare={() => setShareEvent(e)}
              />
            ))}

            {!tlLoading && filteredTimeline.length > 0 && (
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', padding: '8px 0 0', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>
                {filteredTimeline.length} record{filteredTimeline.length !== 1 ? 's' : ''} in your Chronicle
              </p>
            )}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareEvent && (
        <ShareFateCard onClose={() => setShareEvent(null)} highlightEvent={shareEvent} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function TierCard({ tier, hero, alignColor }: { tier: any; hero: any; alignColor: string }) {
  const prog = hero.progression;
  const heroLevel = prog.hero_level ?? prog.fate_level;
  const pct = xpProgress(prog);
  const label = ALIGNMENT_LABEL[hero.alignment] ?? hero.alignment;
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${alignColor}50`, borderRadius: 'var(--radius)', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${alignColor}18`, border: `1px solid ${alignColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: alignColor, flexShrink: 0 }}>
          {tier.isJob ? '✦' : heroLevel}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>{hero.display_name}</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tier.color }}>{tier.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 11, color: alignColor, fontWeight: 600 }}>{label}</span>
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: alignColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function LoreExcerpt({ rootId, narrative, alignColor }: { rootId: string; narrative: any; alignColor: string }) {
  const [lore, setLore] = useState<string | null>(LORE_CACHE.get(rootId) ?? null);
  const [loading, setLoading] = useState(!LORE_CACHE.has(rootId));
  const fetched = useRef(LORE_CACHE.has(rootId));

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const generate = async () => {
      try {
        const res = await fetch('/api/lore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ narrative }),
        });
        const data = await res.json();
        const text = data?.lore ?? data?.data?.lore ?? null;
        if (text) { LORE_CACHE.set(rootId, text); setLore(text); }
      } catch { /* silent */ } finally { setLoading(false); }
    };
    generate();
  }, [rootId, narrative]);

  if (loading || !lore) return null;
  return (
    <div style={{ background: `${alignColor}08`, border: `1px solid ${alignColor}25`, borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <Label>The Veil Speaks</Label>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>"{lore}"</p>
    </div>
  );
}

function NarrativeCard({ narrative, alignColor }: { narrative: any; alignColor: string }) {
  const fields = [
    { label: 'Origin',   value: narrative.region  },
    { label: 'History',  value: narrative.origin  },
    { label: 'Wound',    value: narrative.wound   },
    { label: 'Calling',  value: narrative.calling },
  ].filter(f => f.value);

  if (fields.length === 0) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <Label>Fate Record</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => (
          <div key={f.label} style={{ borderLeft: `2px solid ${alignColor}40`, paddingLeft: 10 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: 'var(--text-3)', margin: '0 0 2px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase' }}>{f.label}</p>
            <p style={{ fontSize: 12, color: 'var(--text-1)', margin: 0, lineHeight: 1.5 }}>{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModifierBar({ label, value, pct, isPositive }: { label: string; value: number; pct: number; isPositive: boolean }) {
  const barColor = isPositive ? 'var(--gold)' : 'var(--ember)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>{isPositive ? '+' : ''}{value}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function VenueCard({ venue, alignColor }: { venue: any; alignColor: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>{venue.source_name ?? 'Heroes Veritas'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{venue.sessions ?? 0} sessions · {venue.total_xp?.toLocaleString() ?? 0} XP</p>
        </div>
        {venue.caches_granted > 0 && (
          <span style={{ fontSize: 11, color: alignColor, fontWeight: 700, background: `${alignColor}18`, border: `1px solid ${alignColor}35`, borderRadius: 4, padding: '2px 7px' }}>
            {venue.caches_granted} caches
          </span>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, alignColor, isMilestone, onShare }: {
  event: any; alignColor: string; isMilestone: boolean; onShare: () => void;
}) {
  const icon    = EVENT_ICON[event.event_type]  ?? '◇';
  const label   = EVENT_LABEL[event.event_type] ?? event.event_type.replace(/\./g, ' ').replace(/_/g, ' ');
  const timeStr = event.ts
    ? new Date(event.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : event.created_at
    ? new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '';
  const detail: string[] = [];
  if (event.payload?.xp)              detail.push(`+${event.payload.xp} XP`);
  if (event.payload?.xp_granted)      detail.push(`+${event.payload.xp_granted} XP`);
  if (event.changes?.reward_name)     detail.push(String(event.changes.reward_name));
  if (event.changes?.reward_rarity)   detail.push(String(event.changes.reward_rarity));
  if (event.payload?.hero_name)       detail.push(String(event.payload.hero_name));
  if (event.payload?.tear_name)       detail.push(String(event.payload.tear_name));
  if (event.changes?.level)           detail.push(`Level ${event.changes.level}`);

  const cardBg     = isMilestone ? `${alignColor}10` : 'var(--surface)';
  const cardBorder = isMilestone ? `1px solid ${alignColor}50` : '1px solid var(--border)';

  return (
    <div
      onClick={isMilestone ? onShare : undefined}
      style={{
        background: cardBg, border: cardBorder,
        borderRadius: 8, padding: '10px 12px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: isMilestone ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {/* Milestone accent bar */}
      {isMilestone && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: alignColor, borderRadius: '8px 0 0 8px' }} />
      )}
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        background: isMilestone ? `${alignColor}25` : `${alignColor}18`,
        border: `1px solid ${alignColor}40`,
        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: alignColor,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: isMilestone ? 'var(--text-1)' : 'var(--text-2)', margin: '0 0 2px', textTransform: 'capitalize', fontWeight: isMilestone ? 700 : 400 }}>
          {label}
        </p>
        {detail.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--gold)', margin: '0 0 2px', fontWeight: 700 }}>{detail.join(' · ')}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {timeStr && <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{timeStr}</p>}
          {isMilestone && <p style={{ fontSize: 10, color: alignColor, margin: 0, letterSpacing: '0.08em' }}>TAP TO SHARE</p>}
        </div>
      </div>
    </div>
  );
}

function EmptySection({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 28, marginBottom: 12, color: 'var(--text-3)', opacity: 0.4 }}>{icon}</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-2)', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

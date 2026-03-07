import { useState } from 'react';
import { useAuth } from '@/AuthContext';
import { ALIGNMENT_COLOR, ALIGNMENT_LABEL, MODIFIER_LABEL, type GearItem } from '@/api/pik';

const RC: Record<string, string> = {
  common: '#7C5C3A', uncommon: '#6A8A5A', rare: '#3A78A8',
  epic: '#C8A04E', legendary: '#E2B85E', mythic: '#B858A8',
};

function fmt(ts: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

const GEAR_SLOTS = ['weapon','helm','chest','arms','legs','rune'] as const;
const SLOT_LABEL: Record<string, string> = { weapon: 'WEAPON', helm: 'HELM', chest: 'CHEST', arms: 'ARMS', legs: 'LEGS', rune: 'RUNE' };

function GearSlot({ item, slot }: { item: GearItem | null; slot: string }) {
  const [open, setOpen] = useState(false);
  const rc = item ? RC[item.rarity] ?? 'var(--bronze)' : 'var(--text-3)';
  return (
    <div
      className={`card ${item ? 'card-pressable' : ''}`}
      onClick={item ? () => setOpen(o => !o) : undefined}
      style={{ display: 'flex', opacity: item ? 1 : 0.35, borderColor: open ? rc + '60' : undefined }}
    >
      <div style={{ width: 3, background: item ? rc : 'var(--border)', flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: open ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, minWidth: 28, textAlign: 'center' }}>{item?.icon ?? '○'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: item ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 500 }}>
                {item?.item_name ?? `No ${SLOT_LABEL[slot].toLowerCase()} equipped`}
              </span>
              <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>{SLOT_LABEL[slot]}</span>
            </div>
            {item && (
              <span style={{ fontSize: 8, letterSpacing: 1.2, color: rc, fontWeight: 600 }}>{item.rarity.toUpperCase()}</span>
            )}
          </div>
          {item && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{open ? '∧' : '∨'}</span>}
        </div>

        {open && item && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{item.description}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.6 }}>"{item.lore_text}"</p>
            {Object.keys(item.modifiers).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(item.modifiers).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 9, letterSpacing: 1, color: 'var(--gold)', border: '1px solid var(--gold-dim)', background: 'var(--gold-glow)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                    +{v} {MODIFIER_LABEL[k] ?? k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const { hero, isRefreshing, refreshHero, isOnline } = useAuth();
  const [activeTab, setActiveTab] = useState<'identity' | 'gear' | 'narrative'>('identity');
  if (!hero) return null;

  const { progression, sources, source_progression, wearable, gear, narrative } = hero;
  const ac = ALIGNMENT_COLOR[hero.alignment] ?? 'var(--bronze)';
  const equippedTitle = progression.titles.find(t => t.title_id === progression.equipped_title)
    ?? (progression.titles.length > 0 ? progression.titles[0] : null);

  const computedMods = gear?.computed_modifiers;

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" /><span className="orn-glyph">◉</span><div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>THE ARCHIVE</h1>
          <p className="serif" style={{ fontSize: 20, color: 'var(--text-1)', letterSpacing: 0.3 }}>{hero.display_name}</p>
          {equippedTitle && (
            <p className="serif" style={{ fontSize: 12, color: 'var(--gold-dim)', fontStyle: 'italic' }}>{equippedTitle.title_name}</p>
          )}
          <span className="badge" style={{ color: ac, borderColor: `${ac}45`, background: `${ac}10` }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
            {ALIGNMENT_LABEL[hero.alignment] ?? hero.alignment}
          </span>
        </div>

        {/* Refresh */}
        <button onClick={() => refreshHero()} disabled={isRefreshing || !isOnline} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', fontSize: 9, letterSpacing: 1.5, padding: '9px 0', marginBottom: 16, background: 'var(--surface)', opacity: !isOnline ? 0.4 : 1 }}>
          {isRefreshing ? <><span className="live-dot" /><span>REFRESHING</span></> : <span>↺  REFRESH FROM PIK</span>}
        </button>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {(['identity','gear','narrative'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '9px 0', fontSize: 8, letterSpacing: 1.5, fontWeight: 600, border: `1px solid ${activeTab === t ? 'var(--gold)' : 'var(--border)'}`, background: activeTab === t ? 'var(--gold-glow)' : 'var(--surface)', color: activeTab === t ? 'var(--gold)' : 'var(--text-3)', borderRadius: 6, transition: 'all 0.15s' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── IDENTITY TAB ── */}
        {activeTab === 'identity' && (
          <>
            {/* Wristband */}
            <Section label="WRISTBAND" accentColor={wearable?.status === 'active' ? 'var(--gold)' : 'var(--text-3)'}>
              <div className="card" style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...(wearable?.status === 'active' ? { borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, opacity: wearable?.status === 'active' ? 1 : 0.25 }}>⌚</span>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 3 }}>FATE WRISTBAND</p>
                    <p style={{ fontSize: 13, color: wearable?.status === 'active' ? 'var(--gold)' : 'var(--text-3)' }}>
                      {wearable?.status === 'active' ? 'ACTIVE — Identity Bound' : 'NOT ISSUED'}
                    </p>
                  </div>
                </div>
                {wearable?.status === 'active' && <span style={{ fontSize: 16, color: 'var(--gold)' }}>✦</span>}
              </div>
            </Section>

            {/* Titles */}
            <Section label="TITLES" count={progression.titles.length} accentColor="var(--gold)">
              {progression.titles.length === 0
                ? <Empty icon="★" text="No titles yet" sub="Complete sessions and boss encounters to earn titles" />
                : progression.titles.map((t, i) => {
                    const rc = RC[t.rarity] ?? 'var(--bronze)';
                    const isEquipped = t.title_id === progression.equipped_title;
                    return (
                      <div key={t.title_id ?? i} className="card" style={{ display: 'flex', overflow: 'hidden', ...(isEquipped ? { borderColor: 'var(--gold-dim)' } : {}) }}>
                        <div style={{ width: 3, background: rc, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p className="serif" style={{ fontSize: 14, color: rc, letterSpacing: 0.2 }}>{t.title_name}</p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                              {isEquipped && <span style={{ fontSize: 8, color: 'var(--gold)', letterSpacing: 1 }}>✦ EQUIPPED</span>}
                              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{t.category.toUpperCase()}</span>
                              {t.granted_at && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{fmt(t.granted_at)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </Section>

            {/* Fate Markers */}
            {progression.fate_markers.length > 0 && (
              <Section label="FATE MARKERS" count={progression.fate_markers.length} accentColor="var(--sapphire-bright)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...new Set(progression.fate_markers)].map((m, i) => {
                    const count = progression.fate_markers.filter(x => x === m).length;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic', flex: 1 }}>{m}</p>
                        {count > 1 && <span style={{ fontSize: 9, color: 'var(--sapphire-bright)', marginLeft: 8, flexShrink: 0 }}>×{count}</span>}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Venue Progression */}
            <Section label="VENUES" count={source_progression.length} accentColor="var(--bronze-hi)">
              {source_progression.length === 0
                ? <Empty icon="🏰" text="No venues linked" sub="Visit a Heroes' Veritas venue to link your Fate ID" />
                : source_progression.map((s, i) => (
                    <div key={s.source_id ?? i} className="card" style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 14, color: 'var(--text-1)' }}>{s.source_name}</p>
                        <span style={{ fontSize: 8, letterSpacing: 1.2, color: 'var(--gold)', fontWeight: 600 }}>{s.sessions} SESSIONS</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[
                          { val: s.xp_contributed.toLocaleString(), label: 'XP EARNED' },
                          { val: s.boss_kills,                      label: 'BOSS KILLS' },
                          { val: `${s.best_boss_pct}%`,             label: 'BEST RUN'  },
                        ].map((stat, j) => (
                          <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', background: 'var(--surface-inset)', borderRadius: 6, padding: '8px 0' }}>
                            <span className="serif-bold" style={{ fontSize: 14, color: 'var(--text-1)' }}>{stat.val}</span>
                            <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>{stat.label}</span>
                          </div>
                        ))}
                      </div>
                      {s.best_boss_pct > 0 && (
                        <div>
                          <div className="xp-track" style={{ height: 3 }}>
                            <div className="xp-fill" style={{ width: `${s.best_boss_pct}%`, background: s.best_boss_pct >= 100 ? 'linear-gradient(90deg, var(--gold-dim), var(--gold))' : 'linear-gradient(90deg, var(--ember-dim), var(--ember))' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              }
            </Section>

            {/* Identity */}
            <Section label="FATE IDENTITY" accentColor="var(--bronze)">
              <div className="card" style={{ overflow: 'hidden' }}>
                {[
                  { label: 'ROOT ID',       value: hero.root_id,                               mono: true  },
                  { label: 'STATUS',        value: hero.account_type?.toUpperCase() ?? '—',    mono: false },
                  { label: 'ENROLLED',      value: fmt(hero.created_at),                       mono: false },
                  { label: 'FATE LEVEL',    value: String(progression.fate_level),             mono: false },
                  { label: 'TOTAL XP',      value: progression.total_xp.toLocaleString(),      mono: false },
                  { label: 'SESSIONS',      value: String(progression.sessions_completed),     mono: false },
                ].map((f, i, arr) => (
                  <div key={i} style={{ padding: '11px 15px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 3 }}>{f.label}</p>
                    <p style={{ fontSize: f.mono ? 11 : 13, color: f.mono ? 'var(--text-2)' : 'var(--text-1)', fontFamily: f.mono ? 'ui-monospace, monospace' : undefined, letterSpacing: f.mono ? 0.8 : 0.2 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── GEAR TAB ── */}
        {activeTab === 'gear' && (
          <>
            {!gear ? (
              <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 32, opacity: 0.2 }}>⚔</span>
                <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No gear data available</p>
                <p style={{ color: 'var(--text-3)', fontSize: 11, opacity: 0.6 }}>Play a session to earn your first items</p>
              </div>
            ) : (
              <>
                {/* Computed stats */}
                {computedMods && Object.values(computedMods).some(v => (v as number) > 0) && (
                  <Section label="LOADOUT POWER" accentColor="var(--gold)">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {Object.entries(computedMods)
                        .filter(([, v]) => (v as number) > 0)
                        .map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 0' }}>
                            <span className="serif-bold" style={{ fontSize: 16, color: 'var(--gold)' }}>+{v as number}</span>
                            <span style={{ fontSize: 7, letterSpacing: 1.2, color: 'var(--text-3)', fontWeight: 600, textAlign: 'center' }}>{MODIFIER_LABEL[k] ?? k}</span>
                          </div>
                        ))}
                    </div>
                  </Section>
                )}

                <Section label="EQUIPPED LOADOUT" accentColor="var(--bronze-hi)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {GEAR_SLOTS.map(slot => (
                      <GearSlot key={slot} slot={slot} item={gear.equipment[slot]} />
                    ))}
                  </div>
                </Section>

                {gear.inventory.filter(i => !i.is_equipped).length > 0 && (
                  <Section label="INVENTORY" count={gear.inventory.filter(i => !i.is_equipped).length} accentColor="var(--text-3)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {gear.inventory.filter(i => !i.is_equipped).map((item, idx) => (
                        <GearSlot key={item.inventory_id ?? idx} slot={item.slot} item={item} />
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
          </>
        )}

        {/* ── NARRATIVE TAB ── */}
        {activeTab === 'narrative' && (
          <>
            <div style={{ padding: '16px 0 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7, fontStyle: 'italic' }}>
                The Archive records not just deeds, but the shape of fate itself.<br />
                These truths were written before you arrived.
              </p>
            </div>

            <Section label="ORIGIN" accentColor="var(--bronze-hi)">
              <div className="card" style={{ overflow: 'hidden' }}>
                {[
                  { label: 'REGION',  value: narrative.region,  color: 'var(--text-1)' },
                  { label: 'CLASS',   value: narrative.class,   color: 'var(--gold)'   },
                  { label: 'ORIGIN',  value: narrative.origin,  color: 'var(--text-2)' },
                ].map((f, i, arr) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 5 }}>{f.label}</p>
                    <p className="serif" style={{ fontSize: 15, color: f.color, letterSpacing: 0.3 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section label="FATE" accentColor="var(--ember)">
              <div className="card" style={{ overflow: 'hidden' }}>
                {[
                  { label: 'THE WOUND',   value: narrative.wound,   desc: 'What shaped them' },
                  { label: 'THE CALLING', value: narrative.calling, desc: 'Why they fight'    },
                ].map((f, i, arr) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 5 }}>{f.label}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>{f.value}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section label="NATURE" accentColor="var(--sapphire-bright)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 5, borderColor: 'rgba(58,120,168,0.3)' }}>
                  <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--sapphire-bright)', fontWeight: 600 }}>VIRTUE</p>
                  <p className="serif" style={{ fontSize: 16, color: 'var(--text-1)' }}>{narrative.virtue}</p>
                </div>
                <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 5, borderColor: 'rgba(200,94,40,0.3)' }}>
                  <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--ember)', fontWeight: 600 }}>VICE</p>
                  <p className="serif" style={{ fontSize: 16, color: 'var(--text-1)' }}>{narrative.vice}</p>
                </div>
              </div>
            </Section>

            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: 0.5, opacity: 0.6, lineHeight: 1.6 }}>
                Narrative details are derived from your Fate ID.<br />
                They are permanent and cannot be changed.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, count, accentColor, children }: { label: string; count?: number; accentColor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="divider">
        <span className="divider-label" style={{ color: accentColor }}>
          {label}{count !== undefined ? `  ·  ${count}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function Empty({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 24, opacity: 0.2 }}>{icon}</span>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{text}</p>
      <p style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.6, maxWidth: 240, lineHeight: 1.6 }}>{sub}</p>
    </div>
  );
}

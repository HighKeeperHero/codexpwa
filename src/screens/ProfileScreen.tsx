import { useAuth } from '@/AuthContext';

const AC: Record<string, string> = { Order: '#C8A04E', Veil: '#7A5888', Wild: '#486E48' };
const RC: Record<string, string> = { common: '#7C5C3A', honored: '#887860', rare: '#3A78A8', epic: '#C8A04E', legendary: '#E2B85E', mythic: '#B858A8' };

function fmt(ts: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export function ProfileScreen() {
  const { hero, isRefreshing, refreshHero, isOnline } = useAuth();
  if (!hero) return null;

  const { titles, loot, sources, wearable, progression } = hero;
  const ac      = AC[hero.alignment] ?? 'var(--bronze)';
  const markers = progression.fate_markers ?? [];

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" /><span className="orn-glyph">◉</span><div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>THE ARCHIVE</h1>
          <p className="serif" style={{ fontSize: 20, color: 'var(--text-1)', letterSpacing: 0.3 }}>{hero.display_name}</p>
          <span className="badge" style={{ color: ac, borderColor: `${ac}45`, background: `${ac}10` }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
            {hero.alignment?.toUpperCase()}
          </span>
        </div>

        {/* Refresh */}
        <button
          onClick={() => refreshHero()}
          disabled={isRefreshing || !isOnline}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-3)', fontSize: 9, letterSpacing: 1.5,
            padding: '9px 0', marginBottom: 4,
            background: 'var(--surface)', opacity: !isOnline ? 0.4 : 1,
          }}
        >
          {isRefreshing
            ? <><span className="live-dot" /><span>REFRESHING</span></>
            : <span>↺  REFRESH FROM PIK</span>
          }
        </button>

        {/* Wristband */}
        <Section label="WRISTBAND" accentColor={wearable?.status === 'active' ? 'var(--gold)' : 'var(--text-3)'}>
          <div className="card" style={{
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            ...(wearable?.status === 'active' ? { borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' } : {}),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24, opacity: wearable?.status === 'active' ? 1 : 0.3 }}>⌚</span>
              <div>
                <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>FATE WRISTBAND</p>
                <p style={{ fontSize: 13, color: wearable?.status === 'active' ? 'var(--gold)' : 'var(--text-3)' }}>
                  {wearable?.status === 'active'
                    ? 'ACTIVE — Identity Bound'
                    : wearable ? wearable.status.toUpperCase() : 'NOT ISSUED'}
                </p>
                {wearable?.issued_at && (
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                    Issued {fmt(wearable.issued_at)}
                  </p>
                )}
              </div>
            </div>
            {wearable?.status === 'active' && (
              <span style={{ fontSize: 18, color: 'var(--gold)' }}>✦</span>
            )}
          </div>
        </Section>

        {/* Titles */}
        <Section label="TITLES" count={(titles ?? []).length} accentColor="var(--gold)">
          {(titles ?? []).length === 0
            ? <Empty icon="★" text="No titles yet" sub="Complete quests and sessions to earn recognition" />
            : (titles ?? []).map((t, i) => {
                const rc = RC[t.rarity] ?? 'var(--bronze)';
                return (
                  <div key={t.title_id ?? i} className="card" style={{ display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: 3, background: rc, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p className="serif" style={{ fontSize: 15, color: rc, letterSpacing: 0.2 }}>{t.title_name}</p>
                        {t.earned_at && (
                          <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>Earned {fmt(t.earned_at)}</p>
                        )}
                      </div>
                      <span style={{ fontSize: 8, letterSpacing: 1.5, color: rc, fontWeight: 600 }}>{t.rarity.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })
          }
        </Section>

        {/* Fate markers */}
        {markers.length > 0 && (
          <Section label="FATE MARKERS" count={markers.length} accentColor="var(--sapphire-bright)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {markers.map((m, i) => (
                <span key={i} style={{
                  fontSize: 9, letterSpacing: 1.5, fontWeight: 600,
                  color: 'var(--sapphire-bright)',
                  border: '1px solid rgba(58,120,168,0.35)',
                  background: 'rgba(42,88,120,0.12)',
                  padding: '4px 10px', borderRadius: 4,
                }}>
                  {m.replace(/_/g,' ').toUpperCase()}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Relics */}
        <Section label="RELICS" count={(loot ?? []).length} accentColor="var(--bronze-hi)">
          {(loot ?? []).length === 0
            ? <Empty icon="⚔" text="No relics claimed" sub="Open loot caches during sessions to earn relics" />
            : (loot ?? []).map((item, i) => {
                const rc = RC[item.rarity] ?? 'var(--bronze)';
                return (
                  <div key={item.item_id ?? i} className="card" style={{ display: 'flex', alignItems: 'center', padding: '13px 14px', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8,
                      border: `1px solid ${rc}35`, background: `${rc}0D`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, color: rc, flexShrink: 0,
                    }}>⚔</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: 'var(--text-1)' }}>{item.display_name}</p>
                      <p style={{ fontSize: 9, letterSpacing: 1.2, color: 'var(--text-3)', marginTop: 3 }}>
                        {item.category?.replace(/_/g,' ').toUpperCase()}
                      </p>
                    </div>
                    <span style={{ fontSize: 8, letterSpacing: 1.5, color: rc, fontWeight: 600 }}>{item.rarity.toUpperCase()}</span>
                  </div>
                );
              })
          }
        </Section>

        {/* Venues */}
        <Section label="LINKED VENUES" count={(sources ?? []).filter(s => s.is_active).length} accentColor="var(--bronze-hi)">
          {(sources ?? []).length === 0
            ? <Empty icon="🏰" text="No venues linked" sub="Visit a Heroes' Veritas venue to link your Fate ID" />
            : (sources ?? []).map((s, i) => (
                <div key={s.source_id ?? i} className="card" style={{ display: 'flex', alignItems: 'center', padding: '13px 15px', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.is_active ? 'var(--gold)' : 'var(--text-3)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: 'var(--text-1)' }}>{s.source_name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Linked {fmt(s.linked_at)}</p>
                  </div>
                  <span style={{ fontSize: 8, letterSpacing: 1.5, fontWeight: 600, color: s.is_active ? 'var(--gold)' : 'var(--text-3)' }}>
                    {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              ))
          }
        </Section>

        {/* Identity */}
        <Section label="FATE IDENTITY" accentColor="var(--bronze)">
          <div className="card" style={{ overflow: 'hidden' }}>
            {[
              { label: 'ROOT ID',            value: hero.root_id,                               mono: true  },
              { label: 'ACCOUNT TYPE',       value: hero.account_type?.toUpperCase() ?? '—',    mono: false },
              { label: 'ENROLLED',           value: fmt(hero.created_at),                       mono: false },
              { label: 'FATE LEVEL',         value: String(progression.fate_level),             mono: false },
              { label: 'TOTAL SESSIONS',     value: String(progression.sessions_completed),     mono: false },
              { label: 'HIGHEST DIFFICULTY', value: progression.highest_difficulty?.toUpperCase() ?? '—', mono: false },
            ].map((f, i, arr) => (
              <div key={i} style={{
                padding: '11px 15px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>{f.label}</p>
                <p style={{
                  fontSize: f.mono ? 11 : 13,
                  color: f.mono ? 'var(--text-2)' : 'var(--text-1)',
                  fontFamily: f.mono ? 'ui-monospace, monospace' : undefined,
                  letterSpacing: f.mono ? 0.8 : 0.2,
                }}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        </Section>

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

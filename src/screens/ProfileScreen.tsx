import { useAuth } from '@/AuthContext';

const ALIGN_COLOR: Record<string, string> = { Order: '#D4A853', Veil: '#7C5C8A', Wild: '#4A8C5C' };
const RARITY_COLOR: Record<string, string> = {
  common: '#7C5C3A', honored: '#8A7A5A', rare: '#4080B0',
  epic: '#D4A853', legendary: '#E8C070', mythic: '#C060A0',
};

function formatDate(ts: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export function ProfileScreen() {
  const { hero } = useAuth();
  if (!hero) return null;

  const { titles, loot, sources, wearable, progression } = hero;
  const ac = ALIGN_COLOR[hero.alignment] ?? 'var(--bronze)';
  const markers = progression.fate_markers ?? [];

  return (
    <div className="screen">
      <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="ornament-row">
            <div className="ornament-line" />
            <span className="ornament-glyph">◉</span>
            <div className="ornament-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-primary)', letterSpacing: 3 }}>THE ARCHIVE</h1>
          <p className="serif" style={{ fontSize: 20, color: 'var(--text-primary)', letterSpacing: 0.5 }}>{hero.display_name}</p>
          <span className="badge" style={{ color: ac, borderColor: `${ac}50`, background: `${ac}12` }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
            {hero.alignment?.toUpperCase()}
          </span>
        </div>

        {/* Wristband */}
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...(wearable?.status === 'active' ? { borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' } : {}) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>⌚</span>
            <div>
              <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 600 }}>FATE WRISTBAND</p>
              <p style={{ fontSize: 12, color: wearable?.status === 'active' ? 'var(--gold)' : 'var(--text-dim)', marginTop: 2 }}>
                {wearable?.status === 'active' ? 'ACTIVE · Identity Bound' : wearable ? wearable.status.toUpperCase() : 'NOT ISSUED'}
              </p>
            </div>
          </div>
          {wearable?.status === 'active' && <span style={{ fontSize: 16, color: 'var(--gold)' }}>✦</span>}
        </div>

        {/* Titles */}
        <Section label="TITLES" count={(titles ?? []).length} accentColor="var(--gold)">
          {(titles ?? []).length === 0 ? <Empty icon="★" text="No titles yet" sub="Complete quests and sessions to earn recognition" /> :
            (titles ?? []).map((t, i) => {
              const rc = RARITY_COLOR[t.rarity] ?? 'var(--bronze)';
              return (
                <div key={t.title_id ?? i} className="card" style={{ display: 'flex', overflow: 'hidden', alignItems: 'center' }}>
                  <div style={{ width: 3, background: rc, alignSelf: 'stretch' }} />
                  <div style={{ flex: 1, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="serif" style={{ fontSize: 15, color: rc, letterSpacing: 0.3 }}>{t.title_name}</p>
                      {t.earned_at && <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Earned {formatDate(t.earned_at)}</p>}
                    </div>
                    <span style={{ fontSize: 8, letterSpacing: 1.5, color: rc, fontWeight: 600 }}>{t.rarity.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
        </Section>

        {/* Fate Markers */}
        {markers.length > 0 && (
          <Section label="FATE MARKERS" count={markers.length} accentColor="var(--sapphire-bright)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {markers.map((m, i) => (
                <span key={i} style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--sapphire-bright)', border: '1px solid rgba(64,128,176,0.4)', background: 'rgba(45,95,138,0.1)', padding: '4px 10px', borderRadius: 4, fontWeight: 600 }}>
                  {m.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Relics */}
        <Section label="RELICS" count={(loot ?? []).length} accentColor="var(--bronze)">
          {(loot ?? []).length === 0 ? <Empty icon="⚔" text="No relics claimed" sub="Open loot caches during sessions to earn relics" /> :
            (loot ?? []).map((item, i) => {
              const rc = RARITY_COLOR[item.rarity] ?? 'var(--bronze)';
              return (
                <div key={item.item_id ?? i} className="card" style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, border: `1px solid ${rc}40`, background: `${rc}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: rc, flexShrink: 0 }}>⚔</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item.display_name}</p>
                    <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-dim)', marginTop: 2 }}>{item.category?.replace(/_/g, ' ').toUpperCase()}</p>
                  </div>
                  <span style={{ fontSize: 8, letterSpacing: 1.5, color: rc, fontWeight: 600 }}>{item.rarity.toUpperCase()}</span>
                </div>
              );
            })}
        </Section>

        {/* Venues */}
        <Section label="VENUES" count={(sources ?? []).filter(s => s.is_active).length} accentColor="var(--bronze)">
          {(sources ?? []).length === 0 ? <Empty icon="🏰" text="No venues linked" sub="Visit a Heroes' Veritas venue to establish a connection" /> :
            (sources ?? []).map((s, i) => (
              <div key={s.source_id ?? i} className="card" style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.is_active ? 'var(--gold)' : 'var(--text-dim)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.source_name}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Linked {formatDate(s.linked_at)}</p>
                </div>
                <span style={{ fontSize: 8, letterSpacing: 1.5, color: s.is_active ? 'var(--gold)' : 'var(--text-dim)', fontWeight: 600 }}>{s.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
            ))}
        </Section>

        {/* Identity */}
        <Section label="IDENTITY" accentColor="var(--bronze)">
          <div className="card" style={{ padding: '4px 0' }}>
            {[
              { label: 'ROOT ID', value: hero.root_id, mono: true },
              { label: 'ACCOUNT TYPE', value: hero.account_type?.toUpperCase() ?? '—' },
              { label: 'ENROLLED', value: formatDate(hero.created_at) },
              { label: 'HIGHEST DIFFICULTY', value: progression.highest_difficulty?.toUpperCase() ?? '—' },
            ].map((f, i, arr) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 3 }}>{f.label}</p>
                <p style={{ fontSize: f.mono ? 11 : 13, color: f.mono ? 'var(--text-secondary)' : 'var(--text-primary)', fontFamily: f.mono ? 'monospace' : undefined, letterSpacing: f.mono ? 0.5 : 0.3 }}>{f.value}</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 22, opacity: 0.3 }}>{icon}</span>
      <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{text}</p>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.6, maxWidth: 240, lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

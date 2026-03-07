import { useAuth } from '@/AuthContext';
import { xpProgress } from '@/api/pik';

const ALIGN_COLOR: Record<string, string> = { Order: '#D4A853', Veil: '#7C5C8A', Wild: '#4A8C5C' };
const EVENT_MAP: Record<string, { icon: string; label: (p: Record<string,unknown>, c: Record<string,unknown>) => string; detail: (p: Record<string,unknown>) => string; color: string }> = {
  'progression.xp_granted':        { icon: '✦', label: (p) => `+${p.xp ?? 0} Fate XP`, detail: () => 'Experience earned', color: 'var(--ember)' },
  'progression.session_completed':  { icon: '⚔', label: () => 'Session Completed', detail: (p) => `${String(p.difficulty ?? 'normal').toUpperCase()} · ${p.nodes_completed ?? 0} nodes`, color: 'var(--gold)' },
  'progression.title_granted':      { icon: '★', label: () => 'Title Granted', detail: (p) => String(p.title_id ?? ''), color: 'var(--gold)' },
  'loot.cache_opened':              { icon: '✨', label: (_p, c) => String(c.reward_name ?? 'Reward Claimed'), detail: (_p, c) => String(c.reward_rarity ?? ''), color: 'var(--gold-bright)' },
  'wearable.issued':                { icon: '⌚', label: () => 'Wristband Issued', detail: () => 'Identity bound', color: 'var(--bronze)' },
  'source.link_granted':            { icon: '🔗', label: () => 'Venue Linked', detail: (p) => String(p.source_name ?? ''), color: 'var(--bronze)' },
  'quest.completed':                { icon: '🏆', label: () => 'Quest Complete', detail: (p) => String(p.quest_title ?? ''), color: 'var(--gold)' },
};

function timeAgo(ts: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'just now';
}

export function HomeScreen() {
  const { hero, isMock, isRefreshing, refreshHero, signOut } = useAuth();
  if (!hero) return null;

  const { progression, titles, sources, wearable, recent_events } = hero;
  const ac = ALIGN_COLOR[hero.alignment] ?? 'var(--bronze)';
  const prog = xpProgress(progression);
  const topTitle = titles?.length > 0 ? titles[titles.length - 1] : null;

  return (
    <div className="screen">
      <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Identity Panel ── */}
        <div style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {/* Wordmark */}
          <div className="ornament-row" style={{ marginBottom: 20 }}>
            <div className="ornament-line" />
            <span className="serif" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 4 }}>CODEX</span>
            <div className="ornament-line" />
          </div>

          {/* Hero name */}
          <h1 className="serif-bold" style={{ fontSize: 32, color: 'var(--text-primary)', letterSpacing: 0.5, lineHeight: 1.1, marginBottom: 4 }}>
            {hero.display_name}
          </h1>

          {/* Title */}
          {topTitle && (
            <p className="serif" style={{ fontSize: 14, color: 'var(--gold-dim)', fontStyle: 'italic', marginBottom: 12 }}>
              {topTitle.title_name}
            </p>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            <span className="badge" style={{ color: ac, borderColor: `${ac}50`, background: `${ac}12` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
              {hero.alignment?.toUpperCase()}
            </span>
            {sources?.length > 0 && <span className="badge">{sources.length} VENUE{sources.length !== 1 ? 'S' : ''}</span>}
            {wearable?.status === 'active' && <span className="badge" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' }}>⌚ WRISTBAND</span>}
            {isMock && <span className="badge" style={{ color: 'var(--ember)', borderColor: 'rgba(212,104,42,0.4)' }}>DEMO</span>}
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, letterSpacing: 1 }}>
              <span style={{ color: 'var(--text-dim)' }}>FATE LEVEL <span style={{ color: 'var(--ember)', fontWeight: 700 }}>{progression.fate_level}</span></span>
              <span style={{ color: 'var(--text-secondary)' }}>{progression.total_xp.toLocaleString()} XP</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${prog * 100}%` }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', marginTop: 4 }}>
              {progression.xp_to_next_level.toLocaleString()} to next level
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', marginTop: 4 }}>
            {[
              { val: progression.sessions_completed, label: 'SESSIONS' },
              { val: (titles ?? []).length, label: 'TITLES' },
              { val: (hero.loot ?? []).length, label: 'RELICS' },
              { val: progression.total_xp.toLocaleString(), label: 'FATE XP', gold: true },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span className="serif-bold" style={{ fontSize: 18, color: s.gold ? 'var(--ember)' : 'var(--text-primary)' }}>{s.val}</span>
                <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chronicle ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="divider" style={{ marginBottom: 16 }}>
            <span className="divider-label">RECENT CHRONICLE</span>
          </div>

          {(!recent_events || recent_events.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: 12 }}>
              No recent activity
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent_events.slice(0, 8).map((evt, i) => {
                const def = EVENT_MAP[evt.event_type] ?? { icon: '·', label: () => evt.event_type, detail: () => '', color: 'var(--text-dim)' };
                const label = def.label(evt.payload, evt.changes);
                const detail = def.detail(evt.payload, evt.changes);
                return (
                  <div key={evt.event_id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < Math.min(recent_events.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, border: `1px solid ${def.color}30`, background: `${def.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: def.color }}>
                      {def.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: 0.2 }}>{label}</div>
                      {detail && <div style={{ fontSize: 11, color: def.color, opacity: 0.8, letterSpacing: 0.3, marginTop: 2 }}>{detail}</div>}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 0.5, flexShrink: 0 }}>{timeAgo(evt.ts)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={signOut}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3, opacity: 0.5, padding: '12px 0', width: '100%', marginBottom: 8 }}
        >
          CLOSE CODEX
        </button>
      </div>
    </div>
  );
}

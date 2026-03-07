import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { xpProgress } from '@/api/pik';

const AC: Record<string, string> = { Order: '#C8A04E', Veil: '#7A5888', Wild: '#486E48' };

const EVT: Record<string, { icon: string; color: string; label: (p: Record<string,unknown>, c: Record<string,unknown>) => string; sub: (p: Record<string,unknown>, c: Record<string,unknown>) => string }> = {
  'progression.xp_granted':       { icon: '✦', color: 'var(--ember)',          label: (p) => `+${p.xp ?? 0} Fate XP`,        sub: () => 'Experience earned' },
  'progression.session_completed':{ icon: '⚔', color: 'var(--gold)',           label: () => 'Session Complete',               sub: (p) => `${String(p.difficulty ?? 'normal').toUpperCase()} · ${p.nodes_completed ?? 0} nodes` },
  'progression.title_granted':    { icon: '★', color: 'var(--gold)',           label: () => 'Title Granted',                  sub: (p) => String(p.title_id ?? '') },
  'loot.cache_opened':            { icon: '✧', color: '#C8B888',              label: (_p,c) => String(c.reward_name ?? 'Reward Claimed'), sub: (_p,c) => String(c.reward_rarity ?? '').toUpperCase() },
  'wearable.issued':              { icon: '⌚', color: 'var(--bronze-hi)',     label: () => 'Wristband Issued',               sub: () => 'Identity bound' },
  'source.link_granted':          { icon: '◈', color: 'var(--bronze-hi)',     label: () => 'Venue Linked',                   sub: (p) => String(p.source_name ?? '') },
};

function timeAgo(ts: string) {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  return dy > 0 ? `${dy}d` : h > 0 ? `${h}h` : m > 0 ? `${m}m` : 'now';
}

function HomeSkeleton() {
  return (
    <div className="screen-content" style={{ gap: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32, borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ height: 14, width: 80, alignSelf: 'center', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 36, width: '65%' }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 22, width: 70, borderRadius: 4 }} />)}
        </div>
        <div className="skeleton" style={{ height: 5, width: '100%', borderRadius: 999, marginTop: 8 }} />
        <div className="skeleton" style={{ height: 64, width: '100%', borderRadius: 8, marginTop: 4 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ height: 13, width: '60%' }} />
              <div className="skeleton" style={{ height: 10, width: '40%' }} />
            </div>
            <div className="skeleton" style={{ height: 10, width: 30 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const { hero, isMock, isRefreshing, refreshHero, signOut, lastUpdated } = useAuth();
  const [pullDist, setPullDist]   = useState(0);
  const [pulling,  setPulling]    = useState(false);
  const startY    = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0)
      startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY.current) return;
    const dist = e.touches[0].clientY - startY.current;
    if (dist > 0 && dist < 80) { setPulling(true); setPullDist(dist); }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDist > 55) await refreshHero();
    startY.current = 0; setPulling(false); setPullDist(0);
  }, [pullDist, refreshHero]);

  if (!hero) return null;

  const { progression, titles, sources, wearable, recent_events } = hero;
  const ac   = AC[hero.alignment] ?? 'var(--bronze)';
  const prog = xpProgress(progression);
  const topTitle = titles?.length > 0 ? titles[titles.length - 1] : null;

  return (
    <div
      className="screen screen-enter"
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to refresh */}
      {pulling && (
        <div className="ptr-indicator">
          <span style={{ fontSize: 12, color: 'var(--gold)', opacity: pullDist > 55 ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            {pullDist > 55 ? '↑ Release to refresh' : '↓ Pull to refresh'}
          </span>
        </div>
      )}
      {isRefreshing && (
        <div className="ptr-indicator">
          <span className="live-dot" />
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1 }}>Refreshing…</span>
        </div>
      )}

      <div className="screen-content stagger">

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div className="orn-row" style={{ marginBottom: 16 }}>
            <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-3)', fontWeight: 600 }}>FATE RECORD</span>
            {lastUpdated && !isMock && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>LIVE</span>
              </span>
            )}
            {isMock && <span className="badge" style={{ color: 'var(--ember)', borderColor: 'rgba(200,94,40,0.3)' }}>DEMO</span>}
          </div>
        </div>

        {/* ── Identity card ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif-bold" style={{ fontSize: 34, color: 'var(--text-1)', letterSpacing: 0.5, lineHeight: 1.1, marginBottom: topTitle ? 6 : 16 }}>
            {hero.display_name}
          </h1>
          {topTitle && (
            <p className="serif" style={{ fontSize: 13, color: 'var(--gold-dim)', fontStyle: 'italic', marginBottom: 14 }}>
              {topTitle.title_name}
            </p>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
            <span className="badge" style={{ color: ac, borderColor: `${ac}45`, background: `${ac}10` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
              {hero.alignment?.toUpperCase()}
            </span>
            {(sources ?? []).length > 0 && (
              <span className="badge">{(sources ?? []).length} VENUE{(sources ?? []).length !== 1 ? 'S' : ''}</span>
            )}
            {wearable?.status === 'active' && (
              <span className="badge" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' }}>⌚ WRISTBAND</span>
            )}
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text-3)' }}>
                FATE LEVEL <span style={{ color: 'var(--ember)', fontWeight: 700, fontSize: 13 }}>{progression.fate_level}</span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: 0.3 }}>
                {progression.total_xp.toLocaleString()} XP
              </span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${prog * 100}%` }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'right', marginTop: 5, letterSpacing: 0.3 }}>
              {progression.xp_to_next_level.toLocaleString()} to level {progression.fate_level + 1}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)', marginTop: 8 }}>
            {[
              { val: progression.sessions_completed,            label: 'SESSIONS' },
              { val: (titles ?? []).length,                      label: 'TITLES'   },
              { val: (hero.loot ?? []).length,                   label: 'RELICS'   },
              { val: progression.total_xp.toLocaleString(),     label: 'FATE XP', accent: true },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '13px 0', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              }}>
                <span className="serif-bold" style={{ fontSize: 17, color: s.accent ? 'var(--ember)' : 'var(--text-1)' }}>
                  {s.val}
                </span>
                <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chronicle ── */}
        <div className="divider"><span className="divider-label">RECENT CHRONICLE</span></div>

        {(!recent_events || recent_events.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13, letterSpacing: 0.3 }}>
            No recorded activity yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent_events.slice(0, 8).map((evt, i) => {
              const def = EVT[evt.event_type] ?? { icon: '·', color: 'var(--text-3)', label: () => evt.event_type, sub: () => '' };
              const label = def.label(evt.payload, evt.changes);
              const sub   = def.sub(evt.payload, evt.changes);
              const isLast = i === Math.min(recent_events.length, 8) - 1;
              return (
                <div key={evt.event_id ?? i} style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '13px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    border: `1px solid ${def.color}30`,
                    background: `${def.color}0E`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 14, color: def.color,
                  }}>
                    {def.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', letterSpacing: 0.1 }}>{label}</div>
                    {sub && <div style={{ fontSize: 11, color: def.color, opacity: 0.75, marginTop: 2, letterSpacing: 0.2 }}>{sub}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.3, flexShrink: 0 }}>
                    {timeAgo(evt.ts)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sign out */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={signOut}
            style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-3)', padding: '10px 20px', opacity: 0.45 }}
          >
            CLOSE CODEX
          </button>
        </div>
      </div>
    </div>
  );
}

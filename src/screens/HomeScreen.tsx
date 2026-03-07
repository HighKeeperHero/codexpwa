import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { xpProgress, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

const EVT: Record<string, { icon: string; color: string; label: (p: Record<string,unknown>, c: Record<string,unknown> | null) => string; sub: (p: Record<string,unknown>, c: Record<string,unknown> | null) => string }> = {
  'progression.xp_granted':        { icon: '✦', color: 'var(--ember)',      label: p  => `+${p.xp ?? 0} Fate XP`,                    sub: ()    => 'Experience earned' },
  'loot.cache_opened':             { icon: '✧', color: '#C8B888',           label: (_,c) => String(c?.reward_name ?? 'Cache Opened'),  sub: (_,c) => String(c?.reward_rarity ?? '').toUpperCase() },
  'gear.item_acquired':            { icon: '⚔', color: 'var(--bronze-hi)',  label: p  => String(p.item_name ?? 'Item Acquired'),      sub: p     => String(p.slot ?? '').toUpperCase() },
  'gear.item_equipped':            { icon: '🛡', color: 'var(--gold)',       label: p  => String(p.item_name ?? 'Item Equipped'),      sub: p     => `Slot: ${String(p.slot ?? '').toUpperCase()}` },
  'gear.item_dismantled':          { icon: '⚒', color: 'var(--text-3)',     label: p  => String(p.item_name ?? 'Item Dismantled'),    sub: p     => `+${p.nexus_gained ?? 0} Nexus` },
  'identity.title_equipped':       { icon: '★', color: 'var(--gold)',       label: p  => `Title Equipped`,                           sub: p     => String(p.title_id ?? '').replace(/^title_/,'').replace(/_/g,' ').toUpperCase() },
  'progression.session_completed': { icon: '⚔', color: 'var(--gold)',       label: ()  => 'Session Complete',                        sub: p     => `${String(p.difficulty ?? 'normal').toUpperCase()}` },
  'source.link_granted':           { icon: '◈', color: 'var(--bronze-hi)',  label: ()  => 'Venue Linked',                            sub: p     => String(p.source_name ?? '') },
};

function timeAgo(ts: string) {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  return dy > 0 ? `${dy}d` : h > 0 ? `${h}h` : m > 0 ? `${m}m` : 'now';
}

export function HomeScreen() {
  const { hero, isMock, isRefreshing, refreshHero, signOut, lastUpdated } = useAuth();
  const [pullDist, setPullDist] = useState(0);
  const [pulling,  setPulling]  = useState(false);
  const startY   = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) startY.current = e.touches[0].clientY;
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

  const { progression, sources, wearable, recent_events, source_progression } = hero;
  const ac    = ALIGNMENT_COLOR[hero.alignment] ?? 'var(--bronze)';
  const prog  = xpProgress(progression);
  const topTitle = progression.titles.find(t => t.title_id === progression.equipped_title)
    ?? (progression.titles.length > 0 ? progression.titles[0] : null);

  // Best venue stats
  const bestVenue = source_progression.length > 0
    ? source_progression.reduce((a, b) => a.xp_contributed > b.xp_contributed ? a : b)
    : null;

  return (
    <div className="screen screen-enter" ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
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
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1 }}>Refreshing from PIK…</span>
        </div>
      )}

      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div className="orn-row" style={{ marginBottom: 16 }}>
            <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-3)', fontWeight: 600 }}>FATE RECORD</span>
            {lastUpdated && !isMock && <><span className="live-dot" /><span style={{ fontSize: 9, color: 'var(--text-3)' }}>LIVE</span></>}
            {isMock && <span className="badge" style={{ color: 'var(--ember)', borderColor: 'rgba(200,94,40,0.3)' }}>DEMO</span>}
          </div>
        </div>

        {/* Identity */}
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
              {ALIGNMENT_LABEL[hero.alignment] ?? hero.alignment}
            </span>
            {sources.length > 0 && <span className="badge">{sources.filter(s=>s.is_active).length} VENUE{sources.filter(s=>s.is_active).length !== 1 ? 'S' : ''}</span>}
            {wearable?.status === 'active' && <span className="badge" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' }}>⌚ WRISTBAND</span>}
            {hero.gear && <span className="badge" style={{ color: 'var(--bronze-hi)', borderColor: 'rgba(154,114,72,0.3)' }}>⚔ GEARED</span>}
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text-3)' }}>
                FATE LEVEL <span style={{ color: 'var(--ember)', fontWeight: 700, fontSize: 13 }}>{progression.fate_level}</span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{progression.total_xp.toLocaleString()} XP</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${prog * 100}%` }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'right', marginTop: 5 }}>
              {progression.xp_in_current_level.toLocaleString()} / {progression.xp_to_next_level.toLocaleString()} to level {progression.fate_level + 1}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)', marginTop: 8 }}>
            {[
              { val: progression.sessions_completed,         label: 'SESSIONS' },
              { val: progression.titles.length,              label: 'TITLES'   },
              { val: (hero.gear?.inventory ?? []).length,    label: 'GEAR'     },
              { val: progression.total_xp.toLocaleString(), label: 'FATE XP', accent: true },
            ].map((s, i) => (
              <div key={i} style={{ padding: '13px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span className="serif-bold" style={{ fontSize: 17, color: s.accent ? 'var(--ember)' : 'var(--text-1)' }}>{s.val}</span>
                <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Venue highlight */}
        {bestVenue && (
          <>
            <div className="divider"><span className="divider-label">BEST VENUE</span></div>
            <div className="card" style={{ padding: '14px 16px', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 4 }}>{bestVenue.source_name}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.sessions} sessions</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.boss_kills} boss kills</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.xp_contributed.toLocaleString()} XP</span>
                  </div>
                </div>
                {bestVenue.best_boss_pct >= 100 && (
                  <span style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1, border: '1px solid var(--gold-dim)', padding: '3px 8px', borderRadius: 4 }}>VEIL CLEARED</span>
                )}
              </div>
              {bestVenue.best_boss_pct > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 9, color: 'var(--text-3)', letterSpacing: 1 }}>
                    <span>BEST RUN</span>
                    <span>{bestVenue.best_boss_pct}%</span>
                  </div>
                  <div className="xp-track" style={{ height: 3 }}>
                    <div className="xp-fill" style={{ width: `${bestVenue.best_boss_pct}%`, background: bestVenue.best_boss_pct >= 100 ? 'linear-gradient(90deg, var(--gold-dim), var(--gold))' : 'linear-gradient(90deg, var(--ember-dim), var(--ember))' }} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Chronicle */}
        <div className="divider"><span className="divider-label">RECENT CHRONICLE</span></div>

        {(!recent_events || recent_events.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>No recorded activity yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent_events.slice(0, 10).map((evt, i) => {
              const def = EVT[evt.event_type] ?? { icon: '·', color: 'var(--text-3)', label: () => evt.event_type.replace(/\./g,' '), sub: () => '' };
              const label = def.label(evt.payload, evt.changes);
              const sub   = def.sub(evt.payload, evt.changes);
              return (
                <div key={evt.event_id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${def.color}30`, background: `${def.color}0E`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: def.color }}>
                    {def.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', letterSpacing: 0.1 }}>{label}</div>
                    {sub && <div style={{ fontSize: 11, color: def.color, opacity: 0.75, marginTop: 2 }}>{sub}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{timeAgo(evt.ts)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button onClick={signOut} style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-3)', padding: '10px 20px', opacity: 0.4 }}>
            CLOSE CODEX
          </button>
        </div>
      </div>
    </div>
  );
}

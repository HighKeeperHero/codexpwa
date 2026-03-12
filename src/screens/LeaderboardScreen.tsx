// src/screens/LeaderboardScreen.tsx
// Sprint 10: Oath Accountability Feed added below FactionWar panel
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchLeaderboard, TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL,
  type LeaderboardEntry,
} from '@/api/pik';

const BASE = 'https://pik-prd-production.up.railway.app';

const RANK_MEDAL: Record<number, string> = { 1: '⬡', 2: '⬡', 3: '⬡' };
const RANK_COLOR: Record<number, string> = { 1: '#f59e0b', 2: '#c0c0c0', 3: '#cd7f32' };
const ALIGN_GLYPH: Record<string, string> = {
  ORDER: '⚖', CHAOS: '🜲', LIGHT: '☀', DARK: '☽', NONE: '◇', '': '◇',
};
const FACTION_ORDER = ['ORDER', 'CHAOS', 'LIGHT', 'DARK'] as const;

const PILLAR_CFG: Record<string, { label: string; icon: string; color: string }> = {
  forge: { label: 'FORGE', icon: '⊕', color: '#C85E28' },
  lore:  { label: 'LORE',  icon: '⊞', color: '#FFA500' },
  veil:  { label: 'VEIL',  icon: '◈', color: '#7A5888' },
};

// ── Faction War ───────────────────────────────────────────────────────────────

interface FactionStats { alignment: string; totalXp: number; heroCount: number; pct: number; }

function FactionWar({ entries }: { entries: LeaderboardEntry[] }) {
  const factions: FactionStats[] = FACTION_ORDER.map(a => {
    const members = entries.filter(e => e.alignment === a);
    return { alignment: a, totalXp: members.reduce((sum, e) => sum + e.value, 0), heroCount: members.length, pct: 0 };
  });
  const grandTotal = factions.reduce((s, f) => s + f.totalXp, 0) || 1;
  factions.forEach(f => { f.pct = f.totalXp / grandTotal; });
  const leader = factions.reduce((a, b) => b.totalXp > a.totalXp ? b : a);
  if (grandTotal <= 1) return null;

  return (
    <div style={{ margin: '12px 16px 0', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 14px 12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700,
          color: 'rgba(232,224,204,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>Faction War</p>
        <span style={{ fontSize: 9, color: ALIGNMENT_COLOR[leader.alignment] ?? 'var(--gold)',
          fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.1em', marginLeft: 'auto' }}>
          {ALIGN_GLYPH[leader.alignment]} {leader.alignment} LEADS
        </span>
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
        {factions.map((f, i) => {
          const color = ALIGNMENT_COLOR[f.alignment] ?? '#5A4E3C';
          const isLeader = f.alignment === leader.alignment;
          return (
            <div key={f.alignment} style={{ flex: Math.max(f.pct, 0.01),
              background: isLeader ? `linear-gradient(90deg, ${color}CC, ${color})` : `${color}60`,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === factions.length - 1 ? '0 4px 4px 0' : 0,
              transition: 'flex 0.6s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: isLeader ? `0 0 8px ${color}60` : 'none' }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {factions.slice().sort((a, b) => b.totalXp - a.totalXp).map((f, rank) => {
          const color = ALIGNMENT_COLOR[f.alignment] ?? '#5A4E3C';
          const isLeader = f.alignment === leader.alignment;
          return (
            <div key={f.alignment} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700, minWidth: 10,
                color: rank === 0 ? color : 'rgba(232,224,204,0.25)' }}>{rank === 0 ? '▲' : '·'}</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: isLeader ? 700 : 400,
                color: isLeader ? color : 'rgba(232,224,204,0.55)', letterSpacing: '0.06em', minWidth: 72 }}>
                {ALIGN_GLYPH[f.alignment]} {f.alignment}
              </span>
              <div style={{ flex: 1, height: 3, background: 'rgba(232,224,204,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(f.pct * 100).toFixed(1)}%`, height: '100%',
                  background: isLeader ? color : `${color}70`, borderRadius: 2,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, minWidth: 52, textAlign: 'right',
                color: isLeader ? color : 'rgba(232,224,204,0.3)', fontWeight: isLeader ? 700 : 400 }}>
                {f.totalXp >= 1000 ? `${(f.totalXp/1000).toFixed(1)}K` : f.totalXp.toLocaleString()} XP
              </span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(232,224,204,0.25)',
                minWidth: 28, textAlign: 'right' }}>{f.heroCount}</span>
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 8, color: 'rgba(232,224,204,0.18)',
        letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'right', margin: '8px 0 0' }}>
        Total Faction XP · {entries.filter(e => FACTION_ORDER.includes(e.alignment as any)).length} Heroes
      </p>
    </div>
  );
}

// ── Oath Accountability Feed ──────────────────────────────────────────────────

interface OathFeedEntry {
  oath_id: string; pillar: string; declaration: string | null; week_of: string;
  status: 'pending' | 'kept' | 'broken'; alignment: string; hero_name: string;
  fate_level: number; resolved_at: string | null; xp_delta: number | null; created_at: string | null;
}

const STATUS_CFG = {
  kept:    { label: 'KEPT',    color: '#34d399', glyph: '✓', bgOpacity: '12' },
  broken:  { label: 'BROKEN',  color: '#F87171', glyph: '✗', bgOpacity: '10' },
  pending: { label: 'SWORN',   color: '#FFA500', glyph: '◈', bgOpacity: '08' },
};

function OathFeed() {
  const [feed, setFeed]         = useState<OathFeedEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [week, setWeek]         = useState<'current' | 'last'>('current');

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/training/oaths/feed?limit=40&week=${week}`)
      .then(r => r.json())
      .then(d => {
        const arr = d?.data ?? d;
        setFeed(Array.isArray(arr) ? arr : []);
      })
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, [week]);

  const kept    = feed.filter(o => o.status === 'kept').length;
  const broken  = feed.filter(o => o.status === 'broken').length;
  const pending = feed.filter(o => o.status === 'pending').length;
  const total   = feed.length;

  return (
    <div style={{ margin: '12px 16px 0', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700,
            color: 'rgba(232,224,204,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            Oath Watch
          </p>
          <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 'auto', fontFamily: 'monospace' }}>
            {kept}✓ {broken}✗ {pending}◈
          </span>
        </div>
        {/* Week toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['current', 'last'] as const).map(w => (
            <button key={w} onClick={() => setWeek(w)} style={{
              padding: '3px 10px', borderRadius: 999,
              background: week === w ? 'var(--gold)' : 'transparent',
              color: week === w ? '#0B0A08' : 'var(--gold)',
              border: '1px solid var(--gold)', fontFamily: 'Cinzel, serif',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              cursor: 'pointer', textTransform: 'uppercase' }}>
              {w === 'current' ? 'This Week' : 'Last Week'}
            </button>
          ))}
        </div>
        {/* Oath resolve bar */}
        {total > 0 && (
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ height: '100%', display: 'flex' }}>
              {kept    > 0 && <div style={{ flex: kept,    background: '#34d399' }} />}
              {broken  > 0 && <div style={{ flex: broken,  background: '#F87171' }} />}
              {pending > 0 && <div style={{ flex: pending, background: 'rgba(255,165,0,0.4)' }} />}
            </div>
          </div>
        )}
      </div>

      {/* Feed rows */}
      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(232,224,204,0.35)',
            letterSpacing: '0.12em' }}>Consulting the Veil…</p>
        </div>
      ) : feed.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'rgba(232,224,204,0.3)',
            letterSpacing: '0.1em' }}>No oaths declared this week</p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {feed.map(o => <OathRow key={o.oath_id} oath={o} />)}
        </div>
      )}
    </div>
  );
}

function OathRow({ oath }: { oath: OathFeedEntry }) {
  const st     = STATUS_CFG[oath.status] ?? STATUS_CFG.pending;
  const pillar = PILLAR_CFG[oath.pillar] ?? PILLAR_CFG.forge;
  const aColor = ALIGNMENT_COLOR[oath.alignment] ?? 'var(--text-3)';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: `${st.color}0${st.bgOpacity}` }}>
      {/* Status glyph */}
      <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, marginTop: 1,
        background: `${st.color}15`, border: `1px solid ${st.color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: st.color, fontWeight: 700 }}>
        {st.glyph}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Hero + pillar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
            color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 120 }}>{oath.hero_name}</span>
          <span style={{ fontSize: 9, color: aColor, letterSpacing: '0.06em',
            fontFamily: 'Cinzel, serif', flexShrink: 0 }}>
            {ALIGN_GLYPH[oath.alignment] ?? '◇'}
          </span>
          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 9, color: pillar.color,
            fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', fontWeight: 700 }}>
            {pillar.icon} {pillar.label}
          </span>
        </div>

        {/* Declaration (only shown when resolved) */}
        {oath.declaration ? (
          <p style={{ fontSize: 11, color: 'rgba(232,224,204,0.7)', margin: '0 0 3px',
            fontStyle: 'italic', lineHeight: 1.4 }}>"{oath.declaration}"</p>
        ) : (
          <p style={{ fontSize: 11, color: 'rgba(232,224,204,0.3)', margin: '0 0 3px',
            fontStyle: 'italic' }}>Sealed until resolved…</p>
        )}

        {/* Status + XP row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: st.color, fontFamily: 'Cinzel, serif',
            fontWeight: 700, letterSpacing: '0.1em' }}>{st.label}</span>
          {oath.xp_delta !== null && (
            <span style={{ fontSize: 9, fontFamily: 'monospace',
              color: oath.xp_delta > 0 ? '#34d399' : '#F87171',
              fontWeight: 700 }}>
              {oath.xp_delta > 0 ? '+' : ''}{oath.xp_delta} XP
            </span>
          )}
          {oath.resolved_at && (
            <span style={{ fontSize: 9, color: 'rgba(232,224,204,0.25)', marginLeft: 'auto' }}>
              {new Date(oath.resolved_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LeaderboardScreen() {
  const { hero } = useAuth();
  const [entries, setEntries]       = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filterAlign, setFilterAlign] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchLeaderboard();
      setEntries(data); setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const alignments = ['ALL', ...FACTION_ORDER] as string[];
  const visible    = filterAlign === 'ALL' ? entries : entries.filter(e => e.alignment === filterAlign);
  const myRank     = hero ? entries.find(e => e.root_id === hero.root_id) : null;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
              color: 'var(--gold)', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Fate Board</p>
            {lastUpdated && (
              <span style={{ fontSize: 10, color: 'rgba(232,224,204,0.35)', fontFamily: 'monospace' }}>
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={load} disabled={loading} style={{ marginLeft: 'auto',
              background: 'none', border: '1px solid var(--border)', color: 'rgba(232,224,204,0.45)',
              fontSize: 11, borderRadius: 6, padding: '4px 10px', fontFamily: 'Cinzel, serif',
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? '…' : '↻'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {alignments.map(a => {
              const active = filterAlign === a;
              const color  = a === 'ALL' ? 'var(--gold)' : (ALIGNMENT_COLOR[a] ?? 'var(--gold)');
              return (
                <button key={a} onClick={() => setFilterAlign(a)} style={{ flexShrink: 0,
                  padding: '4px 12px',
                  background: active ? color : 'transparent',
                  color: active ? '#0B0A08' : color,
                  border: `1px solid ${color}`, borderRadius: 999,
                  fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
                  {a === 'ALL' ? 'All' : `${ALIGN_GLYPH[a] ?? ''} ${ALIGNMENT_LABEL[a] ?? a}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Faction War (unfiltered only) */}
      {!loading && entries.length > 0 && filterAlign === 'ALL' && (
        <FactionWar entries={entries} />
      )}

      {/* Oath Feed (unfiltered only) */}
      {filterAlign === 'ALL' && <OathFeed />}

      {myRank && <MyRankBanner entry={myRank} total={entries.length} />}

      {loading && entries.length === 0 ? <LoadingState /> :
        error ? <ErrorState message={error} onRetry={load} /> :
        visible.length === 0 ? <EmptyState /> : (
          <div style={{ padding: '12px 16px 0' }}>
            {filterAlign === 'ALL' && visible.length >= 3 && (
              <Podium top3={visible.slice(0, 3)} myRootId={hero?.root_id} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visible.map(entry => (
                <RankRow key={entry.root_id} entry={entry} isMe={entry.root_id === hero?.root_id} />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(232,224,204,0.25)',
              fontFamily: 'Cinzel, serif', letterSpacing: '0.1em', padding: '24px 0 0' }}>
              {visible.length} HEROES RANKED · FATE XP
            </p>
          </div>
        )
      }
    </div>
  );
}

// ── My Rank Banner ────────────────────────────────────────────────────────────

function MyRankBanner({ entry, total }: { entry: LeaderboardEntry; total: number }) {
  const tier       = TIER_FOR_LEVEL(entry.fate_level);
  const color      = ALIGNMENT_COLOR[entry.alignment] ?? 'var(--gold)';
  const percentile = Math.round((1 - (entry.rank - 1) / total) * 100);
  return (
    <div style={{ margin: '12px 16px 0', background: `linear-gradient(135deg, var(--surface), ${color}18)`,
      border: `1px solid ${color}60`, borderRadius: 12, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 0 20px ${color}20` }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
        color: 'var(--gold)', minWidth: 44, textAlign: 'center', lineHeight: 1 }}>#{entry.rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, color: '#e8e0cc', margin: '0 0 2px' }}>Your Standing</p>
        <p style={{ fontSize: 11, color: 'rgba(232,224,204,0.45)', margin: 0 }}>
          Top {percentile}% · {entry.fate_level} · {entry.value.toLocaleString()} XP
        </p>
      </div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700, color: tier.color,
        letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>{tier.name}</div>
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

function Podium({ top3, myRootId }: { top3: LeaderboardEntry[]; myRootId?: string }) {
  const order = [top3[1], top3[0], top3[2]];
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'rgba(232,224,204,0.3)',
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Top Fates</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {order.map((entry, i) => {
          const isCenter   = i === 1;
          const podiumRank = isCenter ? 1 : i === 0 ? 2 : 3;
          const color      = RANK_COLOR[podiumRank];
          const acColor    = ALIGNMENT_COLOR[entry.alignment] ?? 'var(--gold)';
          const isMe       = entry.root_id === myRootId;
          return (
            <div key={entry.root_id} style={{ flex: isCenter ? 1.3 : 1,
              background: `linear-gradient(180deg, var(--surface) 0%, ${color}15 100%)`,
              border: `1px solid ${isMe ? acColor : color}60`,
              borderBottom: `3px solid ${color}`, borderRadius: '10px 10px 0 0',
              padding: `${isCenter ? 16 : 12}px 8px 12px`, textAlign: 'center',
              boxShadow: isCenter ? `0 0 24px ${color}30` : `0 0 12px ${color}18` }}>
              <div style={{ fontSize: isCenter ? 22 : 18, marginBottom: 6, color }}>{RANK_MEDAL[podiumRank]}</div>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: isCenter ? 11 : 10, fontWeight: 700,
                color: isMe ? acColor : '#e8e0cc', margin: '0 0 2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display_name}</p>
              <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(232,224,204,0.45)', margin: '0 0 4px' }}>
                Lv {entry.fate_level}
              </p>
              <p style={{ fontSize: 9, color, fontWeight: 700, fontFamily: 'Cinzel, serif',
                letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>#{podiumRank}</p>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[2, 1, 3].map(r => (
          <div key={r} style={{ flex: r === 1 ? 1.3 : 1, height: r === 1 ? 20 : r === 2 ? 12 : 8,
            background: `${RANK_COLOR[r]}30`, borderBottom: `2px solid ${RANK_COLOR[r]}60` }} />
        ))}
      </div>
    </div>
  );
}

// ── Rank Row ──────────────────────────────────────────────────────────────────

function RankRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const tier  = TIER_FOR_LEVEL(entry.fate_level);
  const color = ALIGNMENT_COLOR[entry.alignment] ?? '#5A4E3C';
  const rankC = RANK_COLOR[entry.rank] ?? (isMe ? 'var(--gold)' : 'rgba(232,224,204,0.45)');
  return (
    <div style={{ background: isMe ? `linear-gradient(90deg, var(--surface), ${color}18)` : 'var(--surface)',
      border: `1px solid ${isMe ? color : 'var(--border)'}`, borderRadius: 10,
      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: isMe ? `0 0 12px ${color}20` : 'none' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
        color: rankC, minWidth: 32, textAlign: 'center' }}>
        {entry.rank <= 3 ? <span style={{ fontSize: 16 }}>{RANK_MEDAL[entry.rank]}</span> : `#${entry.rank}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            color: isMe ? 'var(--gold)' : '#e8e0cc', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display_name}</p>
          {isMe && <span style={{ fontSize: 8, background: 'var(--gold)', color: '#0B0A08',
            borderRadius: 4, padding: '1px 5px', fontFamily: 'Cinzel, serif',
            fontWeight: 700, flexShrink: 0 }}>YOU</span>}
        </div>
        <p style={{ fontSize: 11, color, margin: 0, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 700 }}>
          {ALIGN_GLYPH[entry.alignment] ?? '◇'} {ALIGNMENT_LABEL[entry.alignment] ?? entry.alignment}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
          color: tier.color, margin: '0 0 2px' }}>Lv {entry.fate_level}</p>
        <p style={{ fontFamily: 'monospace', fontSize: 10,
          color: 'rgba(232,224,204,0.45)', margin: 0 }}>{entry.value.toLocaleString()} XP</p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 28, color: 'var(--gold)', marginBottom: 12,
        animation: 'spin 2s linear infinite' }}>⬡</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: 'rgba(232,224,204,0.45)',
        letterSpacing: '0.15em', textTransform: 'uppercase' }}>Consulting the Fates…</p>
    </div>
  );
}
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>⬡</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'rgba(232,224,204,0.6)', margin: '0 0 16px' }}>The Fates are silent</p>
      <p style={{ fontSize: 12, color: 'rgba(232,224,204,0.3)', margin: '0 0 20px' }}>{message}</p>
      <button onClick={onRetry} style={{ padding: '8px 20px', background: 'var(--surface)',
        color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 8,
        fontFamily: 'Cinzel, serif', fontSize: 12, cursor: 'pointer' }}>Try Again</button>
    </div>
  );
}
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>⬡</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'rgba(232,224,204,0.45)', margin: 0 }}>
        No heroes match this alignment
      </p>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { fetchLeaderboard, ALIGNMENT_COLOR, ALIGNMENT_LABEL, type LeaderboardEntry } from '@/api/pik';
import { MOCK_HEROES } from '@/api/pik';

const MOCK_LEADERBOARD: LeaderboardEntry[] = MOCK_HEROES.map((h, i) => ({
  rank: i + 1, root_id: h.root_id, display_name: h.display_name,
  alignment: h.alignment, value: h.progression.total_xp,
  fate_level: h.progression.fate_level, sessions: h.progression.sessions_completed,
}));

const RANK_COLORS = ['#C8A04E', '#A8A8B0', '#9A6A40'];
const RANK_LABEL  = ['I', 'II', 'III'];

export function LeaderboardScreen() {
  const { hero, isOnline, isMock } = useAuth();
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const load = async () => {
    if (!isOnline || isMock) {
      setEntries(MOCK_LEADERBOARD);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
      setLastFetch(new Date());
    } catch (e) {
      setError('Could not reach the PIK');
      setEntries(MOCK_LEADERBOARD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isOnline, isMock]);

  const myEntry = hero ? entries.find(e => e.root_id === hero.root_id) : null;

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" /><span className="orn-glyph">★</span><div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>THE RANKINGS</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastFetch && !isMock && (
              <><span className="live-dot" /><span style={{ fontSize: 9, color: 'var(--text-3)' }}>LIVE FROM PIK</span></>
            )}
            {(isMock || !isOnline) && (
              <span className="badge" style={{ color: 'var(--ember)', borderColor: 'rgba(200,94,40,0.3)' }}>DEMO DATA</span>
            )}
          </div>
        </div>

        {/* My rank highlight */}
        {myEntry && (
          <>
            <div className="divider"><span className="divider-label">YOUR STANDING</span></div>
            <MyRankCard entry={myEntry} />
          </>
        )}

        {/* Refresh */}
        <button onClick={load} disabled={loading || !isOnline} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', fontSize: 9, letterSpacing: 1.5, padding: '9px 0', marginBottom: 4, background: 'var(--surface)', opacity: !isOnline ? 0.4 : 1 }}>
          {loading ? <><span className="live-dot" /><span>LOADING</span></> : <span>↺  REFRESH RANKINGS</span>}
        </button>

        {error && (
          <div style={{ fontSize: 11, color: 'var(--ember)', textAlign: 'center', padding: '8px 0', marginBottom: 8 }}>
            {error} — showing demo data
          </div>
        )}

        {/* Podium */}
        {entries.length >= 3 && !loading && (
          <>
            <div className="divider"><span className="divider-label">TOP HEROES</span></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
              {[1, 0, 2].map(idx => {
                const e = entries[idx];
                if (!e) return <div key={idx} style={{ flex: 1 }} />;
                const rc  = RANK_COLORS[idx] ?? 'var(--text-3)';
                const ac  = ALIGNMENT_COLOR[e.alignment] ?? 'var(--bronze)';
                const isMe = e.root_id === hero?.root_id;
                const heights = [120, 140, 100];
                return (
                  <div key={e.root_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: rc, fontWeight: 700, letterSpacing: 1 }}>{RANK_LABEL[idx]}</span>
                    <div style={{
                      width: '100%', height: heights[idx], background: 'var(--surface)',
                      border: `1px solid ${rc}50`, borderRadius: 8,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 4, padding: '0 8px',
                      ...(isMe ? { borderColor: 'var(--gold)', background: 'var(--gold-glow)' } : {}),
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ac }} />
                      <p style={{ fontSize: 11, color: 'var(--text-1)', textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>{e.display_name}</p>
                      <p className="serif-bold" style={{ fontSize: 14, color: rc }}>Lv.{e.fate_level}</p>
                      <p style={{ fontSize: 9, color: 'var(--text-3)' }}>{e.value.toLocaleString()} XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Full list */}
        <div className="divider"><span className="divider-label">ALL HEROES  ·  {entries.length}</span></div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((e, i) => {
              const rc   = i < 3 ? RANK_COLORS[i] : 'var(--text-3)';
              const ac   = ALIGNMENT_COLOR[e.alignment] ?? 'var(--bronze)';
              const isMe = e.root_id === hero?.root_id;
              return (
                <div key={e.root_id ?? i} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px',
                  ...(isMe ? { borderColor: 'var(--gold)', background: 'var(--gold-glow)' } : {}),
                }}>
                  {/* Rank */}
                  <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {i < 3
                      ? <span className="serif-bold" style={{ fontSize: 15, color: rc }}>{RANK_LABEL[i]}</span>
                      : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>#{e.rank}</span>
                    }
                  </div>
                  {/* Alignment dot */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: isMe ? 'var(--gold)' : 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.display_name}
                      </span>
                      {isMe && <span style={{ fontSize: 7, color: 'var(--gold)', letterSpacing: 1.5, fontWeight: 700, flexShrink: 0 }}>YOU</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                        {ALIGNMENT_LABEL[e.alignment] ?? e.alignment}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                        Lv.{e.fate_level}
                      </span>
                    </div>
                  </div>
                  {/* XP */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="serif-bold" style={{ fontSize: 14, color: i < 3 ? rc : 'var(--text-1)' }}>
                      {e.value.toLocaleString()}
                    </span>
                    <p style={{ fontSize: 8, letterSpacing: 1, color: 'var(--text-3)' }}>XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

function MyRankCard({ entry }: { entry: LeaderboardEntry }) {
  const ac = ALIGNMENT_COLOR[entry.alignment] ?? 'var(--bronze)';
  const rc = entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : 'var(--text-2)';
  return (
    <div className="card" style={{ padding: '16px', borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>YOUR RANK</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="serif-bold" style={{ fontSize: 32, color: rc }}>#{entry.rank}</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>of all heroes</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>FATE XP</p>
          <span className="serif-bold" style={{ fontSize: 24, color: 'var(--gold)' }}>{entry.value.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

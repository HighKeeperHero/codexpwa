import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/api/pik';
import { useAuth } from '@/AuthContext';

const RANK_COLOR: Record<number, string> = { 1: '#E8C070', 2: '#C0C0C0', 3: '#CD7F32' };
const RANK_GLYPH: Record<number, string> = { 1: '✦', 2: '◈', 3: '◇' };

export function LeaderboardScreen() {
  const { hero } = useAuth();
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await fetchLeaderboard();
      setEntries(data); setError(false);
    } catch { setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const myRank = entries.findIndex(e => e.display_name === hero?.display_name) + 1;

  return (
    <div className="screen">
      <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="ornament-row">
            <div className="ornament-line" />
            <span className="ornament-glyph">✦</span>
            <div className="ornament-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-primary)', letterSpacing: 3 }}>THE STANDING</h1>
          <p style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-dim)' }}>HEROES' VERITAS · FATE XP RANKING</p>
        </div>

        {/* Your rank */}
        {myRank > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--gold-dim)', borderRadius: 8, padding: '12px 16px', background: 'var(--gold-glow)' }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--gold-dim)' }}>YOUR STANDING</span>
            <span className="serif-bold" style={{ fontSize: 22, color: 'var(--gold)' }}>#{myRank}</span>
          </div>
        )}

        <div className="divider"><span className="divider-label">RANKINGS</span></div>

        {/* Refresh button */}
        <button onClick={() => load(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', fontSize: 9, letterSpacing: 1.5, padding: '6px 0' }}>
          {refreshing ? 'REFRESHING…' : 'REFRESH RANKINGS'}
        </button>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-dim)', fontSize: 12, letterSpacing: 1.5 }}>
            Consulting the archive…
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 28, color: 'var(--text-dim)', opacity: 0.4 }}>◈</span>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>The archive is unreachable</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((e, i) => {
              const isMe = e.display_name === hero?.display_name;
              const rc   = RANK_COLOR[e.rank] ?? 'var(--text-dim)';
              return (
                <div key={`${e.root_id}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 0',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                  ...(isMe ? { background: 'var(--gold-glow)', margin: '4px -8px', padding: '14px 8px', borderRadius: 8, border: '1px solid var(--gold-dim)' } : {}),
                }}>
                  <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                    {RANK_GLYPH[e.rank] ? (
                      <span style={{ fontSize: 18, color: rc }}>{RANK_GLYPH[e.rank]}</span>
                    ) : (
                      <span className="serif-bold" style={{ fontSize: 16, color: rc }}>{e.rank}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="serif" style={{ fontSize: 15, color: isMe ? 'var(--gold-bright)' : 'var(--text-primary)', letterSpacing: 0.3 }}>{e.display_name}</span>
                      {isMe && <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--gold)', border: '1px solid var(--gold-dim)', padding: '1px 5px', borderRadius: 3 }}>YOU</span>}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 0.5, marginTop: 2 }}>LVL {e.fate_level} · {e.sessions} sessions</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="serif-bold" style={{ fontSize: 16, color: e.rank <= 3 ? rc : 'var(--text-secondary)' }}>{e.value.toLocaleString()}</div>
                    <div style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-dim)' }}>FATE XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

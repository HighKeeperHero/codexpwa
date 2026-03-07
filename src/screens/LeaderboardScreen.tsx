import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/api/pik';
import { useAuth } from '@/AuthContext';

const RANK_C: Record<number, string> = { 1: '#E2B85E', 2: '#C0C0C0', 3: '#CD7F32' };
const RANK_G: Record<number, string> = { 1: '✦', 2: '◈', 3: '◇' };

function LeaderboardSkeleton() {
  return (
    <>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: 36, height: 20, borderRadius: 4 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 15, width: `${50 + i * 5}%` }} />
            <div className="skeleton" style={{ height: 10, width: '35%' }} />
          </div>
          <div className="skeleton" style={{ width: 50, height: 16 }} />
        </div>
      ))}
    </>
  );
}

export function LeaderboardScreen() {
  const { hero, isOnline } = useAuth();
  const [entries,    setEntries]    = useState<LeaderboardEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(false);
  const [lastFetch,  setLastFetch]  = useState<Date | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchLeaderboard();
      setEntries(data); setError(false); setLastFetch(new Date());
    } catch { setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const myRank = entries.findIndex(e => e.display_name === hero?.display_name) + 1;
  const myEntry = entries.find(e => e.display_name === hero?.display_name);

  function formatTime(ts: Date | null) {
    if (!ts) return '';
    return ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" /><span className="orn-glyph">✦</span><div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>THE STANDING</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-3)' }}>FATE XP RANKING</p>
            {lastFetch && isOnline && (
              <>
                <span style={{ color: 'var(--text-3)', fontSize: 9 }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{formatTime(lastFetch)}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Your standing card */}
        {myEntry && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid var(--gold-dim)', borderRadius: 'var(--radius)',
            padding: '14px 18px', background: 'var(--gold-glow)',
            marginBottom: 8,
          }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: 2, color: 'var(--gold-dim)', marginBottom: 4 }}>YOUR STANDING</p>
              <p className="serif" style={{ fontSize: 15, color: 'var(--text-1)' }}>{myEntry.display_name}</p>
              <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                LVL {myEntry.fate_level} · {myEntry.sessions} sessions
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className="serif-bold" style={{ fontSize: 32, color: 'var(--gold)', lineHeight: 1 }}>
                #{myRank}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ember)' }}>{myEntry.value.toLocaleString()} XP</span>
            </div>
          </div>
        )}

        <div className="divider"><span className="divider-label">ALL HEROES</span></div>

        {/* Refresh */}
        <button
          onClick={() => load(true)}
          disabled={refreshing || !isOnline}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-3)', fontSize: 9, letterSpacing: 1.5,
            padding: '9px 0', marginBottom: 8,
            background: 'var(--surface)', opacity: !isOnline ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {refreshing ? (
            <><span className="live-dot" /><span>REFRESHING</span></>
          ) : (
            <span>↺  REFRESH RANKINGS</span>
          )}
        </button>

        {/* List */}
        {loading && <LeaderboardSkeleton />}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 32, opacity: 0.2 }}>◈</span>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Archive unreachable</p>
            <button onClick={() => load()} style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--gold)', padding: '8px 16px', border: '1px solid var(--gold-dim)', borderRadius: 4 }}>
              RETRY
            </button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((e, i) => {
              const isMe = e.display_name === hero?.display_name;
              const rc   = RANK_C[e.rank] ?? 'var(--text-3)';
              return (
                <div key={`${e.root_id}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: isMe ? '13px 10px' : '13px 0',
                  margin: isMe ? '3px -10px' : 0,
                  borderBottom: i < entries.length - 1 ? `1px solid ${isMe ? 'transparent' : 'var(--border)'}` : 'none',
                  borderRadius: isMe ? 'var(--radius)' : 0,
                  background: isMe ? 'var(--gold-glow)' : 'transparent',
                  border: isMe ? '1px solid var(--gold-dim)' : undefined,
                  transition: 'background 0.2s',
                }}>
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    {RANK_G[e.rank]
                      ? <span style={{ fontSize: 16, color: rc }}>{RANK_G[e.rank]}</span>
                      : <span className="serif-bold" style={{ fontSize: 14, color: rc }}>{e.rank}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span className="serif" style={{ fontSize: 15, color: isMe ? 'var(--gold-bright)' : 'var(--text-1)', letterSpacing: 0.2 }}>
                        {e.display_name}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--gold)', border: '1px solid var(--gold-dim)', padding: '1px 5px', borderRadius: 3 }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 0.3, marginTop: 2 }}>
                      LVL {e.fate_level} · {e.sessions} sessions
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="serif-bold" style={{ fontSize: 15, color: e.rank <= 3 ? rc : 'var(--text-2)' }}>
                      {e.value.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 8, letterSpacing: 1.2, color: 'var(--text-3)' }}>FATE XP</div>
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

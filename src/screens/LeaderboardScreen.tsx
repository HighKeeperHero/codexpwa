// src/screens/LeaderboardScreen.tsx
// ============================================================
// Sprint 8+ — Leaderboard Tab
// Ranks heroes by Fate XP across all connected venues.
// Uses existing fetchLeaderboard() from pik.ts — no new
// backend work required.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchLeaderboard,
  TIER_FOR_LEVEL,
  ALIGNMENT_COLOR,
  ALIGNMENT_LABEL,
  type LeaderboardEntry,
} from '@/api/pik';

// ── Constants ────────────────────────────────────────────────

const RANK_MEDAL: Record<number, string> = { 1: '⬡', 2: '⬡', 3: '⬡' };
const RANK_COLOR: Record<number, string> = {
  1: '#f59e0b',  // legendary gold
  2: '#c0c0c0',  // silver
  3: '#cd7f32',  // bronze
};

const ALIGN_GLYPH: Record<string, string> = {
	ORDER: '⚖',
	CHAOS: '🜲',
	LIGHT: '☀',
	DARK:  '☽',
	NONE:  '◇', '': '◇',
};

// ── Main Component ───────────────────────────────────────────

export function LeaderboardScreen() {
  const { hero } = useAuth();

  const [entries,    setEntries]    = useState<LeaderboardEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filterAlign, setFilterAlign] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter ───────────────────────────────────────────────────

  const alignments = ['ALL', ...Array.from(new Set(entries.map(e => e.alignment).filter(Boolean)))];
  const visible    = filterAlign === 'ALL'
    ? entries
    : entries.filter(e => e.alignment === filterAlign);

  // Find current hero's rank
  const myRank = hero
    ? entries.find(e => e.root_id === hero.root_id)
    : null;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 80px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <p style={{
              fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
              color: 'var(--gold)', margin: 0, letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>Fate Board</p>
            {lastUpdated && (
              <span style={{ fontSize: 10, color: 'rgba(232,224,204,0.35)', fontFamily: 'monospace' }}>
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              style={{
                marginLeft: 'auto',
                background: 'none', border: '1px solid var(--border)',
                color: 'rgba(232,224,204,0.45)', fontSize: 11,
                borderRadius: 6, padding: '4px 10px',
                fontFamily: 'Cinzel, serif', cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '…' : '↻'}
            </button>
          </div>

          {/* Alignment filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {alignments.map(a => {
              const active = filterAlign === a;
              const color  = a === 'ALL' ? 'var(--gold)' : (ALIGNMENT_COLOR[a] ?? 'var(--gold)');
              return (
                <button
                  key={a}
                  onClick={() => setFilterAlign(a)}
                  style={{
                    flexShrink: 0,
                    padding: '4px 12px',
                    background: active ? color : 'transparent',
                    color: active ? '#0B0A08' : color,
                    border: `1px solid ${color}`,
                    borderRadius: 999,
                    fontFamily: 'Cinzel, serif',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {a === 'ALL' ? 'All' : `${ALIGN_GLYPH[a] ?? ''} ${ALIGNMENT_LABEL[a] ?? a}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* My rank banner */}
      {myRank && (
        <MyRankBanner entry={myRank} total={entries.length} />
      )}

      {/* Content */}
      {loading && entries.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ padding: '12px 16px 0' }}>
          {/* Podium top-3 */}
          {filterAlign === 'ALL' && visible.length >= 3 && (
            <Podium top3={visible.slice(0, 3)} myRootId={hero?.root_id} />
          )}

          {/* Full ranked list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visible.map((entry, idx) => (
              <RankRow
                key={entry.root_id}
                entry={entry}
                isMe={entry.root_id === hero?.root_id}
              />
            ))}
          </div>

          {/* Footer */}
          <p style={{
            textAlign: 'center', fontSize: 10,
            color: 'rgba(232,224,204,0.25)',
            fontFamily: 'Cinzel, serif', letterSpacing: '0.1em',
            padding: '24px 0 0',
          }}>
            {visible.length} HEROES RANKED · FATE XP
          </p>
        </div>
      )}
    </div>
  );
}

// ── My Rank Banner ───────────────────────────────────────────

function MyRankBanner({ entry, total }: { entry: LeaderboardEntry; total: number }) {
  const tier  = TIER_FOR_LEVEL(entry.fate_level);
  const color = ALIGNMENT_COLOR[entry.alignment] ?? 'var(--gold)';
  const percentile = Math.round((1 - (entry.rank - 1) / total) * 100);

  return (
    <div style={{
      margin: '12px 16px 0',
      background: `linear-gradient(135deg, var(--surface), ${color}18)`,
      border: `1px solid ${color}60`,
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `0 0 20px ${color}20`,
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
        color: 'var(--gold)', minWidth: 44, textAlign: 'center',
        lineHeight: 1,
      }}>
        #{entry.rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
          color: '#e8e0cc', margin: '0 0 2px',
        }}>
          Your Standing
        </p>
        <p style={{ fontSize: 11, color: 'rgba(232,224,204,0.45)', margin: 0 }}>
          Top {percentile}% · {entry.fate_level} · {entry.value.toLocaleString()} XP
        </p>
      </div>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700,
        color: tier.color, letterSpacing: '0.08em',
        textTransform: 'uppercase', textAlign: 'right',
      }}>
        {tier.name}
      </div>
    </div>
  );
}

// ── Podium ───────────────────────────────────────────────────

function Podium({ top3, myRootId }: { top3: LeaderboardEntry[]; myRootId?: string }) {
  const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd layout

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: 9,
        color: 'rgba(232,224,204,0.3)', letterSpacing: '0.2em',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        Top Fates
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {order.map((entry, i) => {
          const isCenter  = i === 1; // rank 1
          const podiumRank = isCenter ? 1 : i === 0 ? 2 : 3;
          const color     = RANK_COLOR[podiumRank];
          const acColor   = ALIGNMENT_COLOR[entry.alignment] ?? 'var(--gold)';
          const tier      = TIER_FOR_LEVEL(entry.fate_level);
          const isMe      = entry.root_id === myRootId;

          return (
            <div
              key={entry.root_id}
              style={{
                flex: isCenter ? 1.3 : 1,
                background: `linear-gradient(180deg, var(--surface) 0%, ${color}15 100%)`,
                border: `1px solid ${isMe ? acColor : color}60`,
                borderBottom: `3px solid ${color}`,
                borderRadius: '10px 10px 0 0',
                padding: `${isCenter ? 16 : 12}px 8px 12px`,
                textAlign: 'center',
                boxShadow: isCenter ? `0 0 24px ${color}30` : `0 0 12px ${color}18`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: isCenter ? 22 : 18, marginBottom: 6, color }}>
                {RANK_MEDAL[podiumRank]}
              </div>
              <p style={{
                fontFamily: 'Cinzel, serif', fontSize: isCenter ? 11 : 10,
                fontWeight: 700, color: isMe ? acColor : '#e8e0cc',
                margin: '0 0 2px', letterSpacing: '0.04em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.display_name}
              </p>
              <p style={{
                fontFamily: 'monospace', fontSize: 9,
                color: 'rgba(232,224,204,0.45)', margin: '0 0 4px',
              }}>
                Lv {entry.fate_level}
              </p>
              <p style={{
                fontSize: 9, color, fontWeight: 700,
                fontFamily: 'Cinzel, serif', letterSpacing: '0.08em',
                margin: 0, textTransform: 'uppercase',
              }}>
                #{podiumRank}
              </p>
            </div>
          );
        })}
      </div>
      {/* Podium base */}
      <div style={{
        display: 'flex', gap: 6,
      }}>
        {[2, 1, 3].map(r => (
          <div
            key={r}
            style={{
              flex: r === 1 ? 1.3 : 1,
              height: r === 1 ? 20 : r === 2 ? 12 : 8,
              background: `${RANK_COLOR[r]}30`,
              borderBottom: `2px solid ${RANK_COLOR[r]}60`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Rank Row ─────────────────────────────────────────────────

function RankRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const tier   = TIER_FOR_LEVEL(entry.fate_level);
  const color  = ALIGNMENT_COLOR[entry.alignment] ?? '#5A4E3C';
  const rankC  = RANK_COLOR[entry.rank] ?? (isMe ? 'var(--gold)' : 'rgba(232,224,204,0.45)');

  return (
    <div style={{
      background: isMe
        ? `linear-gradient(90deg, var(--surface), ${color}18)`
        : 'var(--surface)',
      border: `1px solid ${isMe ? color : 'var(--border)'}`,
      borderRadius: 10, padding: '11px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: isMe ? `0 0 12px ${color}20` : 'none',
    }}>
      {/* Rank */}
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
        color: rankC, minWidth: 32, textAlign: 'center',
      }}>
        {entry.rank <= 3
          ? <span style={{ fontSize: 16 }}>{RANK_MEDAL[entry.rank]}</span>
          : `#${entry.rank}`
        }
      </div>

      {/* Name + alignment */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            color: isMe ? 'var(--gold)' : '#e8e0cc',
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.display_name}
          </p>
          {isMe && (
            <span style={{
              fontSize: 8, background: 'var(--gold)', color: '#0B0A08',
              borderRadius: 4, padding: '1px 5px',
              fontFamily: 'Cinzel, serif', fontWeight: 700, flexShrink: 0,
            }}>YOU</span>
          )}
        </div>
        <p style={{
          fontSize: 11, color, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
        }}>
          {ALIGN_GLYPH[entry.alignment] ?? '◇'} {ALIGNMENT_LABEL[entry.alignment] ?? entry.alignment}
        </p>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
          color: tier.color, margin: '0 0 2px',
        }}>
          Lv {entry.fate_level}
        </p>
        <p style={{
          fontFamily: 'monospace', fontSize: 10,
          color: 'rgba(232,224,204,0.45)', margin: 0,
        }}>
          {entry.value.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{
        fontSize: 28, color: 'var(--gold)', marginBottom: 12,
        animation: 'spin 2s linear infinite',
      }}>⬡</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: 12,
        color: 'rgba(232,224,204,0.45)', letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Consulting the Veil…
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>⬡</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'rgba(232,224,204,0.6)', margin: '0 0 16px' }}>
        The Fates are silent
      </p>
      <p style={{ fontSize: 12, color: 'rgba(232,224,204,0.3)', margin: '0 0 20px' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 20px', background: 'var(--surface)',
          color: 'var(--gold)', border: '1px solid var(--gold)',
          borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
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

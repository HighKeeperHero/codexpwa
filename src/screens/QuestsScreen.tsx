import { useState, useMemo } from 'react';
import { useAuth } from '@/AuthContext';
import { generateQuests, type Quest, type QuestStatus } from '@/utils/questEngine';

const RC: Record<string, string> = { common: '#7C5C3A', honored: '#887860', rare: '#3A78A8', epic: '#C8A04E', legendary: '#E2B85E' };
const SC: Record<QuestStatus, string> = { active: 'var(--ember)', available: 'var(--sapphire-bright)', completed: 'var(--gold)', locked: 'var(--text-3)' };
const SL: Record<QuestStatus, string> = { active: 'ACTIVE', available: 'AVAILABLE', completed: 'COMPLETE', locked: 'LOCKED' };
type Filter = 'all' | 'active' | 'completed';

export function QuestsScreen() {
  const { hero } = useAuth();
  const [filter,   setFilter]   = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const quests  = useMemo(() => hero ? generateQuests(hero) : [], [hero]);
  const visible = useMemo(() => {
    if (filter === 'active')    return quests.filter(q => q.status === 'active' || q.status === 'available');
    if (filter === 'completed') return quests.filter(q => q.status === 'completed');
    return quests.filter(q => q.status !== 'locked');
  }, [quests, filter]);

  const done  = quests.filter(q => q.status === 'completed').length;
  const total = quests.filter(q => q.status !== 'locked').length;
  const pct   = Math.round((done / Math.max(total, 1)) * 100);

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>QUEST BOARD</h1>
          <p style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-3)' }}>
            {done} COMPLETE · {total - done} REMAINING
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
          <div className="xp-track" style={{ height: 3 }}>
            <div className="xp-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--gold-dim), var(--gold), var(--gold-bright))' }} />
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', letterSpacing: 0.5 }}>{pct}% complete</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {(['all','active','completed'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: 1, padding: '9px 0', fontSize: 8, letterSpacing: 1.5, fontWeight: 600,
              border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`,
              background: filter === f ? 'var(--gold-glow)' : 'var(--surface)',
              color: filter === f ? 'var(--gold)' : 'var(--text-3)',
              borderRadius: 6, transition: 'all 0.15s',
            }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="divider"><span className="divider-label">QUESTS</span></div>

        {/* Quest list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(q => (
            <QuestCard
              key={q.quest_id}
              quest={q}
              expanded={expanded === q.quest_id}
              onPress={() => setExpanded(expanded === q.quest_id ? null : q.quest_id)}
            />
          ))}
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 13 }}>
              No quests in this category
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest, expanded, onPress }: { quest: Quest; expanded: boolean; onPress: () => void }) {
  const rc     = RC[quest.rarity] ?? 'var(--bronze)';
  const sc     = SC[quest.status];
  const locked = quest.status === 'locked';
  const done   = quest.status === 'completed';

  return (
    <div
      className={`card ${locked ? '' : 'card-pressable'}`}
      onClick={locked ? undefined : onPress}
      style={{
        display: 'flex',
        opacity: locked ? 0.35 : done ? 0.7 : 1,
        borderColor: expanded ? rc + '60' : undefined,
        transition: 'border-color 0.2s, opacity 0.2s',
      }}
    >
      <div style={{ width: 3, background: locked ? 'var(--border)' : rc, flexShrink: 0, transition: 'background 0.2s' }} />
      <div style={{ flex: 1, padding: '13px 13px 13px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, letterSpacing: 1.5, fontWeight: 600, color: locked ? 'var(--text-3)' : rc }}>
            {quest.rarity.toUpperCase()} · {quest.category.toUpperCase()}
          </span>
          <span style={{
            fontSize: 8, letterSpacing: 1.5, fontWeight: 600,
            color: sc, border: `1px solid ${sc}45`,
            background: `${sc}12`, padding: '2px 7px', borderRadius: 3,
          }}>
            {SL[quest.status]}
          </span>
        </div>

        {/* Title */}
        <p className="serif" style={{ fontSize: 15, color: locked ? 'var(--text-3)' : 'var(--text-1)', letterSpacing: 0.2 }}>
          {locked ? '— Locked —' : quest.title}
        </p>

        {/* Progress */}
        {!locked && !done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="xp-track" style={{ height: 3 }}>
              <div className="xp-fill" style={{
                width: `${quest.progress * 100}%`,
                background: quest.status === 'active'
                  ? 'linear-gradient(90deg, var(--ember-dim), var(--ember))' 
                  : 'linear-gradient(90deg, var(--sapphire), var(--sapphire-bright))',
              }} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: 0.3 }}>{quest.progress_label}</span>
          </div>
        )}
        {done && (
          <span style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 0.3 }}>✦ {quest.progress_label}</span>
        )}

        {/* Expanded detail */}
        {expanded && !locked && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            paddingTop: 12, marginTop: 4,
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.7 }}>
              "{quest.lore}"
            </p>
            <div>
              <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>OBJECTIVE</p>
              <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>{quest.objective}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>REWARD</p>
              <span style={{ fontSize: 14, color: 'var(--ember)', fontWeight: 600 }}>+{quest.xp_reward} Fate XP</span>
            </div>
          </div>
        )}
      </div>

      {!locked && (
        <div style={{ padding: '13px 12px', display: 'flex', alignItems: 'flex-start', paddingTop: 26 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1 }}>{expanded ? '∧' : '∨'}</span>
        </div>
      )}
    </div>
  );
}

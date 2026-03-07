import { useState, useMemo } from 'react';
import { useAuth } from '@/AuthContext';
import { generateQuests, type Quest, type QuestStatus } from '@/utils/questEngine';

const RARITY_COLOR: Record<string, string> = {
  common: '#7C5C3A', honored: '#8A7A5A', rare: '#4080B0', epic: '#D4A853', legendary: '#E8C070',
};
const STATUS_COLOR: Record<QuestStatus, string> = {
  active: 'var(--ember)', available: 'var(--sapphire-bright)', completed: 'var(--gold)', locked: 'var(--text-dim)',
};
const STATUS_LABEL: Record<QuestStatus, string> = {
  active: 'ACTIVE', available: 'AVAILABLE', completed: 'COMPLETE', locked: 'LOCKED',
};

type Filter = 'all' | 'active' | 'completed';

export function QuestsScreen() {
  const { hero } = useAuth();
  const [filter,   setFilter]   = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const quests = useMemo(() => hero ? generateQuests(hero) : [], [hero]);

  const visible = useMemo(() => {
    if (filter === 'active')    return quests.filter(q => q.status === 'active' || q.status === 'available');
    if (filter === 'completed') return quests.filter(q => q.status === 'completed');
    return quests.filter(q => q.status !== 'locked');
  }, [quests, filter]);

  const completed = quests.filter(q => q.status === 'completed').length;
  const total     = quests.filter(q => q.status !== 'locked').length;
  const pct       = Math.round((completed / Math.max(total, 1)) * 100);

  return (
    <div className="screen">
      <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="ornament-row">
            <div className="ornament-line" />
            <span className="ornament-glyph">◈</span>
            <div className="ornament-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-primary)', letterSpacing: 3 }}>QUEST BOARD</h1>
          <p style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-dim)' }}>{completed} COMPLETE · {total - completed} REMAINING</p>
        </div>

        {/* Overall progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="xp-track" style={{ height: 4 }}>
            <div className="xp-fill" style={{ width: `${pct}%`, background: 'var(--gold)' }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', letterSpacing: 0.5 }}>{pct}% complete</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'active', 'completed'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: 1, padding: '8px 0', fontSize: 9, letterSpacing: 1.5, fontWeight: 600,
              border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`,
              background: filter === f ? 'var(--gold-glow)' : 'var(--surface)',
              color: filter === f ? 'var(--gold)' : 'var(--text-dim)',
              borderRadius: 4, cursor: 'pointer',
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
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-dim)', fontSize: 12 }}>
              No quests in this category
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest, expanded, onPress }: { quest: Quest; expanded: boolean; onPress: () => void }) {
  const rc = RARITY_COLOR[quest.rarity] ?? 'var(--bronze)';
  const sc = STATUS_COLOR[quest.status];
  const isLocked = quest.status === 'locked';
  const isDone   = quest.status === 'completed';

  return (
    <div
      className="card"
      onClick={isLocked ? undefined : onPress}
      style={{ display: 'flex', opacity: isLocked ? 0.4 : isDone ? 0.75 : 1, cursor: isLocked ? 'default' : 'pointer' }}
    >
      <div style={{ width: 3, background: isLocked ? 'var(--border)' : rc, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '14px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, letterSpacing: 1.5, fontWeight: 600, color: isLocked ? 'var(--text-dim)' : rc }}>
            {quest.rarity.toUpperCase()} · {quest.category.toUpperCase()}
          </span>
          <span style={{ fontSize: 8, letterSpacing: 1.5, fontWeight: 600, color: sc, border: `1px solid ${sc}50`, background: `${sc}15`, padding: '2px 7px', borderRadius: 4 }}>
            {STATUS_LABEL[quest.status]}
          </span>
        </div>

        {/* Title */}
        <p className="serif" style={{ fontSize: 15, color: isLocked ? 'var(--text-dim)' : 'var(--text-primary)', letterSpacing: 0.3 }}>
          {isLocked ? '— Locked —' : quest.title}
        </p>

        {/* Progress */}
        {!isLocked && !isDone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="xp-track" style={{ height: 3 }}>
              <div className="xp-fill" style={{ width: `${quest.progress * 100}%`, background: quest.status === 'active' ? 'var(--ember)' : 'var(--sapphire-bright)' }} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 0.5 }}>{quest.progress_label}</span>
          </div>
        )}
        {isDone && <span style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 0.5 }}>✦ {quest.progress_label}</span>}

        {/* Expanded */}
        {expanded && !isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>"{quest.lore}"</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 600 }}>OBJECTIVE</span>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{quest.objective}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 600 }}>REWARD</span>
              <span style={{ fontSize: 13, color: 'var(--ember)', fontWeight: 600 }}>+{quest.xp_reward} Fate XP</span>
            </div>
          </div>
        )}
      </div>

      {!isLocked && (
        <div style={{ padding: '14px 10px', display: 'flex', alignItems: 'flex-start', color: 'var(--text-dim)', fontSize: 10 }}>
          {expanded ? '∧' : '∨'}
        </div>
      )}
    </div>
  );
}

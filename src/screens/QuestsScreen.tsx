// src/screens/QuestsScreen.tsx
// v2 fix: Realm Alignment Locked "Lv X / 20" color changed from
//         var(--ember) [reads as penalty/negative] to var(--gold)
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

interface QuestObjective {
  id: string; label: string; type: string;
  target: number; current: number; completed: boolean;
}
interface QuestRewards { xp?: number; title_id?: string; }
interface Quest {
  quest_id: string; name: string; description: string; quest_type: string;
  objectives: QuestObjective[]; rewards: QuestRewards;
  status: 'available' | 'active' | 'completed' | 'locked';
  progress: string; started_at: string | null; completed_at: string | null;
}

const ALIGNMENT_META: Record<string, { color: string; label: string; realm: string; icon: string }> = {
  ORDER: { color: '#4A7EC8', label: 'Order', realm: 'The Realm of Structure',  icon: '⚖' },
  CHAOS: { color: '#C85E28', label: 'Chaos', realm: 'The Realm of Entropy',   icon: '🜲' },
  LIGHT: { color: '#C8A04E', label: 'Light', realm: 'The Realm of Radiance',  icon: '☀' },
  DARK:  { color: '#7A5888', label: 'Dark',  realm: 'The Realm of Shadow',    icon: '☽' },
};

function AbandonButton({ quest, rootId, onAbandoned }: { quest: Quest; rootId: string; onAbandoned: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abandon = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch(`${BASE}/api/quests/abandon`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId, quest_id: quest.quest_id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message ?? 'Failed to abandon quest');
      onAbandoned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setConfirming(false);
    } finally { setLoading(false); }
  };

  if (!confirming) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setConfirming(true); }}
        style={{ width: '100%', padding: '9px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(200,94,40,0.25)', color: 'rgba(200,94,40,0.6)', fontSize: 12, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s ease' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,94,40,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ember)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,94,40,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,94,40,0.6)'; }}
      >
        Abandon Hunt
      </button>
    );
  }

  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(200,94,40,0.08)', border: '1px solid rgba(200,94,40,0.3)' }}>
      {error && <p style={{ fontSize: 12, color: 'var(--ember)', marginBottom: 8 }}>{error}</p>}
      <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
        Abandon <strong style={{ color: 'var(--ember)' }}>{quest.name}</strong>? All progress will be lost.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); setConfirming(false); }} disabled={loading}
          style={{ flex: 1, padding: '8px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
          Keep It
        </button>
        <button onClick={e => { e.stopPropagation(); abandon(); }} disabled={loading}
          style={{ flex: 1, padding: '8px', borderRadius: 6, background: 'rgba(200,94,40,0.15)', border: '1px solid rgba(200,94,40,0.4)', color: 'var(--ember)', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Abandoning…' : 'Abandon'}
        </button>
      </div>
    </div>
  );
}

function AcceptButton({ quest, rootId, onAccepted, onAbandoned }: { quest: Quest; rootId: string; onAccepted: () => void; onAbandoned: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch(`${BASE}/api/quests/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId, quest_id: quest.quest_id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message ?? 'Failed to accept quest');
      onAccepted();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  if (quest.status === 'completed') {
    return (
      <div style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(72,110,72,0.1)', border: '1px solid rgba(72,110,72,0.25)', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#6A8A5A', fontWeight: 700 }}>✔ COMPLETED</span>
      </div>
    );
  }
  if (quest.status === 'active') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>⚔ IN PROGRESS — {quest.progress} objectives</span>
        </div>
        <AbandonButton quest={quest} rootId={rootId} onAbandoned={onAbandoned} />
      </div>
    );
  }
  if (quest.status === 'locked') {
    return (
      <div style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>◈ LOCKED — Level requirement not met</span>
      </div>
    );
  }
  return (
    <>
      {error && <p style={{ fontSize: 12, color: 'var(--ember)', marginBottom: 6 }}>{error}</p>}
      <button onClick={e => { e.stopPropagation(); accept(); }} disabled={loading}
        style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: loading ? 'var(--surface)' : 'linear-gradient(135deg, rgba(255,165,0,0.85), rgba(200,94,40,0.6))', color: loading ? 'var(--text-3)' : '#0B0F1A', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s ease' }}>
        {loading ? 'Accepting…' : 'Accept Hunt'}
      </button>
    </>
  );
}

function ObjectiveRow({ obj }: { obj: QuestObjective }) {
  const pct = obj.target > 0 ? Math.min(100, (obj.current / obj.target) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: obj.completed ? '#6A8A5A' : 'var(--text-2)' }}>
          {obj.completed ? '✔ ' : ''}{obj.label}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{obj.current}/{obj.target}</span>
      </div>
      <div className="xp-track" style={{ height: 3 }}>
        <div className="xp-fill" style={{ width: `${pct}%`, background: obj.completed ? 'linear-gradient(90deg, #6A8A5A, #8AAA7A)' : 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }} />
      </div>
    </div>
  );
}

export function QuestsScreen() {
  const { hero, alignment } = useAuth();
  const [board, setBoard] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const heroLevel    = hero?.progression.hero_level ?? hero?.progression.fate_level ?? 0;
  const hasAlignment = !!(alignment && alignment !== 'NONE' && alignment !== '');
  const isLocked     = heroLevel < 20;
  const meta = hasAlignment ? ALIGNMENT_META[alignment!] : null;
  const ac = meta?.color ?? 'var(--bronze)';

  const loadBoard = useCallback(async () => {
    if (!hero) return;
    setLoading(true); setError(null);
    try {
      const resp = await fetch(`${BASE}/api/quests/board/${hero.root_id}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message ?? 'Failed to load quests');
      setBoard(json.data ?? json);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load hunts'); }
    finally { setLoading(false); }
  }, [hero?.root_id]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  if (!hero) return null;

  const universalTypes = new Set(['cross_venue', 'single_venue', 'achievement']);
  const alignmentHunts = hasAlignment ? board.filter(q => q.quest_type === alignment) : [];
  const universalQuests = board.filter(q => universalTypes.has(q.quest_type));

  const renderQuest = (quest: Quest) => {
    const isOpen = expanded === quest.quest_id;
    const isAlignmentHunt = !!ALIGNMENT_META[quest.quest_type];
    const accentColor = isAlignmentHunt ? ac : quest.status === 'completed' ? '#6A8A5A' : 'var(--bronze)';
    return (
      <div key={quest.quest_id} className="card"
        onClick={() => setExpanded(isOpen ? null : quest.quest_id)}
        style={{ cursor: 'pointer', borderColor: isOpen ? `${ac}40` : undefined, overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 3, flexShrink: 0, background: accentColor, transition: 'background 0.2s' }} />
          <div style={{ flex: 1, padding: '14px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p className="serif" style={{ fontSize: 15, color: quest.status === 'locked' ? 'var(--text-3)' : 'var(--text-1)', marginBottom: 4 }}>
                  {quest.status === 'locked' ? '◈ ' : ''}{quest.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{quest.description}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{isOpen ? '∧' : '∨'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {quest.status === 'active' && <span style={{ fontSize: 11, letterSpacing: '0.12em', color: ac, border: `1px solid ${ac}40`, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>}
              {quest.status === 'completed' && <span style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6A8A5A', border: '1px solid rgba(72,110,72,0.4)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>COMPLETE</span>}
              {quest.status === 'locked' && <span style={{ fontSize: 11, color: 'var(--text-3)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 4 }}>LOCKED</span>}
              <span style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 4 }}>
                {quest.quest_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              {quest.rewards?.xp && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ember)', fontWeight: 600 }}>+{quest.rewards.xp} XP</span>}
            </div>
            {isOpen && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>OBJECTIVES — {quest.progress}</p>
                {quest.objectives.map(obj => <ObjectiveRow key={obj.id} obj={obj} />)}
                {(quest.rewards?.xp || quest.rewards?.title_id) && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: `${ac}08`, border: `1px solid ${ac}15`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {quest.rewards.title_id ? `Title: "${quest.rewards.title_id.replace('title_','').replace(/_/g,' ')}"` : 'Reward'}
                    </span>
                    {quest.rewards.xp && <span style={{ fontSize: 12, color: ac, fontWeight: 700 }}>+{quest.rewards.xp} XP</span>}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <AcceptButton quest={quest} rootId={hero.root_id} onAccepted={loadBoard} onAbandoned={loadBoard} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="screen screen-enter">
      <div className="screen-content stagger">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="orn-row" style={{ width: 160 }}>
            <div className="orn-line" />
            <span className="orn-glyph" style={{ color: hasAlignment ? ac : 'var(--gold)' }}>{meta?.icon ?? '◈'}</span>
            <div className="orn-line" />
          </div>
          <h1 className="serif-bold" style={{ fontSize: 28, color: 'var(--text-1)', letterSpacing: 3 }}>
            {hasAlignment ? `${meta!.label.toUpperCase()} HUNTS` : 'HUNTS'}
          </h1>
          {meta && <p style={{ fontSize: 12, letterSpacing: '0.15em', color: ac, opacity: 0.8 }}>{meta.realm.toUpperCase()}</p>}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', gap: 12, alignItems: 'center' }}>
            <span className="live-dot" style={{ width: 8, height: 8 }} />
            <p style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.15em' }}>LOADING HUNTS…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '16px', borderRadius: 'var(--radius)', background: 'rgba(200,94,40,0.08)', border: '1px solid rgba(200,94,40,0.25)', textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ember)', marginBottom: 8 }}>{error}</p>
            <button onClick={loadBoard} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Level lock */}
        {!loading && isLocked && (
          <div style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 12 }}>◈</div>
            <p className="serif" style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 8 }}>Realm Alignment Locked</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 12 }}>
              Reach Hero Level 20 to choose your realm and unlock alignment hunts.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="xp-track" style={{ flex: 1, height: 4 }}>
                <div className="xp-fill" style={{ width: `${Math.min(100, (heroLevel / 20) * 100)}%` }} />
              </div>
              {/* ← FIXED: was var(--ember)/red, now var(--gold) — progress reads as positive */}
              <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>Lv {heroLevel} / 20</span>
            </div>
          </div>
        )}

        {/* Unaligned at 20+ */}
        {!loading && !isLocked && !hasAlignment && (
          <div style={{ padding: '20px', borderRadius: 'var(--radius)', marginBottom: 16, background: 'linear-gradient(135deg, rgba(255,165,0,0.08), rgba(200,94,40,0.04))', border: '1px solid rgba(255,165,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
            <p className="serif" style={{ fontSize: 16, color: 'var(--gold)', marginBottom: 8 }}>Choose Your Realm</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Go to the Archive tab and choose your alignment to unlock realm-specific hunts.
            </p>
          </div>
        )}

        {!loading && !error && hasAlignment && alignmentHunts.length > 0 && (
          <>
            <div className="divider"><span className="divider-label" style={{ color: ac }}>{meta!.label.toUpperCase()} HUNTS · {alignmentHunts.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{alignmentHunts.map(renderQuest)}</div>
          </>
        )}

        {!loading && !error && universalQuests.length > 0 && (
          <>
            <div className="divider" style={{ marginTop: alignmentHunts.length > 0 ? 8 : 0 }}>
              <span className="divider-label">FATE QUESTS · {universalQuests.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{universalQuests.map(renderQuest)}</div>
          </>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

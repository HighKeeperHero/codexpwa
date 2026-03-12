// VenturesScreen.tsx — Sprint 20.3
// Sub-tabs: Quests | Recon | Hunts
// Hunts locked until alignment chosen (NONE → lock screen → AlignmentModal)

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

function unwrap(json: any): any {
  if (json?.data?.data !== undefined) return json.data.data;
  if (json?.data !== undefined)       return json.data;
  return json;
}

// ── Design tokens (alignment) ─────────────────────────────────────────────────
const ALIGNMENT_COLOR: Record<string, string> = {
  ORDER: '#4A7EC8', CHAOS: '#C85E28', LIGHT: '#C8A04E', DARK: '#7A5888', NONE: '#5A5A6A',
};
const ALIGNMENT_GLYPH: Record<string, string> = {
  ORDER: '⚖', CHAOS: '🜲', LIGHT: '☀', DARK: '☽', NONE: '◇',
};
const ALIGNMENT_LABEL: Record<string, string> = {
  ORDER: 'Order', CHAOS: 'Chaos', LIGHT: 'Light', DARK: 'Dark', NONE: 'Unaligned',
};
const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#22C55E', Medium: '#FFA500', Hard: '#EF4444', Epic: '#A855F7',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface DailyQuest {
  quest_id: string;
  title: string;
  objective: string;
  category: string;
  max_progress: number;
  xp_reward: number;
  lore: string;
  reward_label: string;
  progress: number;
  status: 'active' | 'completed' | 'abandoned';
}
interface ScoutingMission {
  mission_id: string;
  title: string;
  objective: string;
  distance_m: number;
  xp_reward: number;
  expires_hours: number;
  reward_label: string;
}
interface IntelCard {
  intel_id: string;
  zone: string;
  type: 'zone' | 'boss';
  headline: string;
  body: string;
  icon: string;
}
interface Hunt {
  hunt_id: string;
  title: string;
  objective: string;
  type: 'veil_tear' | 'component' | 'enemy';
  difficulty: string;
  max_progress: number;
  xp_reward: number;
  lore: string;
  icon: string;
}

type SubTab = 'quests' | 'recon' | 'hunts';

// ── Main Screen ───────────────────────────────────────────────────────────────
export function VenturesScreen() {
  const { hero, sessionToken } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('quests');

  const rootId    = (hero as any)?.root_id ?? null;
  const alignment = (hero as any)?.fate_alignment ?? (hero as any)?.alignment ?? 'NONE';

  const subTabs: { id: SubTab; label: string; icon: string }[] = [
    { id: 'quests', label: 'Quests', icon: '◈' },
    { id: 'recon',  label: 'Recon',  icon: '◎' },
    { id: 'hunts',  label: 'Hunts',  icon: '◉' },
  ];

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .ven-subtab { background: none; border: none; cursor: pointer; padding: 10px 0; flex: 1;
          font-size: 9px; letter-spacing: 0.14em; font-weight: 700;
          font-family: var(--font-serif); transition: color 0.15s; }
        .ven-card { background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 16px; margin-bottom: 10px; }
        .ven-progress-track { height: 5px; background: rgba(255,255,255,0.06);
          border-radius: 3px; overflow: hidden; margin: 10px 0; }
        @keyframes ventureIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .venture-enter { animation: ventureIn 0.25s ease both; }
        .ven-btn { border-radius: 6px; font-family: var(--font-serif); font-size: 10px;
          font-weight: 700; letter-spacing: 0.06em; cursor: pointer; padding: 6px 12px;
          transition: opacity 0.15s; }
        .ven-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ven-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 20px 100px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '48px 20px 0', flexShrink: 0 }}>
        <h2 className="serif-bold" style={{ fontSize: 26, color: 'var(--gold)', letterSpacing: '0.18em', margin: 0 }}>VENTURES</h2>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', marginTop: 2 }}>Quests · Recon · Hunts</p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', margin: '16px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {subTabs.map(t => (
          <button
            key={t.id}
            className="ven-subtab"
            onClick={() => setSubTab(t.id)}
            style={{ color: subTab === t.id ? 'var(--gold)' : 'var(--text-3)',
              borderBottom: subTab === t.id ? '2px solid var(--gold)' : '2px solid transparent' }}
          >
            {t.icon} {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="ven-scroll">
        {subTab === 'quests' && (
          <QuestsView rootId={rootId} sessionToken={sessionToken} alignment={alignment} />
        )}
        {subTab === 'recon' && (
          <ReconView rootId={rootId} sessionToken={sessionToken} />
        )}
        {subTab === 'hunts' && (
          <HuntsView rootId={rootId} sessionToken={sessionToken} alignment={alignment} />
        )}
      </div>
    </div>
  );
}

// ── QUESTS VIEW ───────────────────────────────────────────────────────────────
function QuestsView({ rootId, sessionToken, alignment }: { rootId: string | null; sessionToken: string | null; alignment: string }) {
  const [quests,  setQuests]  = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rootId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${BASE}/api/ventures/quests/${rootId}/daily`);
      const json = await res.json();
      const data = unwrap(json);
      setQuests(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load daily quests.');
    } finally { setLoading(false); }
  }, [rootId]);

  useEffect(() => { load(); }, [load]);

  const handleProgress = async (quest: DailyQuest) => {
    if (quest.status !== 'active' || quest.progress >= quest.max_progress) return;
    const next = quest.progress + 1;
    setQuests(qs => qs.map(q => q.quest_id === quest.quest_id
      ? { ...q, progress: next, status: next >= q.max_progress ? 'completed' : 'active' }
      : q));
    try {
      await fetch(`${BASE}/api/ventures/quests/${rootId}/${quest.quest_id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
        body: JSON.stringify({ increment: 1 }),
      });
    } catch { /* optimistic — no rollback on stub */ }
  };

  const handleAbandon = async (quest: DailyQuest) => {
    setQuests(qs => qs.filter(q => q.quest_id !== quest.quest_id));
    try {
      await fetch(`${BASE}/api/ventures/quests/${rootId}/${quest.quest_id}/abandon`, {
        method: 'POST',
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
    } catch { /* stub */ }
  };

  if (loading) return <QuestSkeleton />;
  if (error)   return <EmptyState icon="◈" title="Quests Unavailable" body={error} />;
  if (quests.length === 0) return <EmptyState icon="◈" title="No Active Quests" body="Daily quests refresh at midnight UTC." />;

  // Midnight UTC refresh countdown
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diffMs   = midnight.getTime() - now.getTime();
  const hh = Math.floor(diffMs / 3_600_000);
  const mm = Math.floor((diffMs % 3_600_000) / 60_000);

  return (
    <div className="venture-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', margin: 0 }}>
          DAILY QUESTS
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
          Resets in {hh}h {mm}m
        </p>
      </div>
      {quests.map(q => <QuestCard key={q.quest_id} quest={q} onProgress={handleProgress} onAbandon={handleAbandon} />)}
    </div>
  );
}

function QuestCard({ quest, onProgress, onAbandon }: {
  quest: DailyQuest;
  onProgress: (q: DailyQuest) => void;
  onAbandon:  (q: DailyQuest) => void;
}) {
  const [rewardOpen, setRewardOpen] = useState(false);
  const pct     = Math.min(100, Math.round((quest.progress / quest.max_progress) * 100));
  const done    = quest.status === 'completed';
  const accentClr = done ? '#6A8A5A' : '#FFA500';

  return (
    <div className="ven-card" style={{
      borderColor: done ? 'rgba(106,138,90,0.4)' : 'var(--border)',
      background: done ? 'rgba(106,138,90,0.06)' : 'var(--surface)',
      opacity: quest.status === 'abandoned' ? 0.4 : 1,
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
              color: done ? '#6A8A5A' : 'var(--text-1)', margin: 0 }}>{quest.title}</p>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.12em',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '1px 6px', fontWeight: 700 }}>
              {quest.category?.toUpperCase() ?? 'QUEST'}
            </span>
            {done && <span style={{ fontSize: 9, color: '#6A8A5A', letterSpacing: '0.12em',
              background: 'rgba(106,138,90,0.12)', border: '1px solid rgba(106,138,90,0.3)',
              borderRadius: 3, padding: '1px 6px' }}>DONE</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.4 }}>
            {quest.objective}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ven-progress-track">
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accentClr}60, ${accentClr})`,
          borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{quest.progress} / {quest.max_progress}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{pct}%</span>
      </div>

      {/* Action buttons */}
      {!done && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            className="ven-btn"
            onClick={() => onProgress(quest)}
            style={{ flex: 1, background: 'var(--gold)', color: '#0B0A08', border: 'none' }}
          >
            + Progress
          </button>
          <button
            className="ven-btn"
            onClick={() => onAbandon(quest)}
            style={{ background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }}
          >
            Abandon
          </button>
        </div>
      )}

      {/* Reward — collapsible */}
      <button
        onClick={() => setRewardOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0',
          borderTop: '1px solid var(--border)' }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>
          REWARD
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'inline-block',
          transition: 'transform 0.2s', transform: rewardOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {rewardOpen && (
        <div style={{ paddingTop: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--gold)', margin: '0 0 4px', fontWeight: 700 }}>
            {quest.reward_label}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
            "{quest.lore}"
          </p>
        </div>
      )}
    </div>
  );
}

function QuestSkeleton() {
  return (
    <div>
      {[1, 0.7, 0.45].map((op, i) => (
        <div key={i} className="ven-card" style={{ height: 120, opacity: op }} />
      ))}
    </div>
  );
}

// ── RECON VIEW ────────────────────────────────────────────────────────────────
function ReconView({ rootId, sessionToken }: { rootId: string | null; sessionToken: string | null }) {
  const [missions, setMissions] = useState<ScoutingMission[]>([]);
  const [intel,    setIntel]    = useState<IntelCard[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [intelFilter, setIntelFilter] = useState<'all' | 'zone' | 'boss'>('all');

  useEffect(() => {
    if (!rootId) { setLoading(false); return; }
    fetch(`${BASE}/api/ventures/recon/${rootId}`)
      .then(r => r.json())
      .then(json => {
        const d = unwrap(json);
        setMissions(Array.isArray(d?.scouting_missions) ? d.scouting_missions : []);
        setIntel(Array.isArray(d?.intel_cards) ? d.intel_cards : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rootId]);

  const visibleIntel = intelFilter === 'all' ? intel : intel.filter(c => c.type === intelFilter);

  if (loading) return <QuestSkeleton />;

  return (
    <div className="venture-enter">
      {/* Scouting Missions */}
      <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.14em', margin: '0 0 12px', fontWeight: 700 }}>
        SCOUTING MISSIONS
      </p>
      {missions.length === 0 ? (
        <EmptyState icon="◎" title="No Active Missions" body="Scouting missions refresh weekly." />
      ) : (
        <div style={{ marginBottom: 24 }}>
          {missions.map(m => <ScoutingCard key={m.mission_id} mission={m} />)}
        </div>
      )}

      {/* Intel Cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.14em', margin: 0, fontWeight: 700 }}>
          ZONE INTEL
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'zone', 'boss'] as const).map(f => (
            <button
              key={f}
              onClick={() => setIntelFilter(f)}
              style={{ padding: '3px 10px', borderRadius: 999, border: `1px solid ${intelFilter === f ? 'var(--gold)' : 'var(--border)'}`,
                background: intelFilter === f ? 'var(--gold)' : 'transparent',
                color: intelFilter === f ? '#0B0A08' : 'var(--text-3)',
                fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {visibleIntel.map(c => <IntelCardView key={c.intel_id} card={c} />)}
    </div>
  );
}

function ScoutingCard({ mission }: { mission: ScoutingMission }) {
  const km = mission.distance_m >= 1000
    ? `${(mission.distance_m / 1000).toFixed(0)} km`
    : mission.distance_m > 0 ? `${mission.distance_m} m` : 'Venue visit';

  return (
    <div className="ven-card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(30,144,255,0.1)',
          border: '1px solid rgba(30,144,255,0.25)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>◎</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              {mission.title}
            </p>
            {mission.distance_m > 0 && (
              <span style={{ fontSize: 10, color: '#1E90FF', fontFamily: 'monospace', flexShrink: 0 }}>{km}</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {mission.objective}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>{mission.reward_label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Expires {mission.expires_hours}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelCardView({ card }: { card: IntelCard }) {
  const [open, setOpen] = useState(false);
  const typeBadge = card.type === 'boss'
    ? { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'BOSS' }
    : { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  label: 'ZONE' };

  return (
    <div className="ven-card" style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{card.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
              color: 'var(--text-1)', margin: 0 }}>{card.headline}</p>
            <span style={{ fontSize: 9, color: typeBadge.color, background: typeBadge.bg,
              border: `1px solid ${typeBadge.color}30`, borderRadius: 3, padding: '1px 5px',
              letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>{typeBadge.label}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0' }}>{card.zone}</p>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12, flexShrink: 0,
          display: 'inline-block', transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
          margin: '12px 0 0', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {card.body}
        </p>
      )}
    </div>
  );
}

// ── HUNTS VIEW ────────────────────────────────────────────────────────────────
function HuntsView({ rootId, sessionToken, alignment }: { rootId: string | null; sessionToken: string | null; alignment: string }) {
  const [hunts,    setHunts]    = useState<Hunt[]>([]);
  const [loading,  setLoading]  = useState(true);
  // accepted: Record<hunt_id, progress>
  const [accepted, setAccepted] = useState<Record<string, number>>({});

  const isLocked = !alignment || alignment === 'NONE';
  const aColor   = ALIGNMENT_COLOR[alignment] ?? 'var(--text-3)';
  const aGlyph   = ALIGNMENT_GLYPH[alignment] ?? '◇';

  useEffect(() => {
    if (isLocked || !rootId) { setLoading(false); return; }
    fetch(`${BASE}/api/ventures/hunts/${rootId}`, {
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    })
      .then(r => r.json())
      .then(json => {
        const d = unwrap(json);
        setHunts(Array.isArray(d?.[alignment]) ? d[alignment] : []);
      })
      .catch(() => setHunts([]))
      .finally(() => setLoading(false));
  }, [rootId, alignment, isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept  = (huntId: string) => setAccepted(a => ({ ...a, [huntId]: 0 }));
  const handleAbandon = (huntId: string) => setAccepted(a => { const n = { ...a }; delete n[huntId]; return n; });
  const handleProgress = (hunt: Hunt) => {
    const cur  = accepted[hunt.hunt_id] ?? 0;
    const next = Math.min(cur + 1, hunt.max_progress);
    setAccepted(a => ({ ...a, [hunt.hunt_id]: next }));
  };

  // ── Lock screen ────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="venture-enter" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(90,90,106,0.1)', border: '1px solid rgba(90,90,106,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          ◇
        </div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          color: 'var(--text-2)', letterSpacing: '0.12em', margin: '0 0 10px' }}>
          ALIGNMENT REQUIRED
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 8px' }}>
          Hunts are alignment-exclusive — each faction wages a different war.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 28px' }}>
          Choose your alignment to unlock hunts specific to your realm.
        </p>
        <div style={{ background: 'rgba(200,160,78,0.05)', border: '1px solid rgba(200,160,78,0.15)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(200,160,78,0.5)',
            letterSpacing: '0.15em', margin: '0 0 10px' }}>ALIGNMENT PATHS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['ORDER','CHAOS','LIGHT','DARK'] as const).map(a => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, background: `${ALIGNMENT_COLOR[a]}08`,
                border: `1px solid ${ALIGNMENT_COLOR[a]}25` }}>
                <span style={{ fontSize: 14 }}>{ALIGNMENT_GLYPH[a]}</span>
                <span style={{ fontSize: 11, color: ALIGNMENT_COLOR[a],
                  fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {ALIGNMENT_LABEL[a]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
          Reach <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Level 20</span> and select your alignment in the <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Hero tab</span> to unlock this section.
        </p>
      </div>
    );
  }

  if (loading) return <QuestSkeleton />;

  const activeHunts  = hunts.filter(h => hunt_id(h) in accepted);
  const availableHunts = hunts.filter(h => !(hunt_id(h) in accepted));

  function hunt_id(h: Hunt) { return h.hunt_id; }

  return (
    <div className="venture-enter">
      {/* Alignment banner */}
      <div style={{ background: `${aColor}0A`, border: `1px solid ${aColor}30`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, color: aColor }}>{aGlyph}</span>
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: aColor,
            letterSpacing: '0.14em', margin: '0 0 2px', fontWeight: 700 }}>
            {alignment} HUNTS
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
            Seal rifts · Collect components · Defeat enemies
          </p>
        </div>
      </div>

      {/* Active hunts section */}
      {activeHunts.length > 0 && (
        <>
          <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.14em',
            fontWeight: 700, margin: '0 0 10px' }}>ACTIVE HUNTS</p>
          {activeHunts.map(h => (
            <HuntCard
              key={h.hunt_id}
              hunt={h}
              alignment={alignment}
              progress={accepted[h.hunt_id] ?? 0}
              isAccepted={true}
              onAccept={handleAccept}
              onAbandon={handleAbandon}
              onProgress={handleProgress}
            />
          ))}
          {availableHunts.length > 0 && (
            <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.14em',
              fontWeight: 700, margin: '20px 0 10px' }}>AVAILABLE</p>
          )}
        </>
      )}

      {availableHunts.length === 0 && activeHunts.length === 0 ? (
        <EmptyState icon={aGlyph} title="No Hunts Available" body="Alignment hunts are being generated. Check back soon." />
      ) : (
        availableHunts.map(h => (
          <HuntCard
            key={h.hunt_id}
            hunt={h}
            alignment={alignment}
            progress={0}
            isAccepted={false}
            onAccept={handleAccept}
            onAbandon={handleAbandon}
            onProgress={handleProgress}
          />
        ))
      )}
    </div>
  );
}

const HUNT_TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  veil_tear:  { label: 'Veil Tear',  icon: '⚡', color: '#A855F7' },
  component:  { label: 'Component',  icon: '⬡',  color: '#1E90FF' },
  enemy:      { label: 'Enemy',      icon: '☠',  color: '#EF4444' },
};

function HuntCard({ hunt, alignment, progress, isAccepted, onAccept, onAbandon, onProgress }: {
  hunt: Hunt;
  alignment: string;
  progress: number;
  isAccepted: boolean;
  onAccept:   (id: string) => void;
  onAbandon:  (id: string) => void;
  onProgress: (hunt: Hunt) => void;
}) {
  const aColor  = ALIGNMENT_COLOR[alignment] ?? 'var(--text-3)';
  const dColor  = DIFFICULTY_COLOR[hunt.difficulty] ?? 'var(--text-3)';
  const typeCfg = HUNT_TYPE_CFG[hunt.type] ?? HUNT_TYPE_CFG.enemy;
  const pct     = hunt.max_progress > 1 ? Math.min(100, Math.round((progress / hunt.max_progress) * 100)) : 0;
  const done    = isAccepted && progress >= hunt.max_progress;

  return (
    <div className="ven-card" style={{
      borderColor: done ? 'rgba(106,138,90,0.4)' : isAccepted ? aColor + '50' : 'var(--border)',
      background: done ? 'rgba(106,138,90,0.06)' : isAccepted ? `${aColor}06` : 'var(--surface)',
      marginBottom: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10,
          background: `${typeCfg.color}12`, border: `1px solid ${typeCfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0 }}>
          {typeCfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
              color: done ? '#6A8A5A' : 'var(--text-1)', margin: 0 }}>{hunt.title}</p>
            <span style={{ fontSize: 9, color: typeCfg.color, background: `${typeCfg.color}12`,
              border: `1px solid ${typeCfg.color}30`, borderRadius: 3, padding: '1px 5px',
              letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>
              {typeCfg.label.toUpperCase()}
            </span>
            <span style={{ fontSize: 9, color: dColor, background: `${dColor}12`,
              border: `1px solid ${dColor}30`, borderRadius: 3, padding: '1px 5px',
              letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>
              {hunt.difficulty.toUpperCase()}
            </span>
            {done && <span style={{ fontSize: 9, color: '#6A8A5A', letterSpacing: '0.12em',
              background: 'rgba(106,138,90,0.12)', border: '1px solid rgba(106,138,90,0.3)',
              borderRadius: 3, padding: '1px 6px' }}>COMPLETE</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
            {hunt.objective}
          </p>
        </div>
      </div>

      {/* Progress bar — only shown once accepted and multi-step */}
      {isAccepted && hunt.max_progress > 1 && (
        <>
          <div className="ven-progress-track">
            <div style={{ height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${done ? '#6A8A5A' : aColor}60, ${done ? '#6A8A5A' : aColor})`,
              borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{progress} / {hunt.max_progress}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{pct}%</span>
          </div>
        </>
      )}

      {/* Lore */}
      <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic',
        lineHeight: 1.5, margin: '0 0 10px', paddingTop: 8,
        borderTop: '1px solid var(--border)' }}>
        "{hunt.lore}"
      </p>

      {/* Footer — reward + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, color: aColor, fontWeight: 700, flexShrink: 0 }}>+{hunt.xp_reward} XP</span>
        {!isAccepted && (
          <button className="ven-btn"
            onClick={() => onAccept(hunt.hunt_id)}
            style={{ background: aColor, color: '#0B0A08', border: 'none' }}>
            Accept Hunt
          </button>
        )}
        {isAccepted && !done && (
          <div style={{ display: 'flex', gap: 8 }}>
            {hunt.max_progress > 1 && (
              <button className="ven-btn"
                onClick={() => onProgress(hunt)}
                style={{ background: aColor, color: '#0B0A08', border: 'none' }}>
                + Progress
              </button>
            )}
            <button className="ven-btn"
              onClick={() => onAbandon(hunt.hunt_id)}
              style={{ background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
              Abandon
            </button>
          </div>
        )}
        {done && (
          <span style={{ fontSize: 11, color: '#6A8A5A', fontFamily: 'Cinzel, serif',
            letterSpacing: '0.1em', fontWeight: 700 }}>HUNT COMPLETE</span>
        )}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ fontSize: 28, opacity: 0.3, marginBottom: 12 }}>{icon}</p>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

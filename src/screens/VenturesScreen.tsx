// VenturesScreen.tsx — Sprint 20.3 (rev 4)
// Quests · Recon · Hunts
// - Hunt acceptance persisted via localStorage (backend persistence deferred)
// - Sub-tabs use display:none so quest progress survives tab-switching within session
// - Quest complete button appears when parameters met (progress >= max_progress)
// - Reward structure: Quests/Recon → XP + Nexus + Loot Cache | Hunts → XP + Nexus + Alignment Material
// - Adventure Tier derived from hero_level for difficulty display
// - No PVP objectives anywhere in this file

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

function unwrap(json: any): any {
  if (json?.data?.data !== undefined) return json.data.data;
  if (json?.data !== undefined)       return json.data;
  return json;
}

// ── Adventure Tier ────────────────────────────────────────────────────────────
function getAdventureTier(level: number): { tier: number; label: string; color: string } {
  if (level >= 21) return { tier: 5, label: 'Champion',   color: '#A855F7' };
  if (level >= 16) return { tier: 4, label: 'Veteran',    color: '#EF4444' };
  if (level >= 11) return { tier: 3, label: 'Journeyman', color: '#FFA500' };
  if (level >= 6)  return { tier: 2, label: 'Apprentice', color: '#1E90FF' };
  return             { tier: 1, label: 'Novice',     color: '#22C55E' };
}

// ── Alignment materials ───────────────────────────────────────────────────────
const ALIGNMENT_MATERIAL: Record<string, string> = {
  ORDER: 'Iron Mandate',
  CHAOS: 'Fracture Shard',
  LIGHT: 'Radiant Core',
  DARK:  'Shadow Residue',
  NONE:  'Unknown Material',
};

// ── Design tokens ─────────────────────────────────────────────────────────────
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
const HUNT_TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  veil_tear: { label: 'Veil Tear', icon: '⚡', color: '#A855F7' },
  component: { label: 'Component', icon: '⬡',  color: '#1E90FF' },
  enemy:     { label: 'Enemy',     icon: '☠',  color: '#EF4444' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface DailyQuest {
  quest_id: string;
  title: string;
  objective: string;
  category: string;
  completion_hint: string;
  max_progress: number;
  xp_reward: number;
  nexus_reward: number;
  loot_cache: string;
  lore: string;
  progress: number;
  status: 'active' | 'completed' | 'abandoned';
}
interface ScoutingMission {
  mission_id: string;
  title: string;
  objective: string;
  distance_m: number;
  xp_reward: number;
  nexus_reward: number;
  loot_cache: string;
  expires_hours: number;
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
  nexus_reward: number;
  alignment_material_qty: number;
  lore: string;
  icon: string;
}
interface AcceptedHunt {
  progress: number;
  status: 'active' | 'completed';
}

type SubTab = 'quests' | 'recon' | 'hunts';

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadAccepted(rootId: string | null): Record<string, AcceptedHunt> {
  if (!rootId) return {};
  try {
    const raw = localStorage.getItem(`pik_hunts_${rootId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveAccepted(rootId: string | null, state: Record<string, AcceptedHunt>) {
  if (!rootId) return;
  try { localStorage.setItem(`pik_hunts_${rootId}`, JSON.stringify(state)); } catch {}
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function VenturesScreen() {
  const { hero, sessionToken } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('quests');

  const rootId    = (hero as any)?.root_id ?? null;
  const alignment = (hero as any)?.fate_alignment ?? (hero as any)?.alignment ?? 'NONE';
  const heroLevel = (hero as any)?.hero_level ?? (hero as any)?.progression?.hero_level ?? 1;
  const tier      = getAdventureTier(heroLevel);

  // ── Lifted hunt acceptance — persisted via localStorage ───────────────────
  const [acceptedHunts, setAcceptedHuntsRaw] = useState<Record<string, AcceptedHunt>>(
    () => loadAccepted(rootId)
  );
  const prevRootId = useRef(rootId);
  useEffect(() => {
    if (rootId !== prevRootId.current) {
      prevRootId.current = rootId;
      setAcceptedHuntsRaw(loadAccepted(rootId));
    }
  }, [rootId]);

  function setAcceptedHunts(updater: (prev: Record<string, AcceptedHunt>) => Record<string, AcceptedHunt>) {
    setAcceptedHuntsRaw(prev => {
      const next = updater(prev);
      saveAccepted(rootId, next);
      return next;
    });
  }

  const handleHuntAccept   = (huntId: string) =>
    setAcceptedHunts(a => ({ ...a, [huntId]: { progress: 0, status: 'active' } }));
  const handleHuntAbandon  = (huntId: string) =>
    setAcceptedHunts(a => { const n = { ...a }; delete n[huntId]; return n; });
  const handleHuntProgress = (hunt: Hunt) => {
    const cur  = acceptedHunts[hunt.hunt_id]?.progress ?? 0;
    const next = Math.min(cur + 1, hunt.max_progress);
    const status = next >= hunt.max_progress ? 'completed' : 'active';
    setAcceptedHunts(a => ({ ...a, [hunt.hunt_id]: { progress: next, status } }));
  };

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
          font-family: var(--font-serif, Cinzel, serif); transition: color 0.15s; }
        .ven-card { background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius, 10px); padding: 16px; margin-bottom: 10px; }
        .ven-progress-track { height: 5px; background: rgba(255,255,255,0.06);
          border-radius: 3px; overflow: hidden; margin: 10px 0 4px; }
        @keyframes ventureIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .venture-enter { animation: ventureIn 0.25s ease both; }
        .ven-btn { border-radius: 6px; font-family: var(--font-serif, Cinzel, serif); font-size: 10px;
          font-weight: 700; letter-spacing: 0.06em; cursor: pointer; padding: 7px 14px;
          transition: opacity 0.15s; }
        .ven-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ven-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 20px 100px; }
        .ven-section-label { font-size: 10px; color: var(--text-3); letter-spacing: 0.14em;
          font-weight: 700; font-family: Cinzel, serif; margin: 0 0 10px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '48px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 className="serif-bold" style={{ fontSize: 26, color: 'var(--gold)', letterSpacing: '0.18em', margin: 0 }}>VENTURES</h2>
          <span style={{ fontSize: 9, color: tier.color, letterSpacing: '0.12em', fontFamily: 'Cinzel, serif',
            fontWeight: 700, background: `${tier.color}12`, border: `1px solid ${tier.color}30`,
            borderRadius: 4, padding: '2px 7px' }}>
            T{tier.tier} {tier.label.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', marginTop: 2 }}>Quests · Recon · Hunts</p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', margin: '16px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {subTabs.map(t => (
          <button key={t.id} className="ven-subtab" onClick={() => setSubTab(t.id)}
            style={{ color: subTab === t.id ? 'var(--gold)' : 'var(--text-3)',
              borderBottom: subTab === t.id ? '2px solid var(--gold)' : '2px solid transparent' }}>
            {t.icon} {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* display:none keeps all three mounted — state survives tab-switching */}
      <div className="ven-scroll">
        <div style={{ display: subTab === 'quests' ? 'block' : 'none' }}>
          <QuestsView rootId={rootId} sessionToken={sessionToken} tier={tier} />
        </div>
        <div style={{ display: subTab === 'recon' ? 'block' : 'none' }}>
          <ReconView rootId={rootId} sessionToken={sessionToken} tier={tier} />
        </div>
        <div style={{ display: subTab === 'hunts' ? 'block' : 'none' }}>
          <HuntsView
            rootId={rootId} sessionToken={sessionToken}
            alignment={alignment} heroLevel={heroLevel}
            accepted={acceptedHunts}
            onAccept={handleHuntAccept}
            onAbandon={handleHuntAbandon}
            onProgress={handleHuntProgress}
          />
        </div>
      </div>
    </div>
  );
}

// ── QUESTS VIEW ───────────────────────────────────────────────────────────────
function QuestsView({ rootId, sessionToken, tier }: {
  rootId: string | null;
  sessionToken: string | null;
  tier: ReturnType<typeof getAdventureTier>;
}) {
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
      const initialised = (Array.isArray(data) ? data : []).map((q: any) => ({
        ...q, progress: q.progress ?? 0, status: q.status ?? 'active',
      }));
      setQuests(initialised);
    } catch { setError('Could not load daily quests.'); }
    finally { setLoading(false); }
  }, [rootId]);

  useEffect(() => { load(); }, [load]);

  const handleProgress = async (quest: DailyQuest) => {
    if (quest.status !== 'active' || quest.progress >= quest.max_progress) return;
    const next = quest.progress + 1;
    setQuests(qs => qs.map(q => q.quest_id === quest.quest_id ? { ...q, progress: next } : q));
    try {
      await fetch(`${BASE}/api/ventures/quests/${rootId}/${quest.quest_id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
        body: JSON.stringify({ increment: 1 }),
      });
    } catch {}
  };

  const handleComplete = async (quest: DailyQuest) => {
    if (quest.progress < quest.max_progress) return;
    setQuests(qs => qs.map(q => q.quest_id === quest.quest_id ? { ...q, status: 'completed' } : q));
    try {
      await fetch(`${BASE}/api/ventures/quests/${rootId}/${quest.quest_id}/complete`, {
        method: 'POST',
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
    } catch {}
  };

  const handleAbandon = async (quest: DailyQuest) => {
    setQuests(qs => qs.filter(q => q.quest_id !== quest.quest_id));
    try {
      await fetch(`${BASE}/api/ventures/quests/${rootId}/${quest.quest_id}/abandon`, {
        method: 'POST',
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
    } catch {}
  };

  if (loading) return <VentureSkeleton />;
  if (error)   return <EmptyState icon="◈" title="Quests Unavailable" body={error} />;
  if (quests.length === 0) return <EmptyState icon="◈" title="No Active Quests" body="Daily quests refresh at midnight UTC." />;

  const now      = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diffMs   = midnight.getTime() - now.getTime();
  const hh = Math.floor(diffMs / 3_600_000);
  const mm = Math.floor((diffMs % 3_600_000) / 60_000);

  return (
    <div className="venture-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="ven-section-label" style={{ margin: 0 }}>DAILY QUESTS</p>
        <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace', margin: 0 }}>
          Resets in {hh}h {mm}m
        </p>
      </div>
      {quests.map(q => (
        <QuestCard key={q.quest_id} quest={q} tier={tier}
          onProgress={handleProgress} onComplete={handleComplete} onAbandon={handleAbandon} />
      ))}
    </div>
  );
}

function QuestCard({ quest, tier, onProgress, onComplete, onAbandon }: {
  quest: DailyQuest;
  tier: ReturnType<typeof getAdventureTier>;
  onProgress: (q: DailyQuest) => void;
  onComplete: (q: DailyQuest) => void;
  onAbandon:  (q: DailyQuest) => void;
}) {
  const [rewardOpen, setRewardOpen] = useState(false);
  const pct       = Math.min(100, Math.round((quest.progress / quest.max_progress) * 100));
  const done      = quest.status === 'completed';
  const ready     = !done && quest.progress >= quest.max_progress;
  const accentClr = done ? '#6A8A5A' : ready ? '#22C55E' : '#FFA500';

  return (
    <div className="ven-card" style={{
      borderColor: done ? 'rgba(106,138,90,0.35)' : ready ? 'rgba(34,197,94,0.4)' : 'var(--border)',
      background:  done ? 'rgba(106,138,90,0.06)' : ready ? 'rgba(34,197,94,0.04)' : 'var(--surface)',
    }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            color: done ? '#6A8A5A' : ready ? '#22C55E' : 'var(--text-1)', margin: 0 }}>
            {quest.title}
          </p>
          <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.1em',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>
            {quest.category?.toUpperCase() ?? 'QUEST'}
          </span>
          {ready && <span style={{ fontSize: 9, color: '#22C55E', letterSpacing: '0.12em',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 3, padding: '1px 6px', fontWeight: 700 }}>READY</span>}
          {done && <span style={{ fontSize: 9, color: '#6A8A5A', letterSpacing: '0.12em',
            background: 'rgba(106,138,90,0.12)', border: '1px solid rgba(106,138,90,0.3)',
            borderRadius: 3, padding: '1px 6px' }}>COMPLETE</span>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.45 }}>{quest.objective}</p>
        {ready && (
          <p style={{ fontSize: 11, color: '#22C55E', margin: '5px 0 0', fontStyle: 'italic' }}>
            ✓ {quest.completion_hint}
          </p>
        )}
      </div>

      <div className="ven-progress-track">
        <div style={{ height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${accentClr}60, ${accentClr})`,
          borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{quest.progress} / {quest.max_progress}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{pct}%</span>
      </div>

      {!done && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {ready ? (
            <button className="ven-btn" onClick={() => onComplete(quest)}
              style={{ flex: 1, background: '#22C55E', color: '#0B0A08', border: 'none' }}>
              Complete Quest
            </button>
          ) : (
            <button className="ven-btn" onClick={() => onProgress(quest)}
              style={{ flex: 1, background: 'var(--gold)', color: '#0B0A08', border: 'none' }}>
              + Progress
            </button>
          )}
          <button className="ven-btn" onClick={() => onAbandon(quest)}
            style={{ background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            Abandon
          </button>
        </div>
      )}

      <button onClick={() => setRewardOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0 0',
          borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>REWARD</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'inline-block',
          transition: 'transform 0.2s', transform: rewardOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {rewardOpen && (
        <div style={{ paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <RewardRow icon="✦" label={`+${quest.xp_reward} XP`}            color="var(--gold)" />
          <RewardRow icon="⬡" label={`+${quest.nexus_reward} Nexus`}       color="#1E90FF" />
          <RewardRow icon="◈" label={quest.loot_cache}                     color={tier.color} />
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{quest.lore}"
          </p>
        </div>
      )}
    </div>
  );
}

// ── RECON VIEW ────────────────────────────────────────────────────────────────
function ReconView({ rootId, sessionToken, tier }: {
  rootId: string | null;
  sessionToken: string | null;
  tier: ReturnType<typeof getAdventureTier>;
}) {
  const [missions,    setMissions]    = useState<ScoutingMission[]>([]);
  const [intel,       setIntel]       = useState<IntelCard[]>([]);
  const [loading,     setLoading]     = useState(true);
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

  if (loading) return <VentureSkeleton />;

  return (
    <div className="venture-enter">
      <p className="ven-section-label">SCOUTING MISSIONS</p>
      {missions.length === 0 ? (
        <EmptyState icon="◎" title="No Active Missions" body="Scouting missions refresh weekly." />
      ) : (
        <div style={{ marginBottom: 24 }}>
          {missions.map(m => <ScoutingCard key={m.mission_id} mission={m} tier={tier} />)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="ven-section-label" style={{ margin: 0 }}>ZONE INTEL</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'zone', 'boss'] as const).map(f => (
            <button key={f} onClick={() => setIntelFilter(f)}
              style={{ padding: '3px 10px', borderRadius: 999,
                border: `1px solid ${intelFilter === f ? 'var(--gold)' : 'var(--border)'}`,
                background: intelFilter === f ? 'var(--gold)' : 'transparent',
                color: intelFilter === f ? '#0B0A08' : 'var(--text-3)',
                fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {visibleIntel.map(c => <IntelCardView key={c.intel_id} card={c} />)}
    </div>
  );
}

function ScoutingCard({ mission, tier }: {
  mission: ScoutingMission;
  tier: ReturnType<typeof getAdventureTier>;
}) {
  const [rewardOpen, setRewardOpen] = useState(false);
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
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
              color: 'var(--text-1)', margin: 0 }}>{mission.title}</p>
            {mission.distance_m > 0 && (
              <span style={{ fontSize: 10, color: '#1E90FF', fontFamily: 'monospace', flexShrink: 0 }}>{km}</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {mission.objective}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setRewardOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>REWARD</span>
              <span style={{ fontSize: 9, color: 'var(--text-3)', display: 'inline-block',
                transition: 'transform 0.2s', transform: rewardOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Expires {mission.expires_hours}h</span>
          </div>
          {rewardOpen && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 3 }}>
              <RewardRow icon="✦" label={`+${mission.xp_reward} XP`}      color="var(--gold)" />
              <RewardRow icon="⬡" label={`+${mission.nexus_reward} Nexus`} color="#1E90FF" />
              <RewardRow icon="◈" label={mission.loot_cache}               color={tier.color} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntelCardView({ card }: { card: IntelCard }) {
  const [open, setOpen] = useState(false);
  const typeBadge = card.type === 'boss'
    ? { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  label: 'BOSS' }
    : { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  label: 'ZONE' };

  return (
    <div className="ven-card" style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
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
        <span style={{ color: 'var(--text-3)', fontSize: 12, flexShrink: 0, display: 'inline-block',
          transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
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
function HuntsView({ rootId, sessionToken, alignment, heroLevel, accepted, onAccept, onAbandon, onProgress }: {
  rootId: string | null;
  sessionToken: string | null;
  alignment: string;
  heroLevel: number;
  accepted: Record<string, AcceptedHunt>;
  onAccept:   (id: string) => void;
  onAbandon:  (id: string) => void;
  onProgress: (hunt: Hunt) => void;
}) {
  const [hunts,   setHunts]   = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);

  const isLocked    = !alignment || alignment === 'NONE';
  const levelLocked = heroLevel < 20;
  const aColor      = ALIGNMENT_COLOR[alignment] ?? 'var(--text-3)';
  const aGlyph      = ALIGNMENT_GLYPH[alignment] ?? '◇';

  useEffect(() => {
    if (isLocked || levelLocked || !rootId) { setLoading(false); return; }
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
  }, [rootId, alignment, isLocked, levelLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lock screen ────────────────────────────────────────────────────────────
  if (levelLocked || isLocked) {
    const icon    = isLocked ? '◇' : '⚔';
    const heading = isLocked ? 'ALIGNMENT REQUIRED' : 'LEVEL 20 REQUIRED';
    const body1   = isLocked
      ? 'Hunts are alignment-exclusive — each faction wages a different war.'
      : `Hunts unlock at Level 20 upon alignment selection. You are Level ${heroLevel}.`;
    const body2   = isLocked
      ? 'Choose your alignment to unlock hunts specific to your realm.'
      : 'Continue training to unlock Veil Tear encounters, Component collection, and Enemy hunts.';

    return (
      <div className="venture-enter" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(90,90,106,0.1)', border: '1px solid rgba(90,90,106,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{icon}</div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          color: 'var(--text-2)', letterSpacing: '0.12em', margin: '0 0 10px' }}>{heading}</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 8px' }}>{body1}</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 28px' }}>{body2}</p>
        {isLocked && (
          <div style={{ background: 'rgba(200,160,78,0.05)', border: '1px solid rgba(200,160,78,0.15)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'rgba(200,160,78,0.5)',
              letterSpacing: '0.15em', margin: '0 0 10px' }}>ALIGNMENT PATHS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['ORDER','CHAOS','LIGHT','DARK'] as const).map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 8, background: `${ALIGNMENT_COLOR[a]}08`, border: `1px solid ${ALIGNMENT_COLOR[a]}25` }}>
                  <span style={{ fontSize: 14 }}>{ALIGNMENT_GLYPH[a]}</span>
                  <span style={{ fontSize: 11, color: ALIGNMENT_COLOR[a], fontFamily: 'Cinzel, serif',
                    fontWeight: 700, letterSpacing: '0.05em' }}>{ALIGNMENT_LABEL[a]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
          Reach <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Level 20</span> and select your alignment in the{' '}
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Hero tab</span> to unlock Hunts.
        </p>
      </div>
    );
  }

  if (loading) return <VentureSkeleton />;

  const activeHunts    = hunts.filter(h => h.hunt_id in accepted);
  const availableHunts = hunts.filter(h => !(h.hunt_id in accepted));

  return (
    <div className="venture-enter">
      <div style={{ background: `${aColor}0A`, border: `1px solid ${aColor}30`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, color: aColor }}>{aGlyph}</span>
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: aColor,
            letterSpacing: '0.14em', margin: '0 0 2px', fontWeight: 700 }}>{alignment} HUNTS</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
            Seal rifts · Collect components · Defeat enemies
          </p>
        </div>
      </div>

      {activeHunts.length > 0 && (
        <>
          <p className="ven-section-label">ACTIVE HUNTS</p>
          {activeHunts.map(h => (
            <HuntCard key={h.hunt_id} hunt={h} alignment={alignment}
              acceptedState={accepted[h.hunt_id]}
              onAccept={onAccept} onAbandon={onAbandon} onProgress={onProgress} />
          ))}
          {availableHunts.length > 0 && (
            <p className="ven-section-label" style={{ marginTop: 18 }}>AVAILABLE</p>
          )}
        </>
      )}

      {availableHunts.length === 0 && activeHunts.length === 0 ? (
        <EmptyState icon={aGlyph} title="No Hunts Available" body="Alignment hunts are being generated. Check back soon." />
      ) : (
        availableHunts.map(h => (
          <HuntCard key={h.hunt_id} hunt={h} alignment={alignment}
            acceptedState={undefined}
            onAccept={onAccept} onAbandon={onAbandon} onProgress={onProgress} />
        ))
      )}
    </div>
  );
}

function HuntCard({ hunt, alignment, acceptedState, onAccept, onAbandon, onProgress }: {
  hunt: Hunt;
  alignment: string;
  acceptedState: AcceptedHunt | undefined;
  onAccept:   (id: string) => void;
  onAbandon:  (id: string) => void;
  onProgress: (hunt: Hunt) => void;
}) {
  const [rewardOpen, setRewardOpen] = useState(false);
  const aColor     = ALIGNMENT_COLOR[alignment] ?? 'var(--text-3)';
  const dColor     = DIFFICULTY_COLOR[hunt.difficulty] ?? 'var(--text-3)';
  const typeCfg    = HUNT_TYPE_CFG[hunt.type] ?? HUNT_TYPE_CFG.enemy;
  const isAccepted = acceptedState !== undefined;
  const progress   = acceptedState?.progress ?? 0;
  const done       = acceptedState?.status === 'completed';
  const pct        = hunt.max_progress > 1 ? Math.min(100, Math.round((progress / hunt.max_progress) * 100)) : 0;

  return (
    <div className="ven-card" style={{
      borderColor: done ? 'rgba(106,138,90,0.4)' : isAccepted ? `${aColor}50` : 'var(--border)',
      background:  done ? 'rgba(106,138,90,0.06)' : isAccepted ? `${aColor}06` : 'var(--surface)',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10,
          background: `${typeCfg.color}12`, border: `1px solid ${typeCfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0 }}>{typeCfg.icon}</div>
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
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{hunt.objective}</p>
        </div>
      </div>

      {isAccepted && hunt.max_progress > 1 && (
        <>
          <div className="ven-progress-track">
            <div style={{ height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${(done ? '#6A8A5A' : aColor)}60, ${done ? '#6A8A5A' : aColor})`,
              borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{progress} / {hunt.max_progress}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{pct}%</span>
          </div>
        </>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic',
        lineHeight: 1.5, margin: '0 0 10px', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        "{hunt.lore}"
      </p>

      {/* Reward collapsible */}
      <button onClick={() => setRewardOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px',
          borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>REWARD</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'inline-block',
          transition: 'transform 0.2s', transform: rewardOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {rewardOpen && (
        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <RewardRow icon="✦" label={`+${hunt.xp_reward} XP`}            color="var(--gold)" />
          <RewardRow icon="⬡" label={`+${hunt.nexus_reward} Nexus`}       color="#1E90FF" />
          <RewardRow icon={ALIGNMENT_GLYPH[alignment] ?? '◇'}
            label={`+${hunt.alignment_material_qty}× ${ALIGNMENT_MATERIAL[alignment] ?? 'Alignment Material'}`}
            color={aColor} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {!isAccepted && (
          <button className="ven-btn" onClick={() => onAccept(hunt.hunt_id)}
            style={{ background: aColor, color: '#0B0A08', border: 'none' }}>
            Accept Hunt
          </button>
        )}
        {isAccepted && !done && (
          <>
            {hunt.max_progress > 1 && (
              <button className="ven-btn" onClick={() => onProgress(hunt)}
                style={{ background: aColor, color: '#0B0A08', border: 'none' }}>
                + Progress
              </button>
            )}
            <button className="ven-btn" onClick={() => onAbandon(hunt.hunt_id)}
              style={{ background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
              Abandon
            </button>
          </>
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
function RewardRow({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 12, color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function VentureSkeleton() {
  return (
    <div>
      {[1, 0.7, 0.45].map((op, i) => (
        <div key={i} className="ven-card" style={{ height: 120, opacity: op }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ fontSize: 28, opacity: 0.3, marginBottom: 12 }}>{icon}</p>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

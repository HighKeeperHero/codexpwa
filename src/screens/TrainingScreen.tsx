import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Rite {
  rite_id:     string;
  pillar:      string;
  title:       string;
  description: string;
  lore_text:   string;
  xp_base:     number;
  status:      'pending' | 'completed' | 'skipped';
  xp_granted:  number | null;
}

interface PillarData {
  pillar:          string;
  xp:              number;
  level:           number;
  streak:          number;
  longest_streak:  number;
  title:           string;
  xp_in_level:     number;
  xp_to_next:      number;
  last_activity_at: string | null;
}

interface Oath {
  oath_id:     string;
  pillar:      string;
  declaration: string;
  week_of:     string;
  status:      'pending' | 'kept' | 'broken';
}

interface ChronicleEntry {
  entry_id:      string;
  pillar:        string;
  activity_type: string;
  duration_min:  number | null;
  lore_text:     string;
  xp_granted:    number;
  created_at:    string;
}

// ── Pillar config ─────────────────────────────────────────────────────────────
const PILLAR: Record<string, { label: string; icon: string; color: string; sub: string; desc: string }> = {
  forge: { label:'FORGE', icon:'⚔', color:'#C85E28', sub:'Physical Training',  desc:'Body as weapon. Endurance as creed.'  },
  lore:  { label:'LORE',  icon:'◉', color:'#C8A04E', sub:'Mental Training',    desc:'Knowledge as power. Mind as blade.'   },
  veil:  { label:'VEIL',  icon:'◈', color:'#7A5888', sub:'Spiritual Training', desc:'Stillness as strength. The unseen as guide.' },
};

// ── Oath presets ──────────────────────────────────────────────────────────────
// Curated weekly oaths. XP is set on resolve (kept=xp, broken=−50).
// These match the existing service XP constants (OATH_KEPT=200 for all tiers —
// difficulty here is personal commitment, not variable XP).
const OATH_PRESETS: Record<string, { easy: string[]; medium: string[]; hard: string[] }> = {
  forge: {
    easy: [
      'Walk or move for at least 20 minutes every day this week',
      'Complete at least 3 physical rites this week',
      'Stretch or recover for 10 minutes each day',
    ],
    medium: [
      'Complete a cardio or strength session at least 4 days this week',
      'Train for a minimum of 30 minutes on 4 separate days',
      'Attempt a physical challenge you have been avoiding',
    ],
    hard: [
      'Train every single day this week without missing a day',
      'Complete all 3 daily Forge rites every day this week',
      'Log at least 5 hours of total physical training this week',
    ],
  },
  lore: {
    easy: [
      'Read for at least 20 minutes on 3 days this week',
      'Write in a journal at least twice this week',
      'Listen to one educational podcast or lecture this week',
    ],
    medium: [
      'Read for 30 minutes every day this week',
      'Write every day, even if only a few lines',
      'Learn one new skill or concept and apply it before the week ends',
    ],
    hard: [
      'Complete all 3 daily Lore rites every day this week',
      'Read for at least an hour every day this week',
      'Write 1,000 words before the week ends',
    ],
  },
  veil: {
    easy: [
      'Meditate or sit in silence for 5 minutes on 3 days this week',
      'Perform one act of service for another person this week',
      'Write 5 things you are grateful for on 3 days this week',
    ],
    medium: [
      'Meditate for 10 minutes every day this week',
      'Spend time in nature without a screen at least twice this week',
      'Have one meaningful conversation with someone you trust this week',
    ],
    hard: [
      'Complete all 3 daily Veil rites every day this week',
      'Disconnect from all screens for 2 hours on at least 4 days',
      'Meditate every day and perform an act of service every day',
    ],
  },
};

const DIFFICULTY_LABEL: Record<string, string> = { easy:'EASY', medium:'MEDIUM', hard:'HARD' };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy:'#6A8A5A', medium:'#C8A04E', hard:'#C85E28',
};
const DIFFICULTY_XP: Record<string, number> = { easy:200, medium:200, hard:200 };
// XP is the same (200) — difficulty is about personal commitment,
// not a variable reward that creates an exploit.

type View = 'daily' | 'pillars' | 'oath' | 'chronicle';

// ── Main Component ─────────────────────────────────────────────────────────────
export function TrainingScreen() {
  const { hero } = useAuth();
  const [view,       setView]       = useState<View>('daily');
  const [rites,      setRites]      = useState<Rite[]>([]);
  const [streak,     setStreak]     = useState(0);
  const [pillars,    setPillars]    = useState<PillarData[]>([]);
  const [oath,       setOath]       = useState<Oath | null | undefined>(undefined); // undefined=loading
  const [chronicle,       setChronicle]       = useState<ChronicleEntry[]>([]);
  const [chronicleLoaded, setChronicleLoaded] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; xp?: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  // hero.root_id — safe access
  const rootId = hero?.root_id ?? (hero as any)?.id ?? null;
  // Alignment — handle both field names
  const alignment = (hero as any)?.fate_alignment ?? (hero as any)?.alignment ?? 'NONE';

  const showToast = (msg: string, xp?: number) => {
    setToast({ msg, xp });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDaily = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/daily/${rootId}`);
      if (!res.ok) return;
      const data = await res.json();
      const payload = data?.data ?? data;
      setRites(Array.isArray(payload?.rites) ? payload.rites : []);
      setStreak(typeof payload?.streak === 'number' ? payload.streak : 0);
    } catch {}
  }, [rootId]);

  const fetchPillars = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/pillars/${rootId}`);
      if (!res.ok) return;
      const data = await res.json();
      const payload = data?.data ?? data;
      setPillars(Array.isArray(payload) ? payload : []);
    } catch {}
  }, [rootId]);

  const fetchOath = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}`);
      if (!res.ok) { setOath(null); return; }
      const data = await res.json();
      setOath(data ?? null);
    } catch { setOath(null); }
  }, [rootId]);

  const fetchChronicle = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/chronicle/${rootId}`);
      if (!res.ok) return;
      const data = await res.json();
      const payload = data?.data ?? data;
      setChronicle(Array.isArray(payload) ? payload : []);
      setChronicleLoaded(true);
    } catch {}
  }, [rootId]);

  useEffect(() => {
    if (!rootId) { setLoading(false); return; }
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchDaily(), fetchPillars(), fetchOath()]);
      } catch (e) {
        setError('Could not load training data. Check your connection.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rootId]);

  useEffect(() => {
    if (view === 'chronicle') fetchChronicle();
  }, [view]);

  const completeRite = async (rite: Rite) => {
    if (!rootId || rite.status === 'completed') return;
    setCompleting(rite.rite_id);
    try {
      const res  = await fetch(`${BASE}/api/training/daily/${rootId}/complete`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ rite_id: rite.rite_id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message ?? 'Rite sealed.', data.xp_granted);
        await Promise.all([fetchDaily(), fetchPillars()]);
      } else {
        showToast(data.message ?? 'Could not complete rite.');
      }
    } catch {
      showToast('Connection error. Try again.');
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', paddingBottom:100 }}>
      <style>{`
        .tr-tab { background:none; border:none; cursor:pointer; padding:10px 0; flex:1;
          font-size:9px; letter-spacing:0.12em; font-weight:700;
          font-family:var(--font-serif); transition:color 0.15s; }
        .rite-card { padding:16px; border-radius:12px; transition:all 0.2s;
          border:1px solid var(--border); background:var(--surface); }
        .rite-card.pending { cursor:pointer; }
        .rite-card.pending:active { transform:scale(0.98); }
        .rite-card.completed { border-color:rgba(106,138,90,0.35); background:rgba(106,138,90,0.06); }
        @keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
          background:'rgba(20,18,16,0.97)', border:'1px solid rgba(200,160,78,0.3)',
          borderRadius:12, padding:'12px 20px', zIndex:200,
          display:'flex', alignItems:'center', gap:12,
          animation:'toastIn 0.3s ease',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          maxWidth:340, width:'calc(100% - 48px)',
        }}>
          <span style={{ fontSize:14 }}>◈</span>
          <span style={{ fontSize:13, color:'var(--text-1)', flex:1, lineHeight:1.4 }}>{toast.msg}</span>
          {toast.xp != null && <span style={{ fontSize:13, fontWeight:700, color:'var(--gold)', flexShrink:0 }}>+{toast.xp} XP</span>}
        </div>
      )}

      {/* Header */}
      <div style={{ padding:'48px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
          <div>
            <h2 className="serif-bold" style={{ fontSize:26, color:'var(--gold)', letterSpacing:'0.18em' }}>TRAINING</h2>
            <p style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.08em', marginTop:2 }}>Forge · Lore · Veil</p>
          </div>
          {streak > 0 && (
            <div style={{ padding:'6px 14px', borderRadius:20, background:'rgba(200,160,78,0.08)', border:'1px solid rgba(200,160,78,0.2)', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>🔥</span>
              <span style={{ fontSize:12, color:'var(--gold)', fontWeight:700 }}>{streak}</span>
              <span style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em' }}>STREAK</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{ display:'flex', margin:'16px 20px 0', borderBottom:'1px solid var(--border)' }}>
        {(['daily','pillars','oath','chronicle'] as View[]).map(v => (
          <button key={v} className="tr-tab" onClick={() => setView(v)}
            style={{ color: view===v ? 'var(--gold)' : 'var(--text-3)', position:'relative' }}>
            {v === 'daily' ? 'DAILY RITES' : v === 'pillars' ? 'PILLARS' : v === 'oath' ? 'OATH' : 'CHRONICLE'}
            {view === v && <div style={{ position:'absolute', bottom:-1, left:'15%', right:'15%', height:2, background:'var(--gold)', borderRadius:1 }} />}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 20px 0' }}>
        {view === 'daily'     && <DailyView rites={rites} completing={completing} onComplete={completeRite} />}
        {view === 'pillars'   && <PillarsView pillars={pillars} alignment={alignment} />}
        {view === 'oath'      && <OathView oath={oath} rootId={rootId} onUpdate={async () => { await fetchOath(); }} showToast={showToast} />}
        {view === 'chronicle' && <ChronicleView entries={chronicle} loaded={chronicleLoaded} />}
      </div>
    </div>
  );
}

// ── Daily View ────────────────────────────────────────────────────────────────
function DailyView({ rites, completing, onComplete }: {
  rites: Rite[];
  completing: string | null;
  onComplete: (r: Rite) => void;
}) {
  if (rites.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'48px 0' }}>
        <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.8 }}>
          Daily rites are not yet available.<br />
          <span style={{ fontSize:11 }}>Check back shortly or try refreshing.</span>
        </p>
      </div>
    );
  }

  const completed = rites.filter(r => r.status === 'completed').length;
  const allDone   = completed === 3;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Progress */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.06em' }}>TODAY'S RITES</span>
          <span style={{ fontSize:11, color: allDone ? '#6A8A5A' : 'var(--text-3)', fontWeight:700 }}>
            {completed}/3{allDone ? ' — SEALED ◈' : ''}
          </span>
        </div>
        <div style={{ height:3, background:'var(--border)', borderRadius:2 }}>
          <div style={{
            height:'100%', borderRadius:2,
            width:`${(completed/3)*100}%`,
            background: allDone ? 'linear-gradient(90deg,#6A8A5A,#8AB06A)' : 'linear-gradient(90deg,var(--ember),var(--gold))',
            transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {allDone && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(106,138,90,0.08)', border:'1px solid rgba(106,138,90,0.25)', textAlign:'center' }}>
          <p style={{ fontSize:13, color:'#8AB06A', fontFamily:'var(--font-serif)', lineHeight:1.6 }}>
            All three rites complete. By the Veil, you are attested.<br />
            <span style={{ fontSize:11, color:'var(--text-3)' }}>The day is sealed. Return tomorrow.</span>
          </p>
        </div>
      )}

      {rites.map(rite => {
        const p       = PILLAR[rite.pillar] ?? PILLAR.forge;
        const isDone  = rite.status === 'completed';
        const isBusy  = completing === rite.rite_id;
        return (
          <div key={rite.rite_id} className={`rite-card ${rite.status}`}
            onClick={() => !isDone && !isBusy && !completing && onComplete(rite)}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                background: isDone ? 'rgba(106,138,90,0.15)' : `${p.color}15`,
                border:`1px solid ${isDone ? 'rgba(106,138,90,0.3)' : `${p.color}30`}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:isDone ? 16 : 18,
              }}>
                {isBusy ? <span style={{ fontSize:11, opacity:0.6 }}>…</span> : isDone ? <span style={{ color:'#6A8A5A' }}>✓</span> : p.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:9, color: isDone ? '#6A8A5A' : p.color, letterSpacing:'0.12em', fontWeight:700 }}>{p.label}</span>
                  {isDone && rite.xp_granted != null && <span style={{ fontSize:9, color:'#6A8A5A' }}>+{rite.xp_granted} XP</span>}
                </div>
                <p style={{ fontSize:14, color: isDone ? 'var(--text-3)' : 'var(--text-1)', marginBottom:4, lineHeight:1.3, fontFamily:'var(--font-serif)', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {rite.title}
                </p>
                <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, fontStyle:'italic' }}>
                  "{rite.lore_text}"
                </p>
              </div>
            </div>
            {!isDone && !completing && (
              <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.12)', textAlign:'center' }}>
                <p style={{ fontSize:11, color:'var(--gold)', letterSpacing:'0.06em' }}>
                  By the Veil, I attest this was done — <span style={{ fontWeight:700 }}>SEAL THE RECORD</span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Pillars View ──────────────────────────────────────────────────────────────
function PillarsView({ pillars, alignment }: { pillars: PillarData[]; alignment: string }) {
  if (pillars.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'48px 0' }}>
        <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.8 }}>
          No pillar data yet.<br />
          <span style={{ fontSize:11 }}>Complete your first daily rite to begin tracking pillar progress.</span>
        </p>
      </div>
    );
  }

  const resonanceMap: Record<string, string> = { ORDER:'forge', CHAOS:'lore', LIGHT:'veil', DARK:'all' };
  const resonance = resonanceMap[(alignment ?? '').toUpperCase()] ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {resonance && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.15)', display:'flex', gap:10, alignItems:'center' }}>
          <span>◈</span>
          <p style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.5 }}>
            <span style={{ color:'var(--gold)', fontWeight:700 }}>{(alignment ?? '').toUpperCase()} RESONANCE</span>
            {' — '}
            {resonance === 'all'
              ? 'Complete all 3 daily rites for +50 bonus XP'
              : `+50 bonus XP on ${PILLAR[resonance]?.label ?? ''} rites`}
          </p>
        </div>
      )}

      {pillars.map(p => {
        const cfg = PILLAR[p.pillar] ?? PILLAR.forge;
        const total = (p.xp_in_level ?? 0) + (p.xp_to_next ?? 1);
        const pct   = total > 0 ? Math.round(((p.xp_in_level ?? 0) / total) * 100) : 0;
        const isResonant = resonance === p.pillar || resonance === 'all';
        return (
          <div key={p.pillar} style={{ padding:'18px', borderRadius:14, background:'var(--surface)', border:`1px solid ${isResonant ? `${cfg.color}30` : 'var(--border)'}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:10, flexShrink:0, background:`${cfg.color}12`, border:`1px solid ${cfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span className="serif-bold" style={{ fontSize:16, color:cfg.color, letterSpacing:'0.1em' }}>{cfg.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-3)' }}>Lv {p.level ?? 1}</span>
                </div>
                <p style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{p.title ?? ''}</p>
              </div>
              {(p.streak ?? 0) > 0 && (
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:14 }}>🔥</p>
                  <p style={{ fontSize:10, color:'var(--text-3)' }}>{p.streak}d</p>
                </div>
              )}
            </div>
            <div style={{ height:4, background:'var(--border)', borderRadius:2, marginBottom:5 }}>
              <div style={{ height:'100%', borderRadius:2, width:`${pct}%`, background:cfg.color, transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:10, color:'var(--text-3)' }}>{(p.xp ?? 0).toLocaleString()} XP total</span>
              <span style={{ fontSize:10, color:'var(--text-3)' }}>{(p.xp_to_next ?? 0).toLocaleString()} to next</span>
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, fontStyle:'italic' }}>"{cfg.desc}"</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Oath View ─────────────────────────────────────────────────────────────────
type OathStep = 'pillar' | 'difficulty' | 'pick' | 'active';
type Difficulty = 'easy' | 'medium' | 'hard';

function OathView({ oath, rootId, onUpdate, showToast }: {
  oath: Oath | null | undefined;
  rootId: string | null;
  onUpdate: () => Promise<void>;
  showToast: (msg: string, xp?: number) => void;
}) {
  const [step,       setStep]       = useState<OathStep>('pillar');
  const [pillar,     setPillar]     = useState<string>('forge');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selected,   setSelected]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  // If oath already active, jump straight to it
  const activeOath = oath?.status === 'pending' ? oath : null;

  const declare = async () => {
    if (!rootId || !selected) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ pillar, declaration: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message ?? 'Oath entered into the Codex.');
        await onUpdate();
      } else {
        showToast(data.message ?? 'Could not declare oath.');
      }
    } catch { showToast('Connection error.'); }
    finally { setLoading(false); }
  };

  const resolve = async (status: 'kept' | 'broken') => {
    if (!rootId || !activeOath) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}/${activeOath.oath_id}/resolve`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, status === 'kept' ? 200 : undefined);
        await onUpdate();
        // Reset step for next week
        setStep('pillar'); setSelected(null);
      } else {
        showToast(data.message ?? 'Could not resolve oath.');
      }
    } catch { showToast('Connection error.'); }
    finally { setLoading(false); }
  };

  if (oath === undefined) return (
    <div style={{ textAlign:'center', padding:'48px 0' }}>
      <p style={{ fontSize:12, color:'var(--text-3)' }}>Loading oath…</p>
    </div>
  );

  // ── Active oath display ────────────────────────────────────────────────────
  if (activeOath) {
    const p = PILLAR[activeOath.pillar] ?? PILLAR.forge;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ padding:'20px', borderRadius:14, background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.2)' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:18 }}>{p.icon}</span>
            <span style={{ fontSize:9, color:p.color, letterSpacing:'0.12em', fontWeight:700 }}>
              {(activeOath.pillar ?? '').toUpperCase()} OATH · WEEK OF {activeOath.week_of}
            </span>
          </div>
          <p style={{ fontSize:16, color:'var(--text-1)', fontFamily:'var(--font-serif)', lineHeight:1.5, fontStyle:'italic' }}>
            "{activeOath.declaration}"
          </p>
          <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10, lineHeight:1.5 }}>
            Your word is entered. The Veil watches. Resolve before the week ends.
          </p>
        </div>

        {/* XP info */}
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(106,138,90,0.08)', border:'1px solid rgba(106,138,90,0.2)', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#8AB06A', fontWeight:700 }}>+200 XP</p>
            <p style={{ fontSize:9, color:'var(--text-3)', marginTop:2 }}>IF KEPT</p>
          </div>
          <div style={{ flex:1, padding:'10px', borderRadius:10, background:'rgba(200,94,40,0.06)', border:'1px solid rgba(200,94,40,0.15)', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'var(--ember)', fontWeight:700 }}>−50 XP</p>
            <p style={{ fontSize:9, color:'var(--text-3)', marginTop:2 }}>VEIL DEBT IF BROKEN</p>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => resolve('kept')} disabled={loading} style={{ flex:1, padding:'15px', borderRadius:10, cursor:'pointer', background:'rgba(106,138,90,0.15)', border:'1px solid rgba(106,138,90,0.35)', color:'#8AB06A', fontSize:12, fontWeight:700, letterSpacing:'0.08em' }}>
            ✓ OATH KEPT
          </button>
          <button onClick={() => resolve('broken')} disabled={loading} style={{ flex:1, padding:'15px', borderRadius:10, cursor:'pointer', background:'rgba(200,94,40,0.08)', border:'1px solid rgba(200,94,40,0.2)', color:'var(--ember)', fontSize:12, fontWeight:700, letterSpacing:'0.08em' }}>
            ✗ OATH BROKEN
          </button>
        </div>
      </div>
    );
  }

  // ── Oath builder: STEP 1 — pillar ──────────────────────────────────────────
  if (step === 'pillar') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ padding:'4px 0 8px' }}>
        <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>
          Declare a weekly oath — a commitment to yourself, entered into the Codex. Choose your pillar, your level of commitment, then select your oath.
        </p>
      </div>
      <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.12em' }}>STEP 1 OF 3 — CHOOSE PILLAR</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {Object.entries(PILLAR).map(([key, cfg]) => (
          <button key={key} onClick={() => { setPillar(key); setStep('difficulty'); }} style={{
            width:'100%', padding:'16px 18px', borderRadius:12, cursor:'pointer', textAlign:'left',
            background: pillar === key ? `${cfg.color}12` : 'var(--surface)',
            border:`1px solid ${cfg.color}35`,
            display:'flex', alignItems:'center', gap:14, transition:'all 0.15s',
          }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{cfg.icon}</span>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:cfg.color, letterSpacing:'0.08em', fontFamily:'var(--font-serif)' }}>{cfg.label}</p>
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{cfg.sub}</p>
            </div>
            <span style={{ marginLeft:'auto', color:'var(--text-3)', fontSize:16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Oath builder: STEP 2 — difficulty ─────────────────────────────────────
  if (step === 'difficulty') return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <button onClick={() => setStep('pillar')} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:12, cursor:'pointer', textAlign:'left', padding:'0 0 4px', letterSpacing:'0.05em' }}>← Back</button>
      <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.12em' }}>STEP 2 OF 3 — CHOOSE COMMITMENT LEVEL</p>
      <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>All oaths grant the same XP reward — difficulty is a personal standard, not a variable prize. Choose honestly.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {(['easy','medium','hard'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => { setDifficulty(d); setStep('pick'); setSelected(null); }} style={{
            width:'100%', padding:'16px 18px', borderRadius:12, cursor:'pointer', textAlign:'left',
            background:'var(--surface)', border:`1px solid ${DIFFICULTY_COLOR[d]}35`,
            display:'flex', alignItems:'center', gap:14, transition:'all 0.15s',
          }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:DIFFICULTY_COLOR[d], flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight:700, color:DIFFICULTY_COLOR[d], letterSpacing:'0.08em' }}>{DIFFICULTY_LABEL[d]}</span>
                <span style={{ fontSize:10, color:'var(--gold)' }}>+{DIFFICULTY_XP[d]} XP if kept</span>
              </div>
              <p style={{ fontSize:11, color:'var(--text-3)' }}>
                {d === 'easy'   ? 'A manageable weekly commitment — build the habit first' :
                 d === 'medium' ? 'A real challenge that demands consistent effort'        :
                                  'A full-week test of will — for those who mean it'}
              </p>
            </div>
            <span style={{ color:'var(--text-3)', fontSize:16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Oath builder: STEP 3 — pick oath ──────────────────────────────────────
  if (step === 'pick') {
    const options = OATH_PRESETS[pillar]?.[difficulty] ?? [];
    const cfg     = PILLAR[pillar] ?? PILLAR.forge;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <button onClick={() => setStep('difficulty')} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:12, cursor:'pointer', textAlign:'left', padding:'0 0 4px', letterSpacing:'0.05em' }}>← Back</button>
        <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.12em' }}>
          STEP 3 OF 3 — {cfg.label} · {DIFFICULTY_LABEL[difficulty]}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {options.map(o => (
            <button key={o} onClick={() => setSelected(selected === o ? null : o)} style={{
              width:'100%', padding:'16px', borderRadius:12, cursor:'pointer', textAlign:'left',
              background: selected === o ? `${cfg.color}12` : 'var(--surface)',
              border:`1px solid ${selected === o ? `${cfg.color}50` : 'var(--border)'}`,
              transition:'all 0.15s',
            }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selected === o ? cfg.color : 'var(--border)'}`, background: selected === o ? `${cfg.color}30` : 'transparent', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {selected === o && <span style={{ fontSize:10, color:cfg.color }}>✓</span>}
                </div>
                <p style={{ fontSize:13, color: selected === o ? 'var(--text-1)' : 'var(--text-2)', lineHeight:1.5 }}>{o}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={declare} disabled={!selected || loading} style={{
          width:'100%', padding:'15px', borderRadius:10,
          cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? 'var(--gold)' : 'rgba(200,160,78,0.2)',
          border:'none', color: selected ? 'var(--bg)' : 'var(--text-3)',
          fontSize:12, fontWeight:700, letterSpacing:'0.12em', transition:'all 0.2s',
        }}>
          {loading ? 'RECORDING…' : 'ENTER INTO THE CODEX'}
        </button>
        <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', lineHeight:1.5 }}>
          "Your word is entered. The Veil watches."
        </p>
      </div>
    );
  }

  return null;
}

// ── Chronicle View ────────────────────────────────────────────────────────────
function ChronicleView({ entries, loaded }: { entries: ChronicleEntry[]; loaded: boolean }) {
  if (!loaded) {
    return (
      <div style={{ textAlign:'center', padding:'48px 20px' }}>
        <p style={{ fontSize:12, color:'var(--text-3)' }}>Loading Chronicle…</p>
      </div>
    );
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'48px 20px' }}>
        <p style={{ fontSize:30, marginBottom:14, opacity:0.3 }}>◈</p>
        <p style={{ fontSize:14, color:'var(--text-2)', fontFamily:'var(--font-serif)', marginBottom:8 }}>
          The Chronicle Awaits
        </p>
        <p style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.8 }}>
          Your record is empty.<br />
          Complete a daily rite to write your first entry.<br />
          <span style={{ fontSize:11, opacity:0.7 }}>Every act sealed here is permanent.</span>
        </p>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {entries.map((e, idx) => {
        const cfg     = PILLAR[e?.pillar ?? ''] ?? PILLAR.forge;
        const dateStr = e?.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
        return (
          <div key={e?.entry_id ?? idx} style={{ padding:'14px 16px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', marginTop:6, flexShrink:0, background:cfg.color, boxShadow:`0 0 6px ${cfg.color}50` }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, color:'var(--text-1)', lineHeight:1.5, fontStyle:'italic' }}>{e?.lore_text ?? ''}</p>
              <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:9, color:cfg.color, letterSpacing:'0.1em', fontWeight:700 }}>{cfg.label}</span>
                {dateStr && <><span style={{ fontSize:9, color:'var(--text-3)' }}>·</span><span style={{ fontSize:9, color:'var(--text-3)' }}>{dateStr}</span></>}
                {(e?.xp_granted ?? 0) > 0 && <><span style={{ fontSize:9, color:'var(--text-3)' }}>·</span><span style={{ fontSize:9, color:'var(--gold)', fontWeight:700 }}>+{e.xp_granted} XP</span></>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', padding:'48px 20px', paddingBottom:100 }}>
      {[1,0.7,0.5].map((op,i) => (
        <div key={i} style={{ height:96, borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', marginBottom:12, opacity:op }} />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:24, marginBottom:12, opacity:0.4 }}>◈</p>
        <p style={{ fontSize:13, color:'var(--ember)', lineHeight:1.7 }}>{message}</p>
      </div>
    </div>
  );
}

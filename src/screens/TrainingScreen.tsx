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
const PILLAR = {
  forge: { label: 'FORGE',   icon: '⚔', color: '#C85E28', sub: 'Physical Training',  desc: 'Body as weapon. Endurance as creed.' },
  lore:  { label: 'LORE',    icon: '📖', color: '#C8A04E', sub: 'Mental Training',    desc: 'Knowledge as power. Mind as blade.' },
  veil:  { label: 'VEIL',    icon: '◈',  color: '#7A5888', sub: 'Spiritual Training', desc: 'Stillness as strength. The unseen as guide.' },
} as const;

type PillarKey = keyof typeof PILLAR;

// ── Sub-views ─────────────────────────────────────────────────────────────────
type View = 'daily' | 'pillars' | 'oath' | 'chronicle';

// ── Main Component ─────────────────────────────────────────────────────────────
export function TrainingScreen() {
  const { hero } = useAuth();
  const [view,       setView]       = useState<View>('daily');
  const [rites,      setRites]      = useState<Rite[]>([]);
  const [streak,     setStreak]     = useState(0);
  const [pillars,    setPillars]    = useState<PillarData[]>([]);
  const [oath,       setOath]       = useState<Oath | null>(null);
  const [chronicle,  setChronicle]  = useState<ChronicleEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; xp?: number } | null>(null);

  const rootId = hero?.root_id;

  const showToast = (msg: string, xp?: number) => {
    setToast({ msg, xp });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch daily rites ───────────────────────────────────────────────────────
  const fetchDaily = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/daily/${rootId}`);
      const data = await res.json();
      setRites(data.rites ?? []);
      setStreak(data.streak ?? 0);
    } catch {}
  }, [rootId]);

  // ── Fetch pillars ───────────────────────────────────────────────────────────
  const fetchPillars = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/pillars/${rootId}`);
      const data = await res.json();
      setPillars(data ?? []);
    } catch {}
  }, [rootId]);

  // ── Fetch oath ──────────────────────────────────────────────────────────────
  const fetchOath = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}`);
      const data = await res.json();
      setOath(data ?? null);
    } catch {}
  }, [rootId]);

  // ── Fetch chronicle ─────────────────────────────────────────────────────────
  const fetchChronicle = useCallback(async () => {
    if (!rootId) return;
    try {
      const res  = await fetch(`${BASE}/api/training/chronicle/${rootId}`);
      const data = await res.json();
      setChronicle(data ?? []);
    } catch {}
  }, [rootId]);

  useEffect(() => {
    if (!rootId) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDaily(), fetchPillars(), fetchOath()]);
      setLoading(false);
    };
    init();
  }, [rootId]);

  useEffect(() => {
    if (view === 'chronicle') fetchChronicle();
  }, [view]);

  // ── Complete a rite ─────────────────────────────────────────────────────────
  const completeRite = async (rite: Rite) => {
    if (!rootId || rite.status === 'completed') return;
    setCompleting(rite.rite_id);
    try {
      const res  = await fetch(`${BASE}/api/training/daily/${rootId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rite_id: rite.rite_id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message ?? 'Rite complete.', data.xp_granted);
        await fetchDaily();
        await fetchPillars();
      }
    } catch {}
    finally { setCompleting(null); }
  };

  if (loading || !hero) return <TrainingLoadingSkeleton />;

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', paddingBottom:100 }}>
      <style>{`
        .tr-tab { background:none; border:none; cursor:pointer; padding:10px 0; flex:1;
          font-size:9px; letter-spacing:0.12em; font-weight:700; font-family:var(--font-serif);
          transition:color 0.15s; }
        .tr-tab.active { color:var(--gold); }
        .tr-tab.inactive { color:var(--text-3); }
        .rite-card { padding:16px; border-radius:12px; border:1px solid var(--border);
          background:var(--surface); transition:all 0.2s; }
        .rite-card.pending { cursor:pointer; }
        .rite-card.pending:active { transform:scale(0.98); }
        .rite-card.completed { border-color:rgba(106,138,90,0.35); background:rgba(106,138,90,0.06); }
        .pillar-bar-fill { height:4px; border-radius:2px; transition:width 0.6s cubic-bezier(0.16,1,0.3,1); }
        @keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
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
          <span style={{ fontSize:16 }}>◈</span>
          <span style={{ fontSize:13, color:'var(--text-1)', flex:1, lineHeight:1.4 }}>{toast.msg}</span>
          {toast.xp && (
            <span style={{ fontSize:13, fontWeight:700, color:'var(--gold)', flexShrink:0 }}>+{toast.xp} XP</span>
          )}
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
            <div style={{
              padding:'6px 14px', borderRadius:20,
              background:'rgba(200,160,78,0.08)', border:'1px solid rgba(200,160,78,0.2)',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ fontSize:14 }}>🔥</span>
              <span style={{ fontSize:12, color:'var(--gold)', fontWeight:700 }}>{streak}</span>
              <span style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em' }}>STREAK</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{
        display:'flex', margin:'16px 20px 0',
        borderBottom:'1px solid var(--border)',
      }}>
        {(['daily','pillars','oath','chronicle'] as View[]).map(v => (
          <button key={v} className={`tr-tab ${view === v ? 'active' : 'inactive'}`}
            onClick={() => setView(v)}
            style={{ position:'relative' }}
          >
            {v === 'daily'    ? 'DAILY RITES' :
             v === 'pillars'  ? 'PILLARS'     :
             v === 'oath'     ? 'OATH'        : 'CHRONICLE'}
            {view === v && (
              <div style={{
                position:'absolute', bottom:-1, left:'15%', right:'15%',
                height:2, background:'var(--gold)', borderRadius:1,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:'20px 20px 0' }}>
        {view === 'daily'    && <DailyRitesView rites={rites} completing={completing} onComplete={completeRite} />}
        {view === 'pillars'  && <PillarsView pillars={pillars} hero={hero} />}
        {view === 'oath'     && <OathView oath={oath} rootId={rootId!} onUpdate={async () => { await fetchOath(); }} showToast={showToast} />}
        {view === 'chronicle' && <ChronicleView entries={chronicle} />}
      </div>
    </div>
  );
}

// ── Daily Rites View ──────────────────────────────────────────────────────────
function DailyRitesView({ rites, completing, onComplete }: {
  rites: Rite[];
  completing: string | null;
  onComplete: (r: Rite) => void;
}) {
  const completed = rites.filter(r => r.status === 'completed').length;
  const allDone   = completed === 3;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Progress bar */}
      <div style={{ marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.06em' }}>TODAY'S RITES</span>
          <span style={{ fontSize:11, color: allDone ? '#6A8A5A' : 'var(--text-3)', fontWeight:700 }}>
            {completed}/3 {allDone ? '— SEALED ◈' : ''}
          </span>
        </div>
        <div style={{ height:3, background:'var(--border)', borderRadius:2 }}>
          <div style={{
            height:'100%', borderRadius:2,
            width:`${(completed/3)*100}%`,
            background: allDone
              ? 'linear-gradient(90deg, #6A8A5A, #8AB06A)'
              : 'linear-gradient(90deg, var(--ember), var(--gold))',
            transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {allDone && (
        <div style={{
          padding:'14px 16px', borderRadius:12,
          background:'rgba(106,138,90,0.08)', border:'1px solid rgba(106,138,90,0.25)',
          textAlign:'center',
        }}>
          <p style={{ fontSize:13, color:'#8AB06A', fontFamily:'var(--font-serif)', lineHeight:1.5 }}>
            All three rites complete. By the Veil, you are attested.<br />
            <span style={{ fontSize:11, color:'var(--text-3)' }}>The day is sealed. Return tomorrow.</span>
          </p>
        </div>
      )}

      {/* Rite cards */}
      {rites.map(rite => {
        const p = PILLAR[rite.pillar as PillarKey];
        const isDone    = rite.status === 'completed';
        const isLoading = completing === rite.rite_id;
        return (
          <div key={rite.rite_id} className={`rite-card ${rite.status}`}
            onClick={() => !isDone && !isLoading && !completing && onComplete(rite)}
          >
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                background: isDone ? 'rgba(106,138,90,0.15)' : `${p.color}15`,
                border:`1px solid ${isDone ? 'rgba(106,138,90,0.3)' : `${p.color}30`}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
              }}>
                {isLoading ? (
                  <span style={{ fontSize:12, animation:'pulse 1s infinite' }}>…</span>
                ) : isDone ? (
                  <span style={{ color:'#6A8A5A', fontSize:16 }}>✓</span>
                ) : p.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:9, color: isDone ? '#6A8A5A' : p.color, letterSpacing:'0.12em', fontWeight:700 }}>
                    {p.label}
                  </span>
                  {isDone && rite.xp_granted && (
                    <span style={{ fontSize:9, color:'#6A8A5A', letterSpacing:'0.06em' }}>+{rite.xp_granted} XP</span>
                  )}
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
              <div style={{
                marginTop:12, padding:'10px 14px', borderRadius:8,
                background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.12)',
                textAlign:'center',
              }}>
                <p style={{ fontSize:11, color:'var(--gold)', letterSpacing:'0.08em' }}>
                  By the Veil, I attest this was done — <span style={{ fontWeight:700 }}>SEAL THE RECORD</span>
                </p>
              </div>
            )}
          </div>
        );
      })}

      {rites.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-3)' }}>
          <p style={{ fontSize:13 }}>Loading your rites…</p>
        </div>
      )}
    </div>
  );
}

// ── Pillars View ──────────────────────────────────────────────────────────────
function PillarsView({ pillars, hero }: { pillars: PillarData[]; hero: any }) {
  const alignment = hero?.alignment ?? 'NONE';
  const resonanceMap: Record<string, string> = {
    ORDER: 'forge', CHAOS: 'lore', LIGHT: 'veil', DARK: 'all',
  };
  const resonance = resonanceMap[alignment.toUpperCase()] ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Alignment resonance badge */}
      {resonance && (
        <div style={{
          padding:'10px 14px', borderRadius:10,
          background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.15)',
          display:'flex', gap:10, alignItems:'center',
        }}>
          <span style={{ fontSize:14 }}>◈</span>
          <p style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.5 }}>
            <span style={{ color:'var(--gold)', fontWeight:700 }}>{alignment} RESONANCE</span>
            {' — '}
            {resonance === 'all'
              ? 'Complete all 3 daily rites for +50 bonus XP'
              : `+50 bonus XP on ${PILLAR[resonance as PillarKey]?.label} rites`}
          </p>
        </div>
      )}

      {pillars.map(p => {
        const cfg = PILLAR[p.pillar as PillarKey];
        const pct = p.xp_to_next > 0 ? Math.round((p.xp_in_level / (p.xp_in_level + p.xp_to_next)) * 100) : 100;
        const isResonant = resonance === p.pillar || resonance === 'all';

        return (
          <div key={p.pillar} style={{
            padding:'18px', borderRadius:14,
            background:'var(--surface)',
            border:`1px solid ${isResonant ? `${cfg.color}30` : 'var(--border)'}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{
                width:44, height:44, borderRadius:10, flexShrink:0,
                background:`${cfg.color}12`, border:`1px solid ${cfg.color}30`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
              }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span className="serif-bold" style={{ fontSize:16, color:cfg.color, letterSpacing:'0.1em' }}>{cfg.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-3)' }}>Lv {p.level}</span>
                </div>
                <p style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{p.title}</p>
              </div>
              {p.streak > 0 && (
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:14 }}>🔥</p>
                  <p style={{ fontSize:10, color:'var(--text-3)', textAlign:'center' }}>{p.streak}d</p>
                </div>
              )}
            </div>

            {/* XP bar */}
            <div style={{ marginBottom:8 }}>
              <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
                <div className="pillar-bar-fill" style={{ width:`${pct}%`, background:cfg.color }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                <span style={{ fontSize:10, color:'var(--text-3)' }}>{p.xp.toLocaleString()} XP total</span>
                <span style={{ fontSize:10, color:'var(--text-3)' }}>{p.xp_to_next.toLocaleString()} to next</span>
              </div>
            </div>

            <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, fontStyle:'italic' }}>"{cfg.desc}"</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Oath View ─────────────────────────────────────────────────────────────────
function OathView({ oath, rootId, onUpdate, showToast }: {
  oath: Oath | null;
  rootId: string;
  onUpdate: () => Promise<void>;
  showToast: (msg: string, xp?: number) => void;
}) {
  const [pillar,      setPillar]      = useState<PillarKey>('forge');
  const [declaration, setDeclaration] = useState('');
  const [loading,     setLoading]     = useState(false);

  const declare = async () => {
    if (!declaration.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillar, declaration: declaration.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message ?? 'Oath declared.');
        await onUpdate();
      }
    } catch {}
    finally { setLoading(false); }
  };

  const resolve = async (status: 'kept' | 'broken') => {
    if (!oath) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/training/oath/${rootId}/${oath.oath_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, status === 'kept' ? 200 : undefined);
        await onUpdate();
      }
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ padding:'12px 0' }}>
        <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>
          Declare a weekly oath — a commitment to yourself, entered into the Codex. If kept, it is sealed with honour. If broken, the Veil records the debt.
        </p>
      </div>

      {!oath || oath.status !== 'pending' ? (
        /* Declare form */
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', gap:8 }}>
            {(['forge','lore','veil'] as PillarKey[]).map(p => {
              const cfg = PILLAR[p];
              const sel = pillar === p;
              return (
                <button key={p} onClick={() => setPillar(p)} style={{
                  flex:1, padding:'12px 0', borderRadius:10, cursor:'pointer',
                  background: sel ? `${cfg.color}18` : 'var(--surface)',
                  border:`1px solid ${sel ? `${cfg.color}50` : 'var(--border)'}`,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  transition:'all 0.15s',
                }}>
                  <span style={{ fontSize:18 }}>{cfg.icon}</span>
                  <span style={{ fontSize:9, color: sel ? cfg.color : 'var(--text-3)', letterSpacing:'0.08em', fontWeight:700 }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <textarea
            value={declaration}
            onChange={e => setDeclaration(e.target.value)}
            placeholder="This week I will…"
            rows={3}
            style={{
              width:'100%', padding:'14px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:10,
              color:'var(--text-1)', fontSize:14, lineHeight:1.6,
              outline:'none', resize:'none', fontFamily:'var(--font-body)',
              boxSizing:'border-box',
            }}
          />

          <button
            onClick={declare}
            disabled={loading || !declaration.trim()}
            style={{
              width:'100%', padding:'15px', borderRadius:10, cursor: declaration.trim() ? 'pointer' : 'not-allowed',
              background: declaration.trim() ? 'var(--gold)' : 'rgba(200,160,78,0.2)',
              border:'none', color: declaration.trim() ? 'var(--bg)' : 'var(--text-3)',
              fontSize:12, fontWeight:700, letterSpacing:'0.12em', transition:'all 0.2s',
            }}
          >
            {loading ? 'RECORDING…' : 'ENTER INTO THE CODEX'}
          </button>
        </div>
      ) : (
        /* Active oath */
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{
            padding:'20px', borderRadius:14,
            background:'rgba(200,160,78,0.06)', border:'1px solid rgba(200,160,78,0.2)',
          }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:18 }}>{PILLAR[oath.pillar as PillarKey]?.icon}</span>
              <span style={{ fontSize:9, color:PILLAR[oath.pillar as PillarKey]?.color ?? 'var(--gold)', letterSpacing:'0.12em', fontWeight:700 }}>
                {oath.pillar.toUpperCase()} OATH · WEEK OF {oath.week_of}
              </span>
            </div>
            <p style={{ fontSize:16, color:'var(--text-1)', fontFamily:'var(--font-serif)', lineHeight:1.5, fontStyle:'italic' }}>
              "{oath.declaration}"
            </p>
            <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10, lineHeight:1.5 }}>
              Your word is entered. The Veil watches. Resolve this oath before the week ends.
            </p>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={() => resolve('kept')}
              disabled={loading}
              style={{
                flex:1, padding:'15px', borderRadius:10, cursor:'pointer',
                background:'rgba(106,138,90,0.15)', border:'1px solid rgba(106,138,90,0.35)',
                color:'#8AB06A', fontSize:12, fontWeight:700, letterSpacing:'0.08em', transition:'all 0.2s',
              }}
            >
              ✓ OATH KEPT
            </button>
            <button
              onClick={() => resolve('broken')}
              disabled={loading}
              style={{
                flex:1, padding:'15px', borderRadius:10, cursor:'pointer',
                background:'rgba(200,94,40,0.08)', border:'1px solid rgba(200,94,40,0.2)',
                color:'var(--ember)', fontSize:12, fontWeight:700, letterSpacing:'0.08em', transition:'all 0.2s',
              }}
            >
              ✗ OATH BROKEN
            </button>
          </div>

          <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', lineHeight:1.5 }}>
            Kept oaths grant +200 XP. Broken oaths incur −50 XP Veil Debt.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Chronicle View ────────────────────────────────────────────────────────────
function ChronicleView({ entries }: { entries: ChronicleEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'48px 20px' }}>
        <p style={{ fontSize:30, marginBottom:14, opacity:0.3 }}>◈</p>
        <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7 }}>
          The Chronicle is empty.<br />Complete your first rite to begin your record.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {entries.map(e => {
        const cfg = PILLAR[e.pillar as PillarKey];
        const date = new Date(e.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
        return (
          <div key={e.entry_id} style={{
            padding:'14px 16px', borderRadius:12,
            background:'var(--surface)', border:'1px solid var(--border)',
            display:'flex', gap:12, alignItems:'flex-start',
          }}>
            <div style={{
              width:8, height:8, borderRadius:'50%', marginTop:6, flexShrink:0,
              background: cfg?.color ?? 'var(--gold)',
              boxShadow:`0 0 6px ${cfg?.color ?? 'var(--gold)'}50`,
            }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, color:'var(--text-1)', lineHeight:1.5, fontStyle:'italic' }}>
                {e.lore_text}
              </p>
              <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
                <span style={{ fontSize:9, color:cfg?.color ?? 'var(--gold)', letterSpacing:'0.1em', fontWeight:700 }}>{cfg?.label ?? e.pillar.toUpperCase()}</span>
                <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                <span style={{ fontSize:9, color:'var(--text-3)' }}>{dateStr}</span>
                {e.xp_granted > 0 && (
                  <>
                    <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                    <span style={{ fontSize:9, color:'var(--gold)', fontWeight:700 }}>+{e.xp_granted} XP</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function TrainingLoadingSkeleton() {
  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', padding:'48px 20px', paddingBottom:100 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          height:100, borderRadius:12, background:'var(--surface)',
          border:'1px solid var(--border)', marginBottom:12,
          opacity: 1 - i * 0.2,
        }} />
      ))}
    </div>
  );
}

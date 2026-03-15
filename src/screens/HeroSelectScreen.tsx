import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL, generateNarrative } from '@/api/pik';

const HERO_LIMIT = 2;

interface Props {
  onHeroSelected: () => void;
  onSignOut:      () => void;
}

type View = 'select' | 'create' | 'backstory';

export function HeroSelectScreen({ onHeroSelected, onSignOut }: Props) {
  const { account, heroes, selectHero, createHero, refreshHeroes } = useAuth();
  const [view,       setView]       = useState<View>('select');
  const [heroName,   setHeroName]   = useState('');
  const [nameState,  setNameState]  = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [selecting,  setSelecting]  = useState<string | null>(null);
  const [entered,    setEntered]    = useState(false);
  const [rerolls,    setRerolls]    = useState(0);
  const [narrative,  setNarrative]  = useState<ReturnType<typeof generateNarrative> | null>(null);
  // hero_level is not in the list endpoint — fetch detail per hero to get accurate levels
  const [heroDetails, setHeroDetails] = useState<Record<string, { hero_level: number; fate_level: number }>>({});

  const BASE = 'https://pik-prd-production.up.railway.app';

  useEffect(() => {
    refreshHeroes();
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Fetch full detail for each hero once the list loads
  useEffect(() => {
    if (!heroes.length) return;
    heroes.forEach(h => {
      fetch(`${BASE}/api/users/${h.root_id}`)
        .then(r => r.json())
        .then(json => {
          const d = json?.data?.data ?? json?.data ?? json;
          const heroLevel = d?.progression?.hero_level ?? d?.hero_level ?? null;
          const fateLevel = d?.progression?.fate_level ?? d?.fate_level ?? null;
          if (heroLevel !== null || fateLevel !== null) {
            setHeroDetails(prev => ({
              ...prev,
              [h.root_id]: {
                hero_level: heroLevel ?? h.fate_level,
                fate_level: fateLevel ?? h.fate_level,
              },
            }));
          }
        })
        .catch(() => {});
    });
  }, [heroes.length]);

  // Name availability check (debounced)
  useEffect(() => {
    if (heroName.trim().length < 2) { setNameState('idle'); return; }
    setNameState('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/api/users`);
        const data = await res.json();
        const list: any[] = data?.data ?? data ?? [];
        const taken = list.some((u: any) =>
          (u.hero_name ?? u.heroName ?? '').toLowerCase() === heroName.trim().toLowerCase()
        );
        setNameState(taken ? 'taken' : 'available');
      } catch {
        setNameState('idle');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [heroName]);

  const handleSelect = async (heroId: string) => {
    setSelecting(heroId);
    try {
      await selectHero(heroId);
      onHeroSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to select hero');
    } finally {
      setSelecting(null);
    }
  };

  // Generate narrative seeded from hero name + reroll count
  const generateFromName = (name: string, roll: number) =>
    generateNarrative(name.trim().toLowerCase().replace(/\s+/g, '') + (roll > 0 ? `__roll${roll}` : ''));

  const handleShowBackstory = () => {
    if (nameState !== 'available') return;
    setNarrative(generateFromName(heroName, 0));
    setRerolls(0);
    setView('backstory');
  };

  const handleReroll = () => {
    if (rerolls >= 3) return;
    const next = rerolls + 1;
    setRerolls(next);
    setNarrative(generateFromName(heroName, next));
  };

  const handleCreate = async () => {
    if (nameState !== 'available') return;
    setLoading(true);
    setError(null);
    try {
      await createHero(heroName.trim());
      onHeroSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create hero');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = heroes.length < HERO_LIMIT;

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 32px',
    }}>
      <style>{`
        @keyframes hsIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .hs { opacity:0; }
        .hs.e { animation: hsIn 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
        .hero-name-input {
          width:100%; padding:14px 16px; background:var(--surface);
          border:1px solid var(--border); border-radius:10px;
          color:var(--text-1); font-size:16px; outline:none;
          transition:border-color 0.2s; box-sizing:border-box;
          font-family:var(--font-serif); letter-spacing:0.04em;
        }
        .hero-name-input:focus { border-color:rgba(200,160,78,0.4); }
        .hero-name-input::placeholder { color:var(--text-3); font-family:var(--font-body); letter-spacing:normal; }
      `}</style>

      {/* Header */}
      <div className={`hs ${entered ? 'e' : ''}`} style={{ animationDelay:'0ms', textAlign:'center', marginBottom:32, width:'100%', maxWidth:380 }}>
        <div className="orn-row" style={{ width:140, margin:'0 auto 14px' }}>
          <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
        </div>
        <h2 className="serif-bold" style={{ fontSize:26, color:'var(--gold)', letterSpacing:'0.2em', marginBottom:6 }}>
          {view === 'select' ? 'CHOOSE YOUR HERO' : 'NAME YOUR HERO'}
        </h2>
        <p style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.1em' }}>
          {account?.email && `Fate Account: ${account.email}`}
        </p>
      </div>

      <div className={`hs ${entered ? 'e' : ''}`} style={{ animationDelay:'80ms', width:'100%', maxWidth:380, flex:1 }}>

        {/* ── View: select ── */}
        {view === 'select' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Existing heroes */}
            {heroes.map((h, i) => {
              const detail    = heroDetails[h.root_id];
              const heroLevel = detail?.hero_level ?? h.fate_level;
              const fateLevel = detail?.fate_level ?? h.fate_level;
              const tier = TIER_FOR_LEVEL(heroLevel);
              const ac   = ALIGNMENT_COLOR[h.fate_alignment] ?? 'var(--gold)';
              const al   = ALIGNMENT_LABEL[h.fate_alignment] ?? null;
              const alignIcon = h.fate_alignment === 'ORDER' ? '⚖' : h.fate_alignment === 'CHAOS' ? '🜲' : h.fate_alignment === 'LIGHT' ? '☀' : h.fate_alignment === 'DARK' ? '☽' : '◈';

              return (
                <div
                  key={h.root_id}
                  onClick={() => !selecting && handleSelect(h.root_id)}
                  className={`hs ${entered ? 'e' : ''}`}
                  style={{
                    animationDelay: `${100 + i * 60}ms`,
                    padding:'18px 20px', borderRadius:14,
                    background:`linear-gradient(135deg, rgba(200,160,78,0.07), rgba(200,94,40,0.02))`,
                    border:`1px solid ${ac}35`,
                    cursor: selecting ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:14,
                    transition:'all 0.2s ease', opacity: selecting && selecting !== h.root_id ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width:48, height:48, borderRadius:10, flexShrink:0,
                    background:`${ac}15`, border:`1px solid ${ac}35`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                  }}>
                    {selecting === h.root_id ? '…' : alignIcon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="serif-bold" style={{ fontSize:18, color:'var(--text-1)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {h.hero_name}
                    </p>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, color:tier.color, fontWeight:700 }}>{tier.name}</span>
                      <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                      <span style={{ fontSize:10, color:'var(--text-3)' }}>Hero Lv <span style={{ color:'var(--text-1)', fontWeight:700 }}>{heroLevel}</span></span>
                      <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                      <span style={{ fontSize:10, color:'var(--text-3)' }}>Fate Lv <span style={{ color:tier.color, fontWeight:700 }}>{fateLevel}</span></span>
                      {al && al !== 'NONE' && (
                        <>
                          <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                          <span style={{ fontSize:10, color:ac, fontWeight:600 }}>{al}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{ color:'var(--gold)', fontSize:18, flexShrink:0, opacity:0.5 }}>›</span>
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: HERO_LIMIT - heroes.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                onClick={() => canCreate && setView('create')}
                className={`hs ${entered ? 'e' : ''}`}
                style={{
                  animationDelay: `${100 + (heroes.length + i) * 60}ms`,
                  padding:'18px 20px', borderRadius:14,
                  background:'transparent',
                  border:'1px dashed rgba(90,78,60,0.4)',
                  cursor:'pointer',
                  display:'flex', alignItems:'center', gap:14,
                  transition:'border-color 0.2s',
                }}
              >
                <div style={{
                  width:48, height:48, borderRadius:10, flexShrink:0,
                  background:'rgba(37,32,24,0.4)', border:'1px dashed rgba(90,78,60,0.4)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'var(--text-3)',
                }}>
                  +
                </div>
                <div>
                  <p style={{ fontSize:15, color:'var(--text-3)', fontFamily:'var(--font-serif)' }}>New Hero</p>
                  <p style={{ fontSize:12, color:'rgba(90,78,60,0.7)', marginTop:2 }}>Create a character</p>
                </div>
              </div>
            ))}

            {error && (
              <p style={{ fontSize:12, color:'var(--ember)', padding:'8px 12px', background:'rgba(200,94,40,0.08)', borderRadius:8, border:'1px solid rgba(200,94,40,0.2)' }}>
                {error}
              </p>
            )}

            {/* Sign out */}
            <button
              onClick={onSignOut}
              style={{ marginTop:8, background:'none', border:'none', color:'var(--text-3)', fontSize:11, cursor:'pointer', letterSpacing:'0.06em', padding:'8px 0' }}
            >
              Sign out of {account?.email}
            </button>
          </div>
        )}

        {/* ── View: create ── */}
        {view === 'create' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button
              onClick={() => { setView('select'); setHeroName(''); setNameState('idle'); setError(null); }}
              style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:12, cursor:'pointer', textAlign:'left', padding:'0 0 8px', letterSpacing:'0.05em' }}
            >
              ← Back
            </button>

            <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.6, marginBottom:4 }}>
              Your hero name is your identity within the world of Heroes' Veritas. Choose carefully — it is permanent.
            </p>

            <div style={{ position:'relative' }}>
              <input
                className="hero-name-input"
                type="text"
                placeholder="Enter your hero name"
                value={heroName}
                onChange={e => setHeroName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nameState === 'available' && handleCreate()}
                maxLength={32}
                autoCapitalize="words"
              />
              {nameState !== 'idle' && (
                <div style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  fontSize:11, fontWeight:700, letterSpacing:'0.06em',
                  color: nameState === 'available' ? '#6A8A5A' : nameState === 'taken' ? 'var(--ember)' : 'var(--text-3)',
                }}>
                  {nameState === 'checking'  ? '…'         : ''}
                  {nameState === 'available' ? '✓ AVAILABLE' : ''}
                  {nameState === 'taken'     ? '✗ TAKEN'    : ''}
                </div>
              )}
            </div>

            {error && (
              <p style={{ fontSize:12, color:'var(--ember)', padding:'8px 12px', background:'rgba(200,94,40,0.08)', borderRadius:8, border:'1px solid rgba(200,94,40,0.2)' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleShowBackstory}
              disabled={loading || nameState !== 'available'}
              style={{
                width:'100%', padding:'15px', borderRadius:10, marginTop:4,
                cursor: (loading || nameState !== 'available') ? 'not-allowed' : 'pointer',
                background: nameState === 'available' ? 'var(--gold)' : 'rgba(200,160,78,0.2)',
                border:'none', color: nameState === 'available' ? 'var(--bg)' : 'var(--text-3)',
                fontSize:13, fontWeight:700, letterSpacing:'0.1em',
                transition:'all 0.2s',
              }}
            >
              {'BEGIN YOUR JOURNEY'}
            </button>

            <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', lineHeight:1.6, opacity:0.7 }}>
              You may create up to {HERO_LIMIT} heroes on your Fate Account.
            </p>
          </div>
        )}

        {/* ── View: backstory ── */}
        {view === 'backstory' && narrative && (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

            <div style={{ textAlign:'center', padding:'20px 8px 24px', borderBottom:'1px solid var(--border)', marginBottom:20 }}>
              <p style={{ fontSize:13, color:'var(--text-2)', fontFamily:'var(--font-serif)', fontStyle:'italic', lineHeight:1.7, marginBottom:8 }}>
                "Whispers of your story flood from the Veil..."
              </p>
              <p style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.06em' }}>{heroName}</p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
              {([
                { label:'ORIGIN',  value: narrative.region  },
                { label:'CLASS',   value: narrative.class   },
                { label:'HISTORY', value: narrative.origin  },
                { label:'WOUND',   value: narrative.wound   },
                { label:'CALLING', value: narrative.calling },
              ] as { label: string; value: string }[]).map((f) => (
                <div key={f.label} style={{ borderLeft:'2px solid rgba(200,144,10,0.35)', paddingLeft:12 }}>
                  <p style={{ fontSize:8, fontWeight:700, letterSpacing:'2px', color:'var(--text-3)', margin:'0 0 2px', fontFamily:'var(--font-serif)' }}>{f.label}</p>
                  <p style={{ fontSize:13, color:'var(--text-1)', margin:0, fontFamily:'var(--font-serif)', lineHeight:1.5 }}>{f.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>
                {rerolls < 3 ? `${3 - rerolls} reroll${3 - rerolls !== 1 ? 's' : ''} remaining` : 'No rerolls remaining'}
              </p>
              <button onClick={handleReroll} disabled={rerolls >= 3} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'6px 14px', fontSize:11, letterSpacing:'0.08em', color: rerolls < 3 ? 'var(--text-2)' : 'var(--text-3)', cursor: rerolls < 3 ? 'pointer' : 'not-allowed', fontFamily:'var(--font-serif)' }}>
                ↻ Reroll
              </button>
            </div>

            {error && (
              <p style={{ fontSize:12, color:'var(--ember)', padding:'8px 12px', background:'rgba(200,94,40,0.08)', borderRadius:8, border:'1px solid rgba(200,94,40,0.2)', marginBottom:12 }}>{error}</p>
            )}

            <button onClick={handleCreate} disabled={loading} style={{ width:'100%', padding:'15px', borderRadius:10, cursor: loading ? 'not-allowed' : 'pointer', background:'var(--gold)', border:'none', color:'var(--bg)', fontSize:13, fontWeight:700, letterSpacing:'0.1em', marginBottom:10, transition:'all 0.2s' }}>
              {loading ? 'Creating…' : 'ACCEPT FATE'}
            </button>

            <button onClick={handleCreate} disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:10, cursor: loading ? 'not-allowed' : 'pointer', background:'transparent', border:'1px solid var(--border)', color:'var(--text-3)', fontSize:12, letterSpacing:'0.08em', transition:'all 0.2s', marginBottom:8 }}>
              {loading ? '…' : 'Skip — Enter the Codex'}
            </button>

            <button onClick={() => { setView('create'); setNarrative(null); setRerolls(0); }} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:11, cursor:'pointer', padding:'8px 0 0', letterSpacing:'0.05em', textAlign:'center' }}>
              ← Back to name
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

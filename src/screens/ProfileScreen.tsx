import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { generateNarrative, TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

const BASE = 'https://pik-prd-production.up.railway.app';

type Tab = 'profile' | 'rankings' | 'wristband';

interface Props {
  onReturnToHeroSelect: () => void;
}

export function ProfileScreen({ onReturnToHeroSelect }: Props) {
  const { hero, account, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  if (!hero) return null;

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', paddingBottom:100 }}>

      {/* Header */}
      <div style={{ padding:'48px 20px 0' }}>
        <h2 className="serif-bold" style={{ fontSize:26, color:'var(--gold)', letterSpacing:'0.18em', marginBottom:2 }}>ARCHIVE</h2>
        <p style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.08em' }}>Record · Rankings · Wristband</p>
      </div>

      {/* In-page tab bar */}
      <div style={{
        display:'flex', margin:'16px 20px 0',
        borderBottom:'1px solid var(--border)',
      }}>
        {(['profile','rankings','wristband'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, background:'none', border:'none', cursor:'pointer',
            padding:'10px 0', fontSize:9, letterSpacing:'0.12em', fontWeight:700,
            fontFamily:'var(--font-serif)', color: tab === t ? 'var(--gold)' : 'var(--text-3)',
            transition:'color 0.15s', position:'relative',
          }}>
            {t === 'profile' ? 'PROFILE' : t === 'rankings' ? 'RANKINGS' : 'WRISTBAND'}
            {tab === t && (
              <div style={{
                position:'absolute', bottom:-1, left:'15%', right:'15%',
                height:2, background:'var(--gold)', borderRadius:1,
              }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 20px 0' }}>
        {tab === 'profile'   && <ProfileTab hero={hero} account={account} onReturnToHeroSelect={onReturnToHeroSelect} onSignOut={signOut} />}
        {tab === 'rankings'  && <RankingsTab rootId={hero.root_id} />}
        {tab === 'wristband' && <WristbandTab rootId={hero.root_id} />}
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ hero, account, onReturnToHeroSelect, onSignOut }: {
  hero: any;
  account: any;
  onReturnToHeroSelect: () => void;
  onSignOut: () => void;
}) {
  const narrative = generateNarrative(hero.root_id);
  const tier      = TIER_FOR_LEVEL(hero.progression.fate_level);
  const ac        = ALIGNMENT_COLOR[hero.alignment ?? 'NONE'];
  const al        = ALIGNMENT_LABEL[hero.alignment ?? 'NONE'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Hero card */}
      <div style={{
        padding:'20px', borderRadius:14,
        background:`linear-gradient(135deg, rgba(200,160,78,0.07), rgba(200,94,40,0.02))`,
        border:'1px solid rgba(200,160,78,0.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
          <div style={{
            width:52, height:52, borderRadius:12, flexShrink:0,
            background:`${ac}18`, border:`1px solid ${ac}35`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
          }}>◈</div>
          <div>
            <p className="serif-bold" style={{ fontSize:22, color:'var(--text-1)' }}>{hero.display_name}</p>
            <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, color:tier.color, fontWeight:700 }}>{tier.name}</span>
              <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
              <span style={{ fontSize:10, color:'var(--text-3)' }}>Level {hero.progression.fate_level}</span>
              {al !== 'NONE' && (
                <>
                  <span style={{ fontSize:9, color:'var(--text-3)' }}>·</span>
                  <span style={{ fontSize:10, color:ac, fontWeight:600 }}>{al}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ height:3, background:'var(--border)', borderRadius:2 }}>
            <div style={{
              height:'100%', borderRadius:2,
              width:`${Math.min((hero.progression.fate_xp % 500) / 500 * 100, 100)}%`,
              background:'linear-gradient(90deg, var(--ember), var(--gold))',
              transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <p style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>
            {hero.progression.fate_xp.toLocaleString()} XP total
          </p>
        </div>

        {/* Narrative */}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'REGION',  val: narrative.region  },
            { label:'CLASS',   val: narrative.class   },
            { label:'ORIGIN',  val: narrative.origin  },
            { label:'CALLING', val: narrative.calling },
            { label:'VIRTUE',  val: narrative.virtue  },
            { label:'VICE',    val: narrative.vice    },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', gap:10 }}>
              <span style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em', width:56, flexShrink:0, paddingTop:2 }}>{row.label}</span>
              <span style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.4 }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipped title */}
      {hero.equipped_title && (
        <div style={{
          padding:'12px 16px', borderRadius:10,
          background:'var(--surface)', border:'1px solid var(--border)',
          display:'flex', gap:10, alignItems:'center',
        }}>
          <span style={{ fontSize:16 }}>👑</span>
          <div>
            <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em', marginBottom:2 }}>EQUIPPED TITLE</p>
            <p style={{ fontSize:14, color:'var(--gold)', fontFamily:'var(--font-serif)' }}>{hero.equipped_title}</p>
          </div>
        </div>
      )}

      {/* Fate ID */}
      <div style={{
        padding:'12px 16px', borderRadius:10,
        background:'var(--surface)', border:'1px solid var(--border)',
      }}>
        <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em', marginBottom:4 }}>FATE ID</p>
        <p style={{ fontSize:11, color:'var(--text-3)', fontFamily:'monospace', letterSpacing:'0.04em', wordBreak:'break-all' }}>
          {hero.root_id}
        </p>
      </div>

      {/* Account info */}
      {account?.email && (
        <div style={{
          padding:'12px 16px', borderRadius:10,
          background:'var(--surface)', border:'1px solid var(--border)',
        }}>
          <p style={{ fontSize:9, color:'var(--text-3)', letterSpacing:'0.08em', marginBottom:4 }}>FATE ACCOUNT</p>
          <p style={{ fontSize:12, color:'var(--text-2)' }}>{account.email}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
        <button
          onClick={onReturnToHeroSelect}
          style={{
            width:'100%', padding:'14px', borderRadius:10, cursor:'pointer',
            background:'var(--surface)', border:'1px solid var(--border)',
            color:'var(--text-2)', fontSize:12, fontWeight:600, letterSpacing:'0.08em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}
        >
          <span style={{ fontSize:14 }}>◈</span>
          RETURN TO HERO SELECT
        </button>

        <button
          onClick={onSignOut}
          style={{
            width:'100%', padding:'14px', borderRadius:10, cursor:'pointer',
            background:'none', border:'1px solid rgba(90,78,60,0.3)',
            color:'var(--text-3)', fontSize:11, letterSpacing:'0.08em',
          }}
        >
          Sign out of {account?.email ?? 'account'}
        </button>
      </div>
    </div>
  );
}

// ── Rankings Tab ──────────────────────────────────────────────────────────────
function RankingsTab({ rootId }: { rootId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${BASE}/api/leaderboard`);
        const data = await res.json();
        setEntries(data?.data ?? data ?? []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ padding:'40px 0', textAlign:'center' }}>
      <p style={{ fontSize:12, color:'var(--text-3)' }}>Loading rankings…</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {entries.map((e: any, i: number) => {
        const isMe = e.root_id === rootId;
        const tier = TIER_FOR_LEVEL(e.fate_level ?? 1);
        return (
          <div key={e.root_id ?? i} style={{
            padding:'14px 16px', borderRadius:12,
            background: isMe ? 'rgba(200,160,78,0.08)' : 'var(--surface)',
            border:`1px solid ${isMe ? 'rgba(200,160,78,0.3)' : 'var(--border)'}`,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <span style={{
              fontSize:13, fontWeight:700, color: i < 3 ? 'var(--gold)' : 'var(--text-3)',
              width:24, textAlign:'center', flexShrink:0,
            }}>
              {i === 0 ? '◈' : i === 1 ? '◇' : i === 2 ? '△' : `${i+1}`}
            </span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, color: isMe ? 'var(--gold)' : 'var(--text-1)', fontFamily:'var(--font-serif)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {e.hero_name ?? e.display_name}
                {isMe && <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:6 }}>(you)</span>}
              </p>
              <p style={{ fontSize:10, color:tier.color, marginTop:2 }}>
                {tier.name} · Lv {e.fate_level}
              </p>
            </div>
            <span style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, flexShrink:0 }}>
              {(e.fate_xp ?? 0).toLocaleString()} XP
            </span>
          </div>
        );
      })}

      {entries.length === 0 && (
        <p style={{ textAlign:'center', fontSize:13, color:'var(--text-3)', padding:'40px 0' }}>No rankings yet.</p>
      )}
    </div>
  );
}

// ── Wristband Tab ─────────────────────────────────────────────────────────────
function WristbandTab({ rootId }: { rootId: string }) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${BASE}/api/users/${rootId}/tokens`);
        const data = await res.json();
        setTokens(data?.data ?? data ?? []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [rootId]);

  if (loading) return (
    <div style={{ padding:'40px 0', textAlign:'center' }}>
      <p style={{ fontSize:12, color:'var(--text-3)' }}>Checking wristband…</p>
    </div>
  );

  const active = tokens.filter((t: any) => t.status === 'active');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {active.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <p style={{ fontSize:30, marginBottom:14, opacity:0.3 }}>◈</p>
          <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7 }}>
            No wristband linked.<br />
            Visit a Heroes' Veritas venue to link your Fate ID to a wristband.
          </p>
        </div>
      ) : (
        active.map((t: any) => (
          <div key={t.token_id ?? t.id} style={{
            padding:'18px', borderRadius:14,
            background:'var(--surface)', border:'1px solid var(--border)',
          }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:20 }}>⌚</span>
              <div>
                <p style={{ fontSize:13, color:'var(--text-1)', fontFamily:'var(--font-serif)' }}>
                  {t.friendly_name ?? t.token_type ?? 'Wristband'}
                </p>
                <p style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>Active</p>
              </div>
            </div>
            <p style={{ fontSize:10, color:'var(--text-3)', fontFamily:'monospace', letterSpacing:'0.04em' }}>
              UID: {t.token_uid}
            </p>
            {t.tap_count != null && (
              <p style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>
                {t.tap_count} taps recorded
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

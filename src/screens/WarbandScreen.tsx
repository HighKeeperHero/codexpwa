// ============================================================
// WarbandScreen — Sprint 23
// Warband formation, management, member roster, invite system,
// and hero profile inspection.
// Place at: src/screens/WarbandScreen.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';

const BASE = 'https://pik-prd-production.up.railway.app';

type View = 'my-warband' | 'create' | 'search' | 'join' | 'hero-profile';

const VALID_GLYPHS = ['⚔','🛡','🏹','⚡','◈','✦','🌿','⚓','🃏','⚙','📖','🐉'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function rankColor(rank: string) {
  if (rank === 'FOUNDER') return '#C8900A';
  if (rank === 'OFFICER') return '#8FA8CC';
  return 'var(--text-3)';
}

function rankLabel(rank: string) {
  if (rank === 'FOUNDER') return 'Founder';
  if (rank === 'OFFICER') return 'Officer';
  return 'Member';
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function WarbandScreen() {
  const { hero } = useAuth();
  const [view,          setView]          = useState<View>('my-warband');
  const [warband,       setWarband]       = useState<any | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [inspectRootId, setInspectRootId] = useState<string | null>(null);

  const rootId = hero?.root_id ?? '';

  const loadMyWarband = useCallback(async () => {
    if (!rootId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/warbands/my/${rootId}`);
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? json;
      setWarband(data && data.warband_id ? data : null);
    } catch {
      setWarband(null);
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => { loadMyWarband(); }, [loadMyWarband]);

  if (!hero) return null;

  const alignColor = ALIGNMENT_COLOR[hero.alignment] ?? '#5A4E3C';

  // Hero profile inspect view
  if (view === 'hero-profile' && inspectRootId) {
    return (
      <HeroProfileView
        rootId={inspectRootId}
        alignColor={alignColor}
        onBack={() => { setView('my-warband'); setInspectRootId(null); }}
      />
    );
  }

  return (
    <div className="screen-enter" style={{ padding: '16px 16px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20, color: alignColor }}>⚔</span>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '0.05em' }}>
            WARBANDS
          </h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
          Form a company. Build reputation. Face the Veil together.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em' }}>
            Reading the rolls…
          </p>
        </div>
      )}

      {!loading && warband && (
        <MyWarbandView
          warband={warband}
          rootId={rootId}
          alignColor={alignColor}
          onRefresh={loadMyWarband}
          onInspectHero={(rid) => { setInspectRootId(rid); setView('hero-profile'); }}
        />
      )}

      {!loading && !warband && view === 'my-warband' && (
        <NoWarbandView
          alignColor={alignColor}
          onCreate={() => setView('create')}
          onJoin={() => setView('join')}
          onSearch={() => setView('search')}
        />
      )}

      {view === 'create' && (
        <CreateWarbandView
          rootId={rootId}
          heroAlignment={hero.alignment}
          alignColor={alignColor}
          onCreated={(w) => { setWarband(w); setView('my-warband'); }}
          onBack={() => setView('my-warband')}
        />
      )}

      {view === 'join' && (
        <JoinView
          rootId={rootId}
          alignColor={alignColor}
          onJoined={(w) => { setWarband(w); setView('my-warband'); }}
          onBack={() => setView('my-warband')}
        />
      )}

      {view === 'search' && (
        <SearchView
          rootId={rootId}
          alignColor={alignColor}
          onBack={() => setView('my-warband')}
          onInspectHero={(rid) => { setInspectRootId(rid); setView('hero-profile'); }}
        />
      )}
    </div>
  );
}

// ── No Warband ────────────────────────────────────────────────────────────────
function NoWarbandView({ alignColor, onCreate, onJoin, onSearch }: {
  alignColor: string; onCreate: () => void; onJoin: () => void; onSearch: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚔</div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
          You stand alone
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Warbands carry reputation across the Veil. Up to 6 heroes. One name.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onCreate} style={btn(alignColor)}>FOUND A WARBAND</button>
          <button onClick={onJoin}   style={btnSecondary()}>Enter Invite Code</button>
          <button onClick={onSearch} style={btnGhost()}>Browse Warbands</button>
        </div>
      </div>
    </div>
  );
}

// ── My Warband ────────────────────────────────────────────────────────────────
function MyWarbandView({ warband, rootId, alignColor, onRefresh, onInspectHero }: {
  warband: any; rootId: string; alignColor: string;
  onRefresh: () => void; onInspectHero: (rid: string) => void;
}) {
  const [showInvite,  setShowInvite]  = useState(false);
  const [inviteData,  setInviteData]  = useState<any>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionErr,   setActionErr]   = useState<string | null>(null);
  const [renaming,    setRenaming]    = useState(false);
  const [newName,     setNewName]     = useState('');

  const myRank = warband.my_rank ?? 'MEMBER';
  const isOfficerPlus = myRank === 'OFFICER' || myRank === 'FOUNDER';
  const wbColor = ALIGNMENT_COLOR[warband.alignment] ?? alignColor;

  const generateInvite = async () => {
    setInviteError(null);
    try {
      const res  = await fetch(`${BASE}/api/warbands/${warband.warband_id}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId }),
      });
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? json;
      if (json.status === 'error') throw new Error(data?.message ?? json.message);
      setInviteData(data);
      setShowInvite(true);
    } catch (e: any) { setInviteError(e.message); }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this Warband?')) return;
    try {
      await fetch(`${BASE}/api/warbands/${warband.warband_id}/leave`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId }),
      });
      onRefresh();
    } catch (e: any) { setActionErr(e.message); }
  };

  const handleDisband = async () => {
    if (!confirm('Disband this Warband? This cannot be undone.')) return;
    try {
      await fetch(`${BASE}/api/warbands/${warband.warband_id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId }),
      });
      onRefresh();
    } catch (e: any) { setActionErr(e.message); }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res  = await fetch(`${BASE}/api/warbands/${warband.warband_id}/name`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId, name: newName.trim() }),
      });
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
      setRenaming(false);
      onRefresh();
    } catch (e: any) { setActionErr(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Warband header */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${wbColor}40`, borderRadius: 12, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: `${wbColor}18`, border: `1px solid ${wbColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {warband.emblem}
          </div>
          <div style={{ flex: 1 }}>
            {renaming ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={warband.name} maxLength={32}
                  style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-1)', fontSize: 13, fontFamily: 'Cinzel, serif' }}
                />
                <button onClick={handleRename} style={btnSmall(wbColor)}>Save</button>
                <button onClick={() => setRenaming(false)} style={btnSmall('var(--text-3)')}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{warband.name}</p>
                {isOfficerPlus && (
                  <button onClick={() => { setNewName(warband.name); setRenaming(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>✏</button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: wbColor, fontWeight: 700 }}>{ALIGNMENT_LABEL[warband.alignment] ?? warband.alignment}</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{warband.member_count}/6 members</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>{warband.reputation} REP</span>
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: rankColor(myRank), background: `${rankColor(myRank)}18`, border: `1px solid ${rankColor(myRank)}40`, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
            {rankLabel(myRank)}
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isOfficerPlus && !warband.is_full && (
            <button onClick={generateInvite} style={btnSmall(wbColor)}>+ Invite</button>
          )}
          {myRank !== 'FOUNDER' && (
            <button onClick={handleLeave} style={btnSmall('#CC3020')}>Leave</button>
          )}
          {myRank === 'FOUNDER' && (
            <button onClick={handleDisband} style={btnSmall('#CC3020')}>Disband</button>
          )}
        </div>

        {actionErr && <p style={{ fontSize: 11, color: 'var(--ember)', margin: '8px 0 0' }}>{actionErr}</p>}
      </div>

      {/* Invite code display */}
      {showInvite && inviteData && (
        <div style={{ background: `${wbColor}10`, border: `1px solid ${wbColor}40`, borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, letterSpacing: '2px', color: wbColor, margin: '0 0 6px', fontFamily: 'Cinzel, serif' }}>INVITE CODE</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '0.2em' }}>
              {inviteData.invite_code}
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(inviteData.invite_code)}
              style={{ background: 'none', border: `1px solid ${wbColor}40`, borderRadius: 6, padding: '4px 10px', color: wbColor, fontSize: 11, cursor: 'pointer' }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Expires {new Date(inviteData.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}
      {inviteError && <p style={{ fontSize: 11, color: 'var(--ember)' }}>{inviteError}</p>}

      {/* Member roster */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Roster — {warband.member_count} / 6
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(warband.members ?? []).map((m: any) => {
            const mColor = ALIGNMENT_COLOR[m.alignment] ?? 'var(--text-3)';
            const isMe   = m.root_id === warband.my_root_id;
            return (
              <div
                key={m.root_id}
                onClick={() => onInspectHero(m.root_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${mColor}18`, border: `1px solid ${mColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: mColor, flexShrink: 0 }}>
                  {m.alignment?.[0] ?? '◈'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', margin: 0, fontFamily: 'Cinzel, serif', fontWeight: m.rank === 'FOUNDER' ? 700 : 400 }}>
                    {m.hero_name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                    Lv {m.hero_level} · {ALIGNMENT_LABEL[m.alignment] ?? m.alignment}
                    {m.alignment_bonus && <span style={{ color: wbColor, fontWeight: 700 }}> ✦</span>}
                  </p>
                </div>
                <span style={{ fontSize: 10, color: rankColor(m.rank), fontWeight: 700 }}>{rankLabel(m.rank)}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 14, opacity: 0.4 }}>›</span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '10px 0 0', fontStyle: 'italic' }}>
          ✦ Alignment bonus active — +10% XP in Convergence Events
        </p>
      </div>
    </div>
  );
}

// ── Create ────────────────────────────────────────────────────────────────────
function CreateWarbandView({ rootId, heroAlignment, alignColor, onCreated, onBack }: {
  rootId: string; heroAlignment: string; alignColor: string;
  onCreated: (w: any) => void; onBack: () => void;
}) {
  const [name,      setName]      = useState('');
  const [emblem,    setEmblem]    = useState('⚔');
  const [alignment, setAlignment] = useState(heroAlignment ?? 'NONE');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${BASE}/api/warbands`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId, name: name.trim(), emblem, alignment }),
      });
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? json;
      if (json.status === 'error') throw new Error(data?.message ?? json.message);
      onCreated(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onBack} style={backBtn()}>← Back</button>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Found a Warband</p>

      <div style={card()}>
        <label style={fieldLabel()}>Warband Name</label>
        <input
          value={name} onChange={e => setName(e.target.value)} maxLength={32}
          placeholder="Enter a name…"
          style={inputStyle()}
        />
      </div>

      <div style={card()}>
        <label style={fieldLabel()}>Emblem</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VALID_GLYPHS.map(g => (
            <button key={g} onClick={() => setEmblem(g)} style={{
              width: 38, height: 38, fontSize: 18, border: `1px solid ${emblem === g ? alignColor : 'var(--border)'}`,
              background: emblem === g ? `${alignColor}18` : 'transparent',
              borderRadius: 8, cursor: 'pointer',
            }}>{g}</button>
          ))}
        </div>
      </div>

      <div style={card()}>
        <label style={fieldLabel()}>Primary Alignment (open to all)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['NONE','ORDER','CHAOS','LIGHT','DARK'].map(a => {
            const ac = ALIGNMENT_COLOR[a] ?? 'var(--text-3)';
            return (
              <button key={a} onClick={() => setAlignment(a)} style={{
                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 700,
                fontFamily: 'Cinzel, serif', letterSpacing: '0.05em',
                border: `1px solid ${alignment === a ? ac : 'var(--border)'}`,
                background: alignment === a ? `${ac}18` : 'transparent',
                color: alignment === a ? ac : 'var(--text-3)', borderRadius: 8, cursor: 'pointer',
              }}>{a === 'NONE' ? 'ANY' : a}</button>
            );
          })}
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--ember)', margin: 0 }}>{error}</p>}
      <button onClick={handleCreate} disabled={loading || name.trim().length < 2} style={btn(alignColor)}>
        {loading ? 'Founding…' : 'FOUND WARBAND'}
      </button>
    </div>
  );
}

// ── Join ──────────────────────────────────────────────────────────────────────
function JoinView({ rootId, alignColor, onJoined, onBack }: {
  rootId: string; alignColor: string;
  onJoined: (w: any) => void; onBack: () => void;
}) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${BASE}/api/warbands/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_id: rootId, invite_code: code.trim().toUpperCase() }),
      });
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? json;
      if (json.status === 'error') throw new Error(data?.message ?? json.message);
      onJoined(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onBack} style={backBtn()}>← Back</button>
      <div style={card()}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 12px' }}>Enter Invite Code</p>
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8}
          placeholder="e.g. A3BX9K"
          style={{ ...inputStyle(), fontFamily: 'monospace', fontSize: 20, letterSpacing: '0.2em', textAlign: 'center' }}
        />
        {error && <p style={{ fontSize: 12, color: 'var(--ember)', margin: '8px 0 0' }}>{error}</p>}
        <button onClick={handleJoin} disabled={loading || !code.trim()} style={{ ...btn(alignColor), marginTop: 12 }}>
          {loading ? 'Joining…' : 'JOIN WARBAND'}
        </button>
      </div>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function SearchView({ rootId, alignColor, onBack, onInspectHero }: {
  rootId: string; alignColor: string;
  onBack: () => void; onInspectHero: (rid: string) => void;
}) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      const res  = await fetch(`${BASE}/api/warbands?${params}`);
      const json = await res.json();
      const data = json?.data?.data ?? json?.data ?? json;
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { search(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onBack} style={backBtn()}>← Back</button>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search Warbands…"
          style={{ ...inputStyle(), flex: 1 }}
        />
        <button onClick={search} style={btnSmall(alignColor)}>Search</button>
      </div>
      {loading && <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '16px 0' }}>Searching…</p>}
      {results.map(w => {
        const wc = ALIGNMENT_COLOR[w.alignment] ?? 'var(--text-3)';
        return (
          <div key={w.warband_id} style={{ background: 'var(--surface)', border: `1px solid ${wc}30`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${wc}15`, border: `1px solid ${wc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {w.emblem}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>{w.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                {ALIGNMENT_LABEL[w.alignment] ?? w.alignment} · {w.member_count}/6 · {w.reputation} REP
              </p>
            </div>
            {w.is_full && <span style={{ fontSize: 10, color: 'var(--ember)', fontWeight: 700 }}>FULL</span>}
          </div>
        );
      })}
      {!loading && results.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', padding: '24px 0' }}>No Warbands found.</p>
      )}
    </div>
  );
}

// ── Hero Profile (public) ─────────────────────────────────────────────────────
function HeroProfileView({ rootId, alignColor, onBack }: {
  rootId: string; alignColor: string; onBack: () => void;
}) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/heroes/${rootId}/profile`)
      .then(r => r.json())
      .then(json => setProfile(json?.data?.data ?? json?.data ?? json))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [rootId]);

  if (loading) return (
    <div style={{ padding: '48px 16px 80px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Cinzel, serif' }}>Reading the record…</p>
    </div>
  );

  if (!profile) return (
    <div style={{ padding: '16px 16px 80px' }}>
      <button onClick={onBack} style={backBtn()}>← Back</button>
      <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Hero not found.</p>
    </div>
  );

  const ac = ALIGNMENT_COLOR[profile.alignment] ?? alignColor;

  return (
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onBack} style={backBtn()}>← Back</button>

      {/* Identity card */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${ac}40`, borderRadius: 12, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: `${ac}18`, border: `1px solid ${ac}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: ac }}>
            {profile.alignment?.[0] ?? '◈'}
          </div>
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>{profile.hero_name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              Level {profile.hero_level}
              {profile.hero_class && ` · ${profile.hero_class.replace(/_/g, ' ')}`}
              {profile.alignment !== 'NONE' && ` · ${ALIGNMENT_LABEL[profile.alignment] ?? profile.alignment}`}
            </p>
          </div>
        </div>
        {profile.equipped_title && (
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: ac, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            ◆ {profile.equipped_title.replace(/^title_/, '').replace(/_/g, ' ')}
          </p>
        )}
      </div>

      {/* Warband */}
      {profile.warband && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>Warband</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{profile.warband.emblem}</span>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{profile.warband.name}</p>
            <span style={{ fontSize: 10, color: rankColor(profile.warband.rank), fontWeight: 700, marginLeft: 'auto' }}>{rankLabel(profile.warband.rank)}</span>
          </div>
        </div>
      )}

      {/* Titles */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Titles — {profile.title_count}
        </p>
        {profile.title_count === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' }}>No titles earned yet.</p>
          : <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{profile.title_count} title{profile.title_count !== 1 ? 's' : ''} in the record.</p>
        }
      </div>

      {/* Recent milestones */}
      {profile.recent_milestones?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>Recent Milestones</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.recent_milestones.map((e: any, i: number) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
                ◈ {e.event_type.replace(/identity\.|identity_/g, '').replace(/_/g, ' ')}
                <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                  {new Date(e.ts).toLocaleDateString()}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const btn = (color: string) => ({
  width: '100%', padding: '14px', borderRadius: 10, border: 'none',
  background: color, color: '#0B0F1A', fontSize: 13, fontWeight: 700,
  letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'Cinzel, serif',
} as React.CSSProperties);

const btnSecondary = () => ({
  width: '100%', padding: '13px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif',
} as React.CSSProperties);

const btnGhost = () => ({
  background: 'none', border: 'none', color: 'var(--text-3)',
  fontSize: 12, cursor: 'pointer', padding: '8px 0',
} as React.CSSProperties);

const btnSmall = (color: string) => ({
  padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}60`,
  background: `${color}15`, color, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'Cinzel, serif', flexShrink: 0,
} as React.CSSProperties);

const backBtn = () => ({
  background: 'none', border: 'none', color: 'var(--text-3)',
  fontSize: 12, cursor: 'pointer', textAlign: 'left' as const,
  padding: '0 0 4px', letterSpacing: '0.05em',
});

const card = () => ({
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '14px 16px',
} as React.CSSProperties);

const fieldLabel = () => ({
  fontFamily: 'Cinzel, serif', fontSize: 11, color: 'var(--text-3)',
  letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8,
});

const inputStyle = () => ({
  width: '100%', padding: '12px 14px', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Cinzel, serif',
});

// src/screens/HomeScreen.tsx
// Sprint 12: Added VeilActivitySection — reads vt_battles from localStorage
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { xpProgress, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '@/api/pik';
import { ShareFateCard } from '@/screens/ShareFateCard';
import { CeremonyOverlay } from '@/screens/CeremonyOverlay';

const BASE = 'https://pik-prd-production.up.railway.app';

const PILLAR: Record<string, { label: string; icon: string; color: string }> = {
  forge: { label: 'FORGE', icon: '⊕', color: '#C85E28' },
  lore:  { label: 'LORE',  icon: '⊞', color: '#FFA500' },
  veil:  { label: 'VEIL',  icon: '◈', color: '#7A5888' },
};

const RARITY_COLOR: Record<string, string> = {
  mythic: '#FF6B9D', legendary: '#FFA500', epic: '#A855F7',
  rare: '#1E90FF', uncommon: '#22C55E', common: '#8899AA',
};

const SLOT_ICON: Record<string, string> = {
  weapon: '⚔', helm: '◈', chest: '⬡', arms: '○', legs: '▽', rune: '◇',
};

// ── Veil tier lookup (mirrors VeilTearsScreen constants) ──────────────────────
const VT_TIER: Record<string, { color: string; glyph: string; label: string }> = {
  minor:   { color: '#1A6ED4', glyph: '✦', label: 'Minor Threat'    },
  wander:  { color: '#8040C8', glyph: '◉', label: 'Wandering Shade' },
  dormant: { color: '#E8820A', glyph: '⊛', label: 'Dormant Rift'    },
  double:  { color: '#CC1020', glyph: '⚡', label: 'Double Rift'     },
};

interface BattleRecord {
  tear_type: string; tear_name: string; won: boolean; shards: number; ts: number;
}

function loadVTHistory(): BattleRecord[] {
  try { return JSON.parse(localStorage.getItem('vt_battles') ?? '[]'); }
  catch { return []; }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PillarData {
  pillar: string; xp: number; level: number; streak: number;
  longest_streak: number; title: string; xp_in_level: number; xp_to_next: number;
}
interface Oath {
  oath_id: string; pillar: string; declaration: string;
  week_of: string; status: 'pending' | 'kept' | 'broken';
}
interface PartyMember {
  root_id: string; display_name: string; alignment: string; fate_level: number;
}
interface LiveSession {
  session_id: string; source_name: string; venue_id: string;
  started_at: string; party: PartyMember[];
}

function getWeekEndUTC(): number {
  const d = new Date();
  const daysUntil = (7 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntil);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
function formatDDHH(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}
function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, targetMs - Date.now())), 60_000);
    return () => clearInterval(t);
  }, [targetMs]);
  return remaining;
}

// ── Veil Activity Section ──────────────────────────────────────────────────────
function VeilActivitySection() {
  const [history, setHistory] = useState<BattleRecord[]>([]);

  useEffect(() => {
    setHistory(loadVTHistory().slice(0, 5));
    const onFocus = () => setHistory(loadVTHistory().slice(0, 5));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (history.length === 0) return null;

  const wins   = history.filter(b => b.won).length;
  const losses = history.filter(b => !b.won).length;
  const shards = history.filter(b => b.won).reduce((s, b) => s + b.shards, 0);

  return (
    <>
      <div className="divider"><span className="divider-label">VEIL ACTIVITY</span></div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { val: wins,   label: 'SEALED',           color: '#34d399' },
          { val: losses, label: 'RETREATED',         color: '#CC1020' },
          { val: shards, label: 'SHARDS (RECENT)',   color: '#FFA500', flex: true },
        ].map(pill => (
          <div key={pill.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '8px 12px', flex: (pill as any).flex ? 1 : undefined,
            background: `${pill.color}0D`, border: `1px solid ${pill.color}30`, borderRadius: 10,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: pill.color, fontFamily: 'Cinzel, serif' }}>{pill.val}</span>
            <span style={{ fontSize: 7, color: 'var(--text-3)', letterSpacing: '0.12em' }}>{pill.label}</span>
          </div>
        ))}
      </div>

      {/* Recent battles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
        {history.map((b, i) => {
          const tier = VT_TIER[b.tear_type] ?? VT_TIER.minor;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)',
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${tier.color}`,
              borderRadius: 10, padding: '9px 12px',
            }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: 8,
                background: `${tier.color}15`, border: `1px solid ${tier.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: tier.color, textShadow: `0 0 8px ${tier.color}`,
              }}>
                {tier.glyph}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.tear_name}
                </p>
                <p style={{ fontSize: 8, color: `${tier.color}CC`, margin: 0, letterSpacing: '0.1em' }}>
                  {tier.label}
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: b.won ? '#34d399' : '#CC1020', margin: '0 0 2px' }}>
                  {b.won ? `+${b.shards} ◆` : 'RETREATED'}
                </p>
                <p style={{ fontSize: 8, color: 'var(--text-3)', margin: 0 }}>{timeAgo(b.ts)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Live Session Feed ──────────────────────────────────────────────────────────
function LiveSessionFeed({ rootId, wearable }: { rootId: string; wearable: any }) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [elapsed, setElapsed]   = useState('—');
  const [pulse, setPulse]       = useState(false);
  const acColor = '#34d399';

  const fetchSession = useCallback(() => {
    fetch(`${BASE}/api/sessions/active/${rootId}`)
      .then(r => r.json())
      .then(d => {
        const payload = d?.data?.data ?? d?.data ?? d;
        setSession(payload?.session_id ? payload : null);
        setPulse(true); setTimeout(() => setPulse(false), 600);
      })
      .catch(() => setSession(null));
  }, [rootId]);

  useEffect(() => {
    if (!session?.started_at) return;
    setElapsed(formatElapsed(session.started_at));
    const t = setInterval(() => setElapsed(formatElapsed(session.started_at)), 60_000);
    return () => clearInterval(t);
  }, [session?.started_at]);

  useEffect(() => { fetchSession(); const t = setInterval(fetchSession, 30_000); return () => clearInterval(t); }, [fetchSession]);

  const venue = session?.source_name ?? wearable?.venue_name ?? wearable?.source_name ?? 'Heroes Veritas';

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${acColor}40`, background: `linear-gradient(135deg, var(--surface), ${acColor}0C)`, boxShadow: `0 0 24px ${acColor}15` }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${acColor}, ${acColor}40)`, animation: pulse ? 'none' : undefined }} />
        <div style={{ padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: acColor, boxShadow: `0 0 8px ${acColor}`, animation: 'livePulse 2s ease-in-out infinite', flexShrink: 0 }} />
            <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #34d399; } 50% { opacity: 0.5; box-shadow: 0 0 14px #34d399; } }`}</style>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700, color: acColor, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Session Active</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10, color: 'rgba(232,224,204,0.55)' }}>{session ? elapsed : '—'}</span>
          </div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '0.04em' }}>{venue}</p>
          {session ? (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 10px' }}>
                {session.session_id ? `Session ${session.session_id.slice(-6).toUpperCase()}` : 'Connecting to the Veil…'}
              </p>
              {session.party && session.party.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Party — {session.party.length} hero{session.party.length !== 1 ? 'es' : ''}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {session.party.map((m: PartyMember) => {
                      const mc = ALIGNMENT_COLOR[m.alignment] ?? '#8899AA';
                      return (
                        <div key={m.root_id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${mc}10`, border: `1px solid ${mc}30`, borderRadius: 8, padding: '5px 9px' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, background: `${mc}25`, border: `1px solid ${mc}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: mc, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                            {m.display_name[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 1px', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.display_name}</p>
                            <p style={{ fontSize: 8, color: mc, margin: 0, letterSpacing: '0.05em' }}>Lv {m.fate_level}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {session.party && session.party.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Running solo — no party members yet.</p>}
            </>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Wristband tapped — session initializing…</p>
          )}
        </div>
        <div style={{ padding: '6px 15px 8px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>LIVE · UPDATES EVERY 30S</span>
          <button onClick={fetchSession} style={{ background: 'none', border: 'none', color: acColor, fontSize: 10, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', opacity: 0.7, padding: 0 }}>↻ Sync</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────────
export function HomeScreen({ onSwitchHero }: { onSwitchHero?: () => void }) {
  const { hero, isMock, isRefreshing, refreshHero, signOut, lastUpdated } = useAuth() as any;
  const [pullDist, setPullDist] = useState(0);
  const [pulling,  setPulling]  = useState(false);
  const startY    = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) startY.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY.current) return;
    const dist = e.touches[0].clientY - startY.current;
    if (dist > 0 && dist < 80) { setPulling(true); setPullDist(dist); }
  }, []);
  const onTouchEnd = useCallback(async () => {
    if (pullDist > 55) await refreshHero();
    startY.current = 0; setPulling(false); setPullDist(0);
  }, [pullDist, refreshHero]);

  const [trainingStreak, setTrainingStreak] = useState<number | null>(null);
  const [pillars,  setPillars]  = useState<PillarData[]>([]);
  const [oath,     setOath]     = useState<Oath | null | undefined>(undefined);
  const [showCard, setShowCard] = useState(false);
  const rootId = hero?.root_id ?? null;

  useEffect(() => {
    if (!rootId) return;
    fetch(`${BASE}/api/training/daily/${rootId}`)
      .then(r => r.json()).then(d => { const p = d?.data ?? d; if (typeof p?.streak === 'number') setTrainingStreak(p.streak); }).catch(() => {});
    fetch(`${BASE}/api/training/pillars/${rootId}`)
      .then(r => r.json()).then(d => { const p = d?.data ?? d; if (Array.isArray(p)) setPillars(p); }).catch(() => {});
    fetch(`${BASE}/api/training/oath/${rootId}`)
      .then(r => r.json()).then(d => setOath(d?.data ?? d ?? null)).catch(() => setOath(null));
  }, [rootId]);

  if (!hero) return null;

  const { progression, sources, wearable, source_progression } = hero;
  const ac        = ALIGNMENT_COLOR[hero.alignment] ?? 'var(--bronze)';
  const prog      = xpProgress(progression);
  const topTitle  = progression.titles.find((t: any) => t.title_id === progression.equipped_title) ?? (progression.titles.length > 0 ? progression.titles[0] : null);
  const bestVenue = source_progression.length > 0 ? source_progression.reduce((a: any, b: any) => a.xp_contributed > b.xp_contributed ? a : b) : null;
  const activeOath   = oath?.status === 'pending' ? oath : null;
  const weekEndMs    = getWeekEndUTC();
  const equipment    = hero.gear?.equipment ?? {};
  const equippedSlots = (['weapon','helm','chest','arms','legs','rune'] as const)
    .map(slot => ({ slot, item: (equipment as any)[slot] ?? null })).filter(s => s.item !== null);
  const topStreak    = pillars.length > 0 ? pillars.reduce((a, b) => a.streak > b.streak ? a : b) : null;
  const displayStreak = (trainingStreak ?? 0) > 0 ? trainingStreak! : (topStreak?.streak ?? 0);
  const isInSession  = wearable?.status === 'active';

  return (
    <div className="screen screen-enter" ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {pulling && (
        <div className="ptr-indicator">
          <span style={{ fontSize: 12, color: 'var(--gold)', opacity: pullDist > 55 ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            {pullDist > 55 ? '↑ Release to refresh' : '↓ Pull to refresh'}
          </span>
        </div>
      )}
      {isRefreshing && (
        <div className="ptr-indicator">
          <span className="live-dot" />
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1 }}>Refreshing from PIK…</span>
        </div>
      )}
      <div className="screen-content stagger">
        {/* ── Live Session Feed */}
        {isInSession && rootId && <LiveSessionFeed rootId={rootId} wearable={wearable} />}

        {/* ── Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div className="orn-row" style={{ marginBottom: 16 }}>
            <div className="orn-line" /><span className="orn-glyph">◈</span><div className="orn-line" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-3)', fontWeight: 600 }}>FATE RECORD</span>
            {lastUpdated && !isMock && <><span className="live-dot" /><span style={{ fontSize: 9, color: 'var(--text-3)' }}>LIVE</span></>}
            {isMock && <span className="badge" style={{ color: 'var(--ember)', borderColor: 'rgba(200,94,40,0.3)' }}>DEMO</span>}
          </div>
        </div>

        {/* ── Identity */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif-bold" style={{ fontSize: 34, color: 'var(--text-1)', letterSpacing: 0.5, lineHeight: 1.1, marginBottom: topTitle ? 6 : 16 }}>
            {hero.display_name}
          </h1>
          {topTitle && (
            <p className="serif" style={{ fontSize: 13, color: 'var(--gold-dim)', fontStyle: 'italic', marginBottom: 14 }}>{topTitle.title_name}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
            <span className="badge" style={{ color: ac, borderColor: `${ac}45`, background: `${ac}10` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block' }} />
              {ALIGNMENT_LABEL[hero.alignment] ?? hero.alignment}
            </span>
            {sources.length > 0 && (
              <span className="badge">{sources.filter((s: any) => s.is_active).length} VENUE{sources.filter((s: any) => s.is_active).length !== 1 ? 'S' : ''}</span>
            )}
            {isInSession && (
              <span className="badge" style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)', animation: 'none' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 5px #34d399' }} /> IN SESSION
              </span>
            )}
            {!isInSession && wearable?.status && (
              <span className="badge" style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' }}>⌚ WRISTBAND</span>
            )}
            {hero.gear && <span className="badge" style={{ color: 'var(--bronze-hi)', borderColor: 'rgba(154,114,72,0.3)' }}>⚔ GEARED</span>}
          </div>

          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, letterSpacing: 1, color: 'var(--text-3)' }}>FATE LEVEL <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>{progression.fate_level}</span></span>
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{progression.total_xp.toLocaleString()} XP</span>
            </div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${prog * 100}%` }} /></div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'right', marginTop: 5 }}>
              {progression.xp_in_current_level.toLocaleString()} / {progression.xp_to_next_level.toLocaleString()} to level {progression.fate_level + 1}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)', marginTop: 8 }}>
            {[
              { val: progression.sessions_completed,        label: 'SESSIONS' },
              { val: progression.titles.length,             label: 'TITLES'   },
              { val: (hero.gear?.inventory ?? []).length,   label: 'GEAR'     },
              { val: progression.total_xp.toLocaleString(), label: 'FATE XP', accent: true },
            ].map((s, i) => (
              <div key={i} style={{ padding: '13px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span className="serif-bold" style={{ fontSize: 17, color: s.accent ? 'var(--gold)' : 'var(--text-1)' }}>{s.val}</span>
                <span style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Veil Activity (appears once there's history) */}
        <VeilActivitySection />

        {/* ── Training Snapshot */}
        <TrainingSection displayStreak={displayStreak} topStreak={topStreak} pillars={pillars} activeOath={activeOath} oathLoaded={oath !== undefined} weekEndMs={weekEndMs} />

        {/* ── Equipped Gear */}
        {equippedSlots.length > 0 && (
          <>
            <div className="divider"><span className="divider-label">EQUIPPED GEAR</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {equippedSlots.map(({ slot, item }, i) => {
                const rarity = item.rarity ?? item.rarity_tier ?? 'common';
                const rc = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
                return (
                  <div key={slot} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderBottom: i < equippedSlots.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: 3, alignSelf: 'stretch', flexShrink: 0, background: `linear-gradient(180deg, ${rc}cc, ${rc}44)` }} />
                    <div style={{ width: 40, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: `${rc}80` }}>{SLOT_ICON[slot] ?? '·'}</div>
                    <div style={{ flex: 1, minWidth: 0, padding: '10px 0' }}>
                      <p style={{ fontSize: 13, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.item_name ?? item.name ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: 2 }}>{slot.toUpperCase()}</p>
                    </div>
                    <div style={{ flexShrink: 0, padding: '0 14px' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: rc, textTransform: 'uppercase', background: `${rc}12`, border: `1px solid ${rc}30`, borderRadius: 4, padding: '2px 6px' }}>{rarity}</span>
                    </div>
                    {(rarity === 'legendary' || rarity === 'mythic') && (
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(90deg, transparent 0%, ${rc}08 50%, transparent 100%)` }} />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Best Venue */}
        {bestVenue && (
          <>
            <div className="divider"><span className="divider-label">BEST VENUE</span></div>
            <div className="card" style={{ padding: '14px 16px', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 4 }}>{bestVenue.source_name}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.sessions} sessions</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.boss_kills} boss kills</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{bestVenue.xp_contributed.toLocaleString()} XP</span>
                  </div>
                </div>
                {bestVenue.best_boss_pct >= 100 && (
                  <span style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 1, border: '1px solid var(--gold-dim)', padding: '3px 8px', borderRadius: 4 }}>VEIL CLEARED</span>
                )}
              </div>
              {bestVenue.best_boss_pct > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 9, color: 'var(--text-3)', letterSpacing: 1 }}>
                    <span>BEST RUN</span><span>{bestVenue.best_boss_pct}%</span>
                  </div>
                  <div className="xp-track" style={{ height: 3 }}>
                    <div className="xp-fill" style={{ width: `${bestVenue.best_boss_pct}%`, background: bestVenue.best_boss_pct >= 100 ? 'linear-gradient(90deg, var(--gold-dim), var(--gold))' : 'linear-gradient(90deg, var(--ember-dim), var(--ember))' }} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Share Fate Card */}
        <div style={{ marginTop: 28 }}>
          <button onClick={() => setShowCard(true)} style={{ width: '100%', padding: '16px 0', background: `linear-gradient(135deg, ${ac}18, ${ac}08)`, color: ac, border: `1px solid ${ac}50`, borderRadius: 12, fontFamily: 'var(--font-serif)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 0 20px ${ac}15` }}>
            <span style={{ fontSize: 16 }}>◈</span> Share Fate Card
          </button>
        </div>

        {/* ── Account */}
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="divider"><span className="divider-label">ACCOUNT</span></div>
          {onSwitchHero && (
            <button onClick={onSwitchHero} style={{ width: '100%', padding: '13px 0', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'var(--font-serif)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em' }}>Switch Hero</button>
          )}
          <button onClick={signOut} style={{ width: '100%', padding: '13px 0', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'var(--font-serif)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em', opacity: 0.6 }}>Sign Out</button>
        </div>
      </div>
      {showCard && <ShareFateCard onClose={() => setShowCard(false)} />}
      <CeremonyOverlay />
    </div>
  );
}

// ── Training Section ────────────────────────────────────────────────────────────
function TrainingSection({ displayStreak, topStreak, pillars, activeOath, oathLoaded, weekEndMs }: {
  displayStreak: number; topStreak: PillarData | null; pillars: PillarData[];
  activeOath: Oath | null; oathLoaded: boolean; weekEndMs: number;
}) {
  const remaining = useCountdown(weekEndMs);
  const hasSomething = displayStreak > 0 || pillars.length > 0 || activeOath || oathLoaded;
  if (!hasSomething) return null;
  return (
    <>
      <div className="divider"><span className="divider-label">TRAINING</span></div>
      {displayStreak > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, marginBottom: 10, background: 'linear-gradient(135deg, var(--surface), rgba(255,165,0,0.06))', border: '1px solid rgba(255,165,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 2 }}>ACTIVE STREAK</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
                {displayStreak} <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>days</span>
              </p>
            </div>
          </div>
          {topStreak && topStreak.longest_streak > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 2 }}>BEST</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,165,0,0.5)', fontFamily: 'var(--font-serif)' }}>{topStreak.longest_streak}</p>
            </div>
          )}
        </div>
      )}
      {pillars.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
          {pillars.map((p, i) => {
            const cfg = PILLAR[p.pillar] ?? PILLAR.forge;
            const total = (p.xp_in_level ?? 0) + (p.xp_to_next ?? 1);
            const pct = total > 0 ? Math.round(((p.xp_in_level ?? 0) / total) * 100) : 0;
            return (
              <div key={p.pillar} style={{ padding: '11px 14px', borderBottom: i < pillars.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ color: cfg.color, fontSize: 12, flexShrink: 0 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 9, color: cfg.color, letterSpacing: '0.12em', fontWeight: 700, flex: 1 }}>{cfg.label} · Lv {p.level}</span>
                  {(p.streak ?? 0) > 0 && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>🔥 {p.streak}d</span>}
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{p.xp_to_next.toLocaleString()} to next</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 2, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeOath && <OathCard oath={activeOath} remaining={remaining} />}
      {!activeOath && oathLoaded && (
        <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(255,165,0,0.04)', border: '1px solid rgba(255,165,0,0.1)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 14, opacity: 0.4 }}>◈</span>
          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>No active oath — declare one in <span style={{ color: 'var(--gold)' }}>Training → Oath</span>.</p>
        </div>
      )}
    </>
  );
}

function OathCard({ oath, remaining }: { oath: Oath; remaining: number }) {
  const cfg = PILLAR[oath.pillar] ?? PILLAR.forge;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 4, border: `1px solid ${cfg.color}35`, background: `linear-gradient(135deg, var(--surface) 60%, ${cfg.color}08)` }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: cfg.color, fontSize: 13 }}>{cfg.icon}</span>
            <span style={{ fontSize: 9, color: cfg.color, letterSpacing: '0.14em', fontWeight: 700 }}>ACTIVE OATH · {cfg.label}</span>
          </div>
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{formatDDHH(remaining)} left</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>"{oath.declaration}"</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 9, color: '#8AB06A', background: 'rgba(106,138,90,0.1)', border: '1px solid rgba(106,138,90,0.2)', borderRadius: 6, padding: '3px 8px' }}>+200 XP if kept</span>
          <span style={{ fontSize: 9, color: 'var(--ember)', background: 'rgba(200,94,40,0.06)', border: '1px solid rgba(200,94,40,0.15)', borderRadius: 6, padding: '3px 8px' }}>−50 XP debt if broken</span>
        </div>
      </div>
    </div>
  );
}

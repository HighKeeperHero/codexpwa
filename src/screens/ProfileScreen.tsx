// src/screens/ProfileScreen.tsx
// Sprint 10: Trophy Room — MILESTONES section added to Profile tab
// Pure client-side computation from hero data; no new backend calls needed.
import { useState, useEffect } from 'react';
import { useAuth }             from '../AuthContext';
import { VaultScreen }         from './VaultScreen';
import { LeaderboardScreen }   from './LeaderboardScreen';
import { ChronicleScreen }     from './ChronicleScreen';
import { TIER_FOR_LEVEL, ALIGNMENT_COLOR, ALIGNMENT_LABEL } from '../api/pik';

const BASE = 'https://pik-prd-production.up.railway.app';
type Tab = 'profile' | 'rankings' | 'vault' | 'chronicle' | 'wristband';

function unwrap(json: any): any {
  const d = json?.data;
  if (d !== null && d !== undefined && typeof d === 'object' && 'data' in d) return d.data;
  return d ?? json;
}

// ── Trophy definitions ────────────────────────────────────────────────────────

interface TrophyDef {
  id:     string;
  name:   string;
  lore:   string;
  hint:   string;
  icon:   string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  check:  (h: any, extras: { fateSeals: number }) => boolean;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: '#FFA500',
  epic:      '#A855F7',
  rare:      '#1E90FF',
  uncommon:  '#34d399',
  common:    '#8899AA',
};

const TROPHIES: TrophyDef[] = [
  // common
  { id: 'first_session',    name: 'First Blood',    rarity: 'common',
    lore: 'The Veil has tasted your resolve.',        hint: 'Complete your first session.',      icon: '⚔',
    check: h => (h.progression?.sessions_completed ?? 0) >= 1 },
  { id: 'wristband_linked', name: 'Marked',          rarity: 'common',
    lore: 'Your wrist bears the sigil of the Codex.', hint: 'Link a wristband to your hero.',    icon: '⌚',
    check: h => !!h.wearable && h.wearable.status !== undefined },
  { id: 'first_gear',       name: 'Armed',           rarity: 'common',
    lore: 'A warrior without steel is just noise.',   hint: 'Acquire your first piece of gear.', icon: '⬡',
    check: h => (h.gear?.inventory ?? []).length >= 1 },
  { id: 'first_title',      name: 'Named',           rarity: 'common',
    lore: 'The Chronicle whispers your title.',        hint: 'Earn your first title.',            icon: '◇',
    check: h => (h.progression?.titles ?? []).length >= 1 },
  // uncommon
  { id: 'first_cache',  name: 'Fate Sealed', rarity: 'uncommon',
    lore: 'The Veil delivers what it owes.',       hint: 'Receive your first Fate Seal.', icon: '⊕',
    check: (_h, ex) => ex.fateSeals >= 1 },
  { id: 'sessions_5',   name: 'Returning',   rarity: 'uncommon',
    lore: 'Five times the dark could not hold you.', hint: 'Complete 5 sessions.',        icon: '⚔',
    check: h => (h.progression?.sessions_completed ?? 0) >= 5 },
  { id: 'fate_5',       name: 'Fate Rising', rarity: 'uncommon',
    lore: 'The Codex records your growth.',         hint: 'Reach Fate Level 5.',          icon: '◈',
    check: h => (h.progression?.fate_level ?? 1) >= 5 },
  { id: 'gear_3',       name: 'Arsenal',     rarity: 'uncommon',
    lore: "You carry the weight of the Veil's debt.", hint: 'Acquire 3 pieces of gear.',  icon: '⬡',
    check: h => (h.gear?.inventory ?? []).length >= 3 },
  // rare
  { id: 'first_boss',  name: 'Veil Hunter',    rarity: 'rare',
    lore: 'Something ancient noticed you. Good.', hint: 'Slay your first boss.', icon: '◈',
    check: h => (h.progression?.boss_kills ?? 0) >= 1 },
  { id: 'titles_3',    name: 'Renowned',       rarity: 'rare',
    lore: 'Three names. The same story.',         hint: 'Earn 3 titles.',        icon: '◇',
    check: h => (h.progression?.titles ?? []).length >= 3 },
  { id: 'sessions_10', name: 'Veteran',        rarity: 'rare',
    lore: 'Ten descents. Still standing.',        hint: 'Complete 10 sessions.', icon: '⚔',
    check: h => (h.progression?.sessions_completed ?? 0) >= 10 },
  { id: 'fate_10',     name: 'Fate Hardened',  rarity: 'rare',
    lore: 'The Kernel acknowledges what you are.', hint: 'Reach Fate Level 10.', icon: '◈',
    check: h => (h.progression?.fate_level ?? 1) >= 10 },
  // epic
  { id: 'boss_5',   name: 'Beast Slayer',   rarity: 'epic',
    lore: 'Five kills. The dark remembers.',    hint: 'Defeat 5 bosses.',       icon: '◈',
    check: h => (h.progression?.boss_kills ?? 0) >= 5 },
  { id: 'fate_15',  name: 'Fate Ascendant', rarity: 'epic',
    lore: 'What you were before does not apply.', hint: 'Reach Fate Level 15.', icon: '◈',
    check: h => (h.progression?.fate_level ?? 1) >= 15 },
  // legendary
  { id: 'veil_cleared', name: 'Veil Shattered', rarity: 'legendary',
    lore: 'You ran the dark to its end. Now what?', hint: 'Clear the Veil at 100%.', icon: '◈',
    check: h => (h.source_progression ?? []).some((v: any) => v.best_boss_pct >= 100) },
  { id: 'fate_18', name: 'Mythic', rarity: 'legendary',
    lore: 'The Codex has no more words for what you are.', hint: 'Reach Fate Level 18.', icon: '◈',
    check: h => (h.progression?.fate_level ?? 1) >= 18 },
];

// ── Trophy Room ───────────────────────────────────────────────────────────────

function TrophyRoom({ hero, fateSeals }: { hero: any; fateSeals: number }) {
  const extras = { fateSeals };
  const earned = TROPHIES.filter(t => t.check(hero, extras));
  const locked = TROPHIES.filter(t => !t.check(hero, extras));
  const pct    = Math.round((earned.length / TROPHIES.length) * 100);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,165,0,0.55)', margin: '0 0 3px' }}>Milestones</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{earned.length} / {TROPHIES.length} unlocked</p>
        </div>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
          color: pct >= 75 ? 'var(--gold)' : pct >= 40 ? '#A855F7' : 'var(--text-2)' }}>{pct}%</span>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--sapphire), var(--gold))',
          borderRadius: 2, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>

      {earned.length > 0 && (
        <>
          <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Earned</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
            {earned.map(t => <TrophyCard key={t.id} trophy={t} earned />)}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Locked</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {locked.map(t => <TrophyCard key={t.id} trophy={t} earned={false} />)}
          </div>
        </>
      )}
    </div>
  );
}

function TrophyCard({ trophy, earned }: { trophy: TrophyDef; earned: boolean }) {
  const rc = RARITY_COLOR[trophy.rarity];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      background: earned ? `linear-gradient(90deg, var(--surface), ${rc}0A)` : 'var(--surface)',
      border: `1px solid ${earned ? rc + '35' : 'var(--border)'}`,
      borderRadius: 10, padding: '10px 13px', opacity: earned ? 1 : 0.45 }}>
      <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8,
        background: earned ? `${rc}12` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${earned ? rc + '30' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: earned ? 15 : 13, color: earned ? rc : 'rgba(255,255,255,0.12)',
        filter: earned ? `drop-shadow(0 0 6px ${rc}50)` : 'none' }}>
        {earned ? trophy.icon : '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
            color: earned ? 'var(--text-1)' : 'var(--text-3)', margin: 0 }}>
            {earned ? trophy.name : '???'}
          </p>
          {earned && (
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: rc,
              background: `${rc}15`, border: `1px solid ${rc}30`, borderRadius: 3,
              padding: '1px 5px', textTransform: 'uppercase' }}>{trophy.rarity}</span>
          )}
        </div>
        <p style={{ fontSize: 11, margin: 0, lineHeight: 1.4,
          color: earned ? 'var(--text-2)' : 'var(--text-3)',
          fontStyle: earned ? 'italic' : 'normal' }}>
          {earned ? trophy.lore : trophy.hint}
        </p>
      </div>
      {earned && <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: rc, boxShadow: `0 0 6px ${rc}` }} />}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProfileScreen({ onReturnToHeroSelect }: { onReturnToHeroSelect?: () => void }) {
  const { hero, signOut } = useAuth();
  const [tab, setTab]                 = useState<Tab>('profile');
  const [sealedCount, setSealedCount] = useState(0);

  useEffect(() => {
    if (!hero?.root_id) return;
    fetch(`${BASE}/api/users/${hero.root_id}/caches`)
      .then(r => r.json()).then(j => {
        const list = unwrap(j);
        setSealedCount((Array.isArray(list) ? list : []).filter((c: any) => c.status === 'sealed').length);
      }).catch(() => {});
  }, [hero?.root_id]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'profile',   label: 'Profile'     },
    { id: 'rankings',  label: 'Leaderboard' },
    { id: 'vault',     label: 'Vault', badge: sealedCount },
    { id: 'chronicle', label: 'Chronicle'   },
    { id: 'wristband', label: 'Wristband'   },
  ];

  if (!hero) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
      <p style={{ color: 'var(--text-3)', fontFamily: 'Cinzel, serif', fontSize: 13 }}>No hero selected.</p>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, bottom: 'calc(var(--tab-h) + var(--safe-bottom))',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0, paddingTop: 'env(safe-area-inset-top)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '12px 2px', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t.id ? 'var(--gold)' : 'var(--text-3)',
            fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: '0.04em',
            textTransform: 'uppercase', cursor: 'pointer', position: 'relative' }}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)',
                background: 'var(--ember)', color: '#fff', borderRadius: 999,
                fontSize: 9, fontFamily: 'monospace', padding: '1px 5px', fontWeight: 700, lineHeight: 1.4 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'profile'   && <ProfileTab hero={hero} onSignOut={signOut} onReturnToHeroSelect={onReturnToHeroSelect} />}
        {tab === 'rankings'  && <LeaderboardScreen />}
        {tab === 'vault'     && <VaultScreen />}
        {tab === 'chronicle' && <ChronicleScreen />}
        {tab === 'wristband' && <WristbandTab rootId={hero.root_id} />}
      </div>
    </div>
  );
}

function ProfileTab({ hero, onSignOut, onReturnToHeroSelect }: {
  hero: any; onSignOut: () => void; onReturnToHeroSelect?: () => void;
}) {
  const prog      = hero.progression;
  const level     = prog?.fate_level ?? 1;
  const xp        = prog?.total_xp ?? prog?.fate_xp ?? 0;
  const xpToNext  = prog?.xp_to_next_level ?? 500;
  const xpIn      = prog?.xp_in_current_level ?? (xp % xpToNext);
  const pct       = Math.min(100, Math.round((xpIn / xpToNext) * 100));
  const tier      = TIER_FOR_LEVEL(level);
  const alignment = hero.alignment ?? 'NONE';
  const aColor    = ALIGNMENT_COLOR[alignment] ?? '#9ca3af';

  const equippedTitleId = prog?.equipped_title as string | null;
  const titlesArr       = (prog?.titles ?? []) as any[];
  const equippedDisplay = (() => {
    if (!equippedTitleId) return null;
    const match = titlesArr.find((t: any) => (t.title_id ?? t) === equippedTitleId);
    if (match) return (match.title_name ?? match.display_name ?? match) as string;
    return equippedTitleId.replace(/^title_/, '').replace(/_/g, ' ').toUpperCase();
  })();

  const fateSeals = (hero.source_progression ?? [])
    .reduce((sum: number, v: any) => sum + (v.caches_granted ?? 0), 0);
  const gearFound = (hero.gear?.inventory ?? []).length;

  const statBlocks = [
    { label: 'Sessions',   value: prog?.sessions_completed ?? 0 },
    { label: 'Boss Kills', value: prog?.boss_kills ?? 0 },
    { label: 'Fate Seals', value: fateSeals },
    { label: 'Gear Found', value: gearFound },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Identity card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `radial-gradient(circle, ${aColor}30 0%, transparent 70%)`,
            border: `1px solid ${aColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontSize: 20, color: aColor }}>
            {(hero.display_name ?? hero.hero_name ?? '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700,
              color: 'var(--text-1)', margin: '0 0 2px' }}>
              {hero.display_name ?? hero.hero_name}
            </p>
            {equippedDisplay && (
              <p style={{ fontSize: 11, color: 'var(--gold)', margin: '0 0 4px', letterSpacing: '0.06em' }}>
                {equippedDisplay}
              </p>
            )}
            <p style={{ fontSize: 12, color: aColor, margin: 0, letterSpacing: '0.05em' }}>
              {ALIGNMENT_LABEL[alignment] ?? alignment}
            </p>
          </div>
          <div style={{ background: 'var(--bg)', border: `1px solid ${tier.color}`,
            borderRadius: 8, padding: '4px 10px', flexShrink: 0, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: tier.color,
              margin: '0 0 1px', letterSpacing: '0.1em' }}>{tier.name}</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
              color: tier.color, margin: 0 }}>Lv {level}</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FATE XP</span>
          <span style={{ fontSize: 10, color: tier.color, fontFamily: 'monospace' }}>{xp.toLocaleString()} XP</span>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
            borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
        {statBlocks.map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700,
              color: 'var(--text-1)', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0,
              letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Trophy Room */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '16px 14px', marginBottom: 14 }}>
        <TrophyRoom hero={hero} fateSeals={fateSeals} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {onReturnToHeroSelect && (
          <button onClick={onReturnToHeroSelect} style={{ width: '100%', padding: '12px 0',
            background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)',
            borderRadius: 10, fontFamily: 'Cinzel, serif', fontSize: 13, cursor: 'pointer',
            letterSpacing: '0.05em' }}>Switch Hero</button>
        )}
        <button onClick={onSignOut} style={{ width: '100%', padding: '12px 0', background: 'transparent',
          color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 10,
          fontFamily: 'Cinzel, serif', fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function WristbandTab({ rootId }: { rootId: string }) {
  const [wearables, setWearables] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/wearables/${rootId}`)
      .then(r => r.json()).then(j => setWearables(unwrap(j) ?? []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [rootId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ color: 'var(--text-3)', fontFamily: 'Cinzel, serif', fontSize: 13 }}>Scanning…</p>
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'var(--text-3)',
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Linked Wristbands</p>
      {wearables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, color: 'var(--text-3)', opacity: 0.4, marginBottom: 12 }}>◌</div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px' }}>No Wristband Linked</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
            Tap your wristband at a Heroes Veritas terminal to link it to this hero.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wearables.map((w: any) => (
            <div key={w.token_id ?? w.token_uid} style={{ background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-1)', margin: '0 0 4px' }}>
                {w.friendly_name ?? 'Wristband'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 2px' }}>
                UID: <span style={{ fontFamily: 'monospace', color: 'var(--gold)', letterSpacing: '0.05em' }}>{w.token_uid}</span>
              </p>
              {w.last_tap_at && (
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                  Last tap: {new Date(w.last_tap_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

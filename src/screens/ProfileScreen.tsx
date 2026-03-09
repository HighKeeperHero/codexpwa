// src/screens/ProfileScreen.tsx
// ============================================================
// Archive screen — tabs: Profile | Rankings | Vault | Chronicle | Wristband
// Sprint 8+: LeaderboardScreen + ChronicleScreen added
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { VaultScreen } from './VaultScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { ChronicleScreen } from './ChronicleScreen';
import {
  TIER_FOR_LEVEL,
  ALIGNMENT_COLOR,
  ALIGNMENT_LABEL,
} from '../api/pik';

const BASE = 'https://pik-prd-production.up.railway.app';

// ── Tab type ──────────────────────────────────────────────────
type Tab = 'profile' | 'rankings' | 'vault' | 'chronicle' | 'wristband';

// ── Main ──────────────────────────────────────────────────────
export function ProfileScreen({ onReturnToHeroSelect }: { onReturnToHeroSelect?: () => void }) {
  const { hero, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  // Vault badge: count sealed caches
  const [sealedCount, setSealedCount] = useState(0);
  useEffect(() => {
    if (!hero?.root_id) return;
    fetch(`${BASE}/api/users/${hero.root_id}/caches`)
      .then(r => r.json())
      .then(j => {
        const sealed = (j?.data ?? []).filter((c: any) => c.status === 'sealed').length;
        setSealedCount(sealed);
      })
      .catch(() => {});
  }, [hero?.root_id]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'profile',   label: 'Profile' },
    { id: 'rankings',  label: 'Leaderboard' },
    { id: 'vault',     label: 'Vault',     badge: sealedCount },
    { id: 'chronicle', label: 'Chronicle' },
    { id: 'wristband', label: 'Wristband' },
  ];

  if (!hero) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: '100%', padding: 32 }}>
      <p style={{ color: 'rgba(232, 224, 204, 0.45)', fontFamily: 'Cinzel, serif', fontSize: 13 }}>No hero selected.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '12px 2px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t.id ? 'var(--gold)' : 'rgba(232, 224, 204, 0.45)',
              fontFamily: 'Cinzel, serif',
              fontSize: 8,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: 'calc(50% - 18px)',
                background: 'var(--ember)',
                color: '#fff',
                borderRadius: 999,
                fontSize: 9,
                fontFamily: 'monospace',
                padding: '1px 5px',
                fontWeight: 700,
                lineHeight: 1.4,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
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

// ── Profile Tab ───────────────────────────────────────────────
function ProfileTab({
  hero,
  onSignOut,
  onReturnToHeroSelect,
}: {
  hero: any;
  onSignOut: () => void;
  onReturnToHeroSelect?: () => void;
}) {
  const prog      = hero.progression;
  const level     = prog?.fate_level ?? 1;
  const xp        = prog?.fate_xp ?? 0;
  const xpToNext  = prog?.xp_to_next_level ?? 500;
  const pct       = Math.min(100, Math.round((xp % xpToNext) / xpToNext * 100));
  const tier      = TIER_FOR_LEVEL(level);
  const alignment = hero.alignment ?? 'NONE';
  const aColor    = ALIGNMENT_COLOR[alignment] ?? '#9ca3af';

  const statBlocks = [
    { label: 'Sessions',   value: prog?.sessions_completed ?? 0 },
    { label: 'Boss Kills', value: prog?.boss_kills ?? 0 },
    { label: 'Fate Seals', value: prog?.caches_granted ?? 0 },
    { label: 'Gear Found', value: prog?.gear_acquired ?? 0 },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Hero card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `radial-gradient(circle, ${aColor}30 0%, transparent 70%)`,
            border: `1px solid ${aColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontSize: 20, color: aColor,
          }}>
            {(hero.display_name ?? hero.hero_name ?? '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700, color: '#e8e0cc', margin: '0 0 2px' }}>
              {hero.display_name ?? hero.hero_name}
            </p>
            {prog?.equipped_title && (
              <p style={{ fontSize: 11, color: 'var(--gold)', margin: '0 0 4px', letterSpacing: '0.06em' }}>
                {prog.equipped_title.replace(/^title_/,'').replace(/_/g,' ').toUpperCase()}
              </p>
            )}
            <p style={{ fontSize: 12, color: aColor, margin: 0, letterSpacing: '0.05em' }}>
              {ALIGNMENT_LABEL[alignment] ?? alignment}
            </p>
          </div>
          <div style={{
            background: 'var(--bg)', border: `1px solid ${tier.color}`,
            borderRadius: 8, padding: '4px 10px', flexShrink: 0, textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: tier.color, margin: '0 0 1px', letterSpacing: '0.1em' }}>{tier.name}</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: tier.color, margin: 0 }}>Lv {level}</p>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(232, 224, 204, 0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FATE XP</span>
            <span style={{ fontSize: 10, color: tier.color, fontFamily: 'monospace' }}>{xp.toLocaleString()} XP</span>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
              borderRadius: 4, transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {statBlocks.map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#e8e0cc', margin: '0 0 4px' }}>
              {s.value}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {onReturnToHeroSelect && (
          <button
            onClick={onReturnToHeroSelect}
            style={{
              width: '100%', padding: '12px 0',
              background: 'var(--surface)', color: 'rgba(232, 224, 204, 0.45)',
              border: '1px solid var(--border)', borderRadius: 10,
              fontFamily: 'Cinzel, serif', fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            Switch Hero
          </button>
        )}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', color: '#9ca3af',
            border: '1px solid var(--border)', borderRadius: 10,
            fontFamily: 'Cinzel, serif', fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Wristband Tab ─────────────────────────────────────────────
function WristbandTab({ rootId }: { rootId: string }) {
  const [wearables, setWearables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/wearables/${rootId}`)
      .then(r => r.json())
      .then(j => setWearables(j?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rootId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ color: 'rgba(232, 224, 204, 0.45)', fontFamily: 'Cinzel, serif', fontSize: 13 }}>Scanning…</p>
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: 10,
        color: 'rgba(232, 224, 204, 0.45)', letterSpacing: '0.15em',
        textTransform: 'uppercase', marginBottom: 12,
      }}>Linked Wristbands</p>
      {wearables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, color: 'rgba(232, 224, 204, 0.45)', opacity: 0.4, marginBottom: 12 }}>◌</div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'rgba(232, 224, 204, 0.45)', margin: '0 0 8px' }}>
            No Wristband Linked
          </p>
          <p style={{ fontSize: 13, color: 'rgba(232, 224, 204, 0.45)', opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
            Tap your wristband at a Heroes Veritas terminal to link it to this hero.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wearables.map((w: any) => (
            <div key={w.token_id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#e8e0cc', margin: '0 0 4px' }}>
                {w.friendly_name ?? 'Wristband'}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: '0 0 2px' }}>
                UID: <span style={{ fontFamily: 'monospace', color: 'var(--gold)', letterSpacing: '0.05em' }}>{w.token_uid}</span>
              </p>
              {w.last_tap_at && (
                <p style={{ fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: 0 }}>
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

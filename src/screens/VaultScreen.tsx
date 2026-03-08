// src/screens/VaultScreen.tsx
// ============================================================
// Sprint 8 — Vault Tab (inside Archive)
// Sections: Fate Caches | Titles | Gear Loadout
// ============================================================

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '../AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

// ── Types ─────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface SealedCache {
  cache_id:   string;
  cache_type: string;
  rarity:     Rarity;
  label:      string;
  status:     'sealed' | 'opened';
  trigger:    string;
  granted_at: string;
}

interface CacheReward {
  reward_type:  string;
  reward_value: string;
  display_name: string;
  rarity_tier:  Rarity;
  xp_granted?:  number;
  message?:     string;
}

interface TitleEntry {
  title_id:     string;
  display_name: string;
  category:     string;
  description:  string | null;
  is_earned:    boolean;
  is_equipped:  boolean;
  granted_at:   string | null;
}

interface GearItem {
  inventory_id: string;
  item_id:      string;
  item_name:    string;
  slot:         string;
  rarity_tier:  Rarity;
  icon:         string;
  description:  string;
  is_equipped:  boolean;
  modifiers:    Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────────

const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#9ca3af',
  uncommon:  '#34d399',
  rare:      '#60a5fa',
  epic:      '#a78bfa',
  legendary: '#f59e0b',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common:    'rgba(156,163,175,0.15)',
  uncommon:  'rgba(52,211,153,0.2)',
  rare:      'rgba(96,165,250,0.2)',
  epic:      'rgba(167,139,250,0.25)',
  legendary: 'rgba(245,158,11,0.3)',
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

const GEAR_SLOTS = ['weapon','helm','chest','arms','legs','rune'] as const;
const GEAR_SLOT_ICON: Record<string, string> = {
  weapon: '⚔', helm: '⛑', chest: '🔰', arms: '🦾', legs: '👢', rune: '◈',
};
const GEAR_SLOT_LABEL: Record<string, string> = {
  weapon: 'Weapon', helm: 'Helm', chest: 'Chest', arms: 'Arms', legs: 'Legs', rune: 'Rune',
};

const CATEGORY_LABEL: Record<string, string> = {
  fate: 'Fate', boss: 'Combat', session: 'Session', meta: 'Realm', training: 'Training', general: 'General',
};

// ── Main Component ────────────────────────────────────────────

export function VaultScreen() {
  const { hero, sessionToken, refreshHero } = useAuth();

  // ── Caches state
  const [caches, setCaches]         = useState<SealedCache[]>([]);
  const [openingId, setOpeningId]   = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<SealedCache | null>(null);
  const [reward, setReward]         = useState<CacheReward | null>(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  // ── Titles state
  const [titles, setTitles]         = useState<TitleEntry[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(true);
  const [equippingTitle, setEquippingTitle] = useState<string | null>(null);

  // ── Section state
  type Section = 'caches' | 'titles' | 'gear';
  const [section, setSection] = useState<Section>('caches');

  const rootId = hero?.root_id;

  // ── Fetch caches ──────────────────────────────────────────

  const fetchCaches = useCallback(async () => {
    if (!rootId) return;
    setCacheLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/caches`);
      const json = await res.json();
      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setCaches((raw as SealedCache[]).filter(c => c.status === 'sealed'));
    } catch {}
    finally { setCacheLoading(false); }
  }, [rootId]);

  useEffect(() => { fetchCaches(); }, [fetchCaches]);

  // ── Fetch titles ──────────────────────────────────────────

  const fetchTitles = useCallback(async () => {
    if (!rootId || !sessionToken) return;
    setTitlesLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/titles`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const json = await res.json();
      const titleData = json?.data;
      setTitles(Array.isArray(titleData) ? titleData : Array.isArray(json) ? json : []);
    } catch {
      // Fallback: build from hero object if endpoint not yet deployed
      if (hero?.progression?.titles) {
        const equipped = hero.progression.equipped_title;
        setTitles(hero.progression.titles.map((t: any) => ({
          title_id:     t.title_id ?? t,
          display_name: t.title_name ?? (typeof t === 'string' ? t.replace(/^title_/,'').replace(/_/g,' ').toUpperCase() : t),
          category:     t.category ?? 'general',
          description:  t.description ?? null,
          is_earned:    true,
          is_equipped:  (t.title_id ?? t) === equipped,
          granted_at:   t.granted_at ?? null,
        })));
      }
    }
    finally { setTitlesLoading(false); }
  }, [rootId, sessionToken, hero]);

  useEffect(() => { fetchTitles(); }, [fetchTitles]);

  // ── Open cache ────────────────────────────────────────────

  const handleOpenCache = async (cache: SealedCache) => {
    if (!rootId || !sessionToken) return;
    setOpeningId(cache.cache_id);
    setPendingOpen(null);
    setReward(null);

    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/caches/${cache.cache_id}/open`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to open');

      const r: CacheReward = json?.data ?? json;
      setReward(r);
      await fetchCaches();
      await refreshHero();
      if (r.reward_type === 'title') await fetchTitles();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to open cache');
    } finally {
      setOpeningId(null);
    }
  };

  // ── Equip title ───────────────────────────────────────────

  const handleEquipTitle = async (titleId: string, isEquipped: boolean) => {
    if (!rootId || !sessionToken) return;
    setEquippingTitle(titleId);
    try {
      const target = isEquipped ? 'none' : titleId;
      const res = await fetch(`${BASE}/api/users/${rootId}/titles/${target}/equip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed');
      await fetchTitles();
      await refreshHero();
    } catch {}
    finally { setEquippingTitle(null); }
  };

  // ── Equip gear ────────────────────────────────────────────

  const handleEquipGear = async (inventoryId: string) => {
    if (!rootId || !sessionToken) return;
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/gear/${inventoryId}/equip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed');
      await refreshHero();
    } catch {}
  };

  const inventoryRaw = hero?.gear?.inventory;
  const inventory: GearItem[] = Array.isArray(inventoryRaw) ? inventoryRaw as GearItem[] : [];
  const equipment = (hero?.gear?.equipment ?? {}) as Record<string, GearItem | null>;

  const safeTitles = Array.isArray(titles) ? titles : [];
  const earnedTitles  = safeTitles.filter(t => t.is_earned);
  const lockedTitles  = safeTitles.filter(t => !t.is_earned);

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* Section pills */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 16px 0',
        position: 'sticky', top: 0, zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--bg)',
      }}>
        {(['caches','titles','gear'] as Section[]).map(s => {
          const labels = { caches: 'Fate Caches', titles: 'Titles', gear: 'Gear' };
          const counts = {
            caches: caches.length > 0 ? caches.length : 0,
            titles: earnedTitles.length,
            gear:   inventory.length,
          };
          return (
            <button
              key={s}
              onClick={() => setSection(s)}
              style={{
                flex: 1, padding: '8px 4px',
                background:  section === s ? 'var(--gold)' : 'var(--surface)',
                color:       section === s ? '#0B0A08' : 'rgba(232, 224, 204, 0.45)',
                border:      `1px solid ${section === s ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 8,
                fontFamily: 'Cinzel, serif',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span>{labels[s]}</span>
              {counts[s] > 0 && (
                <span style={{
                  fontSize: 9,
                  background: section === s ? 'rgba(0,0,0,0.2)' : 'var(--gold)',
                  color: section === s ? '#0B0A08' : '#0B0A08',
                  borderRadius: 999, padding: '1px 6px',
                  fontFamily: 'monospace',
                }}>
                  {counts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CACHES ───────────────────────────────────────── */}
      {section === 'caches' && (
        <div style={{ padding: '20px 16px 0' }}>

          {/* Reward reveal overlay */}
          {reward && (
            <RewardReveal
              reward={reward}
              onDismiss={() => setReward(null)}
            />
          )}

          {/* Pending open confirmation */}
          {pendingOpen && !reward && (
            <div style={{
              background: 'var(--surface)',
              border: `1px solid ${RARITY_COLOR[pendingOpen.rarity]}`,
              borderRadius: 12, padding: 20, marginBottom: 16,
              boxShadow: `0 0 24px ${RARITY_GLOW[pendingOpen.rarity]}`,
            }}>
              <p style={{
                fontFamily: 'Cinzel, serif', fontSize: 13,
                color: RARITY_COLOR[pendingOpen.rarity],
                margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{pendingOpen.label}</p>
              <p style={{ color: 'rgba(232, 224, 204, 0.45)', fontSize: 13, margin: '0 0 16px', fontStyle: 'italic' }}>
                "The seal holds what the Veil has set aside for you."
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleOpenCache(pendingOpen)}
                  disabled={openingId !== null}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: RARITY_COLOR[pendingOpen.rarity],
                    color: '#0B0A08', border: 'none', borderRadius: 8,
                    fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
                    cursor: openingId ? 'wait' : 'pointer',
                  }}
                >
                  {openingId ? 'Opening…' : 'Break the Seal'}
                </button>
                <button
                  onClick={() => setPendingOpen(null)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent', color: 'rgba(232, 224, 204, 0.45)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {cacheLoading ? (
            <p style={{ color: 'rgba(232, 224, 204, 0.45)', textAlign: 'center', fontSize: 13, marginTop: 32 }}>Loading caches…</p>
          ) : caches.length === 0 ? (
            <EmptyState
              icon="⬡"
              title="The Vault is Empty"
              body="Caches are granted by leveling up, defeating bosses, and completing milestones. Return after your next session."
            />
          ) : (
            <>
              <p style={{
                fontFamily: 'Cinzel, serif', fontSize: 10,
                color: 'rgba(232, 224, 204, 0.45)', letterSpacing: '0.15em',
                textTransform: 'uppercase', marginBottom: 12,
              }}>
                {caches.length} SEALED {caches.length === 1 ? 'CACHE' : 'CACHES'} AWAITING
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {caches.map(c => (
                  <CacheCard
                    key={c.cache_id}
                    cache={c}
                    isOpening={openingId === c.cache_id}
                    onTap={() => { setPendingOpen(c); setReward(null); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TITLES ───────────────────────────────────────── */}
      {section === 'titles' && (
        <div style={{ padding: '20px 16px 0' }}>
          {titlesLoading ? (
            <p style={{ color: 'rgba(232, 224, 204, 0.45)', textAlign: 'center', fontSize: 13, marginTop: 32 }}>Loading titles…</p>
          ) : earnedTitles.length === 0 && lockedTitles.length === 0 ? (
            <EmptyState
              icon="◈"
              title="No Titles Yet"
              body="Titles are earned through sessions, pillar mastery, and combat milestones."
            />
          ) : (
            <>
              {earnedTitles.length > 0 && (
                <>
                  <SectionLabel>Earned</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {earnedTitles.map(t => (
                      <TitleCard
                        key={t.title_id}
                        title={t}
                        isEquipping={equippingTitle === t.title_id}
                        onEquip={() => handleEquipTitle(t.title_id, t.is_equipped)}
                      />
                    ))}
                  </div>
                </>
              )}
              {lockedTitles.length > 0 && (
                <>
                  <SectionLabel>Locked</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lockedTitles.map(t => (
                      <LockedTitleCard key={t.title_id} title={t} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GEAR ─────────────────────────────────────────── */}
      {section === 'gear' && (
        <div style={{ padding: '20px 16px 0' }}>

          {/* Loadout grid */}
          <SectionLabel>Loadout</SectionLabel>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8, marginBottom: 24,
          }}>
            {GEAR_SLOTS.map(slot => {
              const item = equipment[slot] as GearItem | null | undefined;
              return (
                <GearSlotCard
                  key={slot}
                  slot={slot}
                  item={item ?? null}
                />
              );
            })}
          </div>

          {/* Inventory */}
          <SectionLabel>Inventory</SectionLabel>
          {inventory.length === 0 ? (
            <EmptyState
              icon="⊕"
              title="Inventory Empty"
              body="Open Fate Caches to earn gear. Your loadout awaits."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventory.filter(i => !i.is_equipped).map(item => (
                <InventoryCard
                  key={item.inventory_id}
                  item={item}
                  onEquip={() => handleEquipGear(item.inventory_id)}
                />
              ))}
              {inventory.filter(i => !i.is_equipped).length === 0 && (
                <p style={{ color: 'rgba(232, 224, 204, 0.45)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  All items equipped.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: 'Cinzel, serif', fontSize: 10,
      color: 'rgba(232, 224, 204, 0.45)', letterSpacing: '0.15em',
      textTransform: 'uppercase', marginBottom: 10, marginTop: 0,
    }}>{children}</p>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: 'rgba(232, 224, 204, 0.45)', opacity: 0.4 }}>{icon}</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'rgba(232, 224, 204, 0.45)', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 13, color: 'rgba(232, 224, 204, 0.45)', opacity: 0.7, margin: 0, lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

// ── Cache Card ────────────────────────────────────────────────

function CacheCard({ cache, isOpening, onTap }: {
  cache: SealedCache;
  isOpening: boolean;
  onTap: () => void;
}) {
  const color = RARITY_COLOR[cache.rarity];
  const glow  = RARITY_GLOW[cache.rarity];

  const cacheTypeLabel: Record<string, string> = {
    level_up:  'Level Up', boss_kill: 'Boss Kill', milestone: 'Milestone',
  };
  const triggerNum = cache.trigger.split(':')[1];

  return (
    <button
      onClick={onTap}
      disabled={isOpening}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--surface)',
        border: `1px solid ${color}`,
        borderRadius: 12, padding: '14px 16px',
        boxShadow: `0 0 16px ${glow}`,
        cursor: isOpening ? 'wait' : 'pointer',
        opacity: isOpening ? 0.7 : 1,
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Rarity hex icon */}
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        border: `1px solid ${color}`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        ⬡
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
          color: '#e8e0cc', margin: '0 0 2px',
        }}>{cache.label}</p>
        <p style={{
          fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: '0 0 2px',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {cacheTypeLabel[cache.cache_type] ?? cache.cache_type}
          {triggerNum ? ` · ${triggerNum}` : ''}
        </p>
        <p style={{
          fontSize: 11, color,
          margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
        }}>{RARITY_LABEL[cache.rarity]}</p>
      </div>
      <div style={{ color, fontSize: 18, flexShrink: 0 }}>›</div>
    </button>
  );
}

// ── Reward Reveal ─────────────────────────────────────────────

function RewardReveal({ reward, onDismiss }: { reward: CacheReward; onDismiss: () => void }) {
  const rarity = (reward.rarity_tier ?? 'common') as Rarity;
  const color  = RARITY_COLOR[rarity];
  const glow   = RARITY_GLOW[rarity];

  const rewardIcon: Record<string, string> = {
    xp_boost: '✦', title: '◈', gear: '⚔', marker: '⬡',
  };
  const rewardTypeLabel: Record<string, string> = {
    xp_boost: 'Fate XP', title: 'Title Unlocked', gear: 'Gear Found', marker: 'Lore Fragment',
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(11,10,8,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 24px ${glow}; } 50% { box-shadow: 0 0 60px ${color}40; } }
      `}</style>
      <div
        style={{
          background: 'var(--surface)',
          border: `2px solid ${color}`,
          borderRadius: 16, padding: '40px 28px',
          textAlign: 'center', maxWidth: 300, width: '100%',
          animation: 'glowPulse 2s ease infinite',
        }}
      >
        <div style={{
          fontSize: 52, marginBottom: 16,
          color,
          filter: `drop-shadow(0 0 12px ${color})`,
        }}>
          {rewardIcon[reward.reward_type] ?? '✦'}
        </div>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 11,
          color, letterSpacing: '0.2em',
          textTransform: 'uppercase', margin: '0 0 8px',
        }}>
          {rewardTypeLabel[reward.reward_type] ?? 'Reward'}
        </p>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700,
          color: '#e8e0cc', margin: '0 0 12px',
        }}>
          {reward.display_name}
        </p>
        {reward.xp_granted && (
          <p style={{ fontSize: 13, color: 'var(--gold)', margin: '0 0 12px' }}>
            +{reward.xp_granted} Fate XP
          </p>
        )}
        <p style={{
          fontSize: 11, color,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          margin: '0 0 28px', fontWeight: 700,
        }}>
          {RARITY_LABEL[rarity]}
        </p>
        <p style={{
          fontSize: 12, color: 'rgba(232, 224, 204, 0.45)', fontStyle: 'italic',
          margin: '0 0 28px',
        }}>
          {reward.message ?? 'The Veil has given what was kept for you.'}
        </p>
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '12px 0',
            background: color, color: '#0B0A08',
            border: 'none', borderRadius: 8,
            fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Claim
        </button>
      </div>
    </div>
  );
}

// ── Title Card ────────────────────────────────────────────────

function TitleCard({ title, isEquipping, onEquip }: {
  title: TitleEntry;
  isEquipping: boolean;
  onEquip: () => void;
}) {
  const catColor: Record<string, string> = {
    fate: 'var(--gold)', boss: 'var(--ember)', session: '#60a5fa',
    meta: '#a78bfa', training: '#34d399', general: 'rgba(232, 224, 204, 0.45)',
  };
  const color = catColor[title.category] ?? 'rgba(232, 224, 204, 0.45)';

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${title.is_equipped ? color : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: title.is_equipped ? `0 0 12px ${color}30` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
          color: '#e8e0cc', margin: '0 0 2px',
        }}>{title.display_name}</p>
        <p style={{
          fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: 0,
        }}>
          {CATEGORY_LABEL[title.category] ?? title.category}
          {title.description ? ` · ${title.description}` : ''}
        </p>
      </div>
      <button
        onClick={onEquip}
        disabled={isEquipping}
        style={{
          padding: '6px 12px', flexShrink: 0,
          background: title.is_equipped ? 'transparent' : color,
          color: title.is_equipped ? color : '#0B0A08',
          border: `1px solid ${color}`,
          borderRadius: 6,
          fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
          cursor: isEquipping ? 'wait' : 'pointer',
          opacity: isEquipping ? 0.6 : 1,
          letterSpacing: '0.05em',
        }}
      >
        {isEquipping ? '…' : title.is_equipped ? 'Remove' : 'Equip'}
      </button>
    </div>
  );
}

// ── Locked Title Card ─────────────────────────────────────────

function LockedTitleCard({ title }: { title: TitleEntry }) {
  const categoryUnlockHint: Record<string, string> = {
    fate:     'Reach a Fate Level milestone',
    boss:     'Deal significant damage to a boss',
    session:  'Complete sessions at Heroes Veritas',
    meta:     'Connect with multiple venues',
    training: 'Reach a Training Pillar mastery level',
    general:  'Complete specific challenges',
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: 0.5,
    }}>
      <div style={{ color: 'rgba(232, 224, 204, 0.45)', fontSize: 16, flexShrink: 0 }}>🔒</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
          color: 'rgba(232, 224, 204, 0.45)', margin: '0 0 2px',
        }}>{title.display_name}</p>
        <p style={{ fontSize: 11, color: 'rgba(232, 224, 204, 0.45)', margin: 0 }}>
          {categoryUnlockHint[title.category] ?? 'Complete specific challenges'}
        </p>
      </div>
    </div>
  );
}

// ── Gear Slot Card ────────────────────────────────────────────

function GearSlotCard({ slot, item }: { slot: string; item: GearItem | null }) {
  const rarity = item ? (item.rarity_tier as Rarity) : null;
  const color  = rarity ? RARITY_COLOR[rarity] : 'var(--border)';

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${color}`,
      borderRadius: 10, padding: '10px 8px',
      textAlign: 'center',
      minHeight: 80,
      boxShadow: rarity ? `0 0 10px ${RARITY_GLOW[rarity]}` : 'none',
    }}>
      <div style={{ fontSize: 18, marginBottom: 4, color: item ? color : 'var(--border)' }}>
        {item ? (item.icon ?? GEAR_SLOT_ICON[slot]) : GEAR_SLOT_ICON[slot]}
      </div>
      <p style={{
        fontFamily: 'Cinzel, serif', fontSize: 9,
        color: 'rgba(232, 224, 204, 0.45)', letterSpacing: '0.12em',
        textTransform: 'uppercase', margin: '0 0 2px',
      }}>{GEAR_SLOT_LABEL[slot]}</p>
      {item ? (
        <p style={{ fontSize: 10, color, margin: 0, fontWeight: 700, lineHeight: 1.3 }}>
          {item.item_name}
        </p>
      ) : (
        <p style={{ fontSize: 10, color: 'var(--border)', margin: 0, fontStyle: 'italic' }}>
          Empty
        </p>
      )}
    </div>
  );
}

// ── Inventory Card ────────────────────────────────────────────

function InventoryCard({ item, onEquip }: { item: GearItem; onEquip: () => void }) {
  const rarity = item.rarity_tier as Rarity;
  const color  = RARITY_COLOR[rarity];

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${color}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: RARITY_GLOW[rarity],
        border: `1px solid ${color}`,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {item.icon ?? '⚔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
          color: '#e8e0cc', margin: '0 0 2px',
        }}>{item.item_name}</p>
        <p style={{ fontSize: 11, color, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {RARITY_LABEL[rarity]} · {GEAR_SLOT_LABEL[item.slot] ?? item.slot}
        </p>
      </div>
      <button
        onClick={onEquip}
        style={{
          padding: '6px 12px', flexShrink: 0,
          background: color, color: '#0B0A08',
          border: 'none', borderRadius: 6,
          fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Equip
      </button>
    </div>
  );
}

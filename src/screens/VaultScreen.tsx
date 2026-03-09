// src/screens/VaultScreen.tsx
// ============================================================
// Sprint 8 — Vault Tab (inside Archive)
// Sections: Fate Caches | Titles | Gear Loadout
//
// v2 Gear Slot changes:
//   - Rarity color on item name AND border (more prominent)
//   - Slot icon + label moved BELOW the item name
//   - Slot icon/label smaller and muted
// ============================================================
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '../AuthContext';

const BASE = 'https://pik-prd-production.up.railway.app';

// ── Types ────────────────────────────────────────────────────
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface SealedCache {
  cache_id: string; cache_type: string; rarity: Rarity;
  label: string; status: 'sealed' | 'opened'; trigger: string; granted_at: string;
}
interface CacheReward {
  reward_type: string; reward_value: string; display_name: string;
  rarity_tier: Rarity; xp_granted?: number; message?: string;
  slot?: string; description?: string; modifiers?: Record<string, number>;
}
interface TitleEntry {
  title_id: string; display_name: string; category: string;
  description: string | null; is_earned: boolean; is_equipped: boolean; granted_at: string | null;
}
interface GearItem {
  inventory_id: string; item_id: string; item_name: string;
  slot: string; rarity_tier: Rarity; icon: string; description: string;
  is_equipped: boolean; modifiers: Record<string, number>;
}

// ── Constants ────────────────────────────────────────────────
const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#8899AA',
  uncommon:  '#34d399',
  rare:      '#1E90FF',
  epic:      '#A855F7',
  legendary: '#FFA500',
};
const RARITY_GLOW: Record<Rarity, string> = {
  common:    'rgba(136,153,170,0.15)',
  uncommon:  'rgba(52,211,153,0.20)',
  rare:      'rgba(30,144,255,0.22)',
  epic:      'rgba(168,85,247,0.25)',
  legendary: 'rgba(255,165,0,0.30)',
};
const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};
const MODIFIER_LABEL: Record<string, string> = {
  xp_bonus_pct: 'XP Bonus', boss_damage_pct: 'Boss Dmg', luck_pct: 'Luck',
  defense: 'Defense', crit_pct: 'Crit', cooldown_pct: 'Cooldown', fate_affinity: 'Fate Affinity',
};
const GEAR_SLOTS = ['weapon','helm','chest','arms','legs','rune'] as const;
const GEAR_SLOT_ICON: Record<string, string> = {
  weapon: '⚔', helm: '⛑', chest: '🔰', arms: '🦾', legs: '👢', rune: '◈',
};
const GEAR_SLOT_LABEL: Record<string, string> = {
  weapon: 'Weapon', helm: 'Helm', chest: 'Chest', arms: 'Arms', legs: 'Legs', rune: 'Rune',
};
const CATEGORY_LABEL: Record<string, string> = {
  fate: 'Fate', boss: 'Combat', session: 'Session',
  meta: 'Realm', training: 'Training', general: 'General',
};

// ── Main Component ───────────────────────────────────────────
export function VaultScreen() {
  const { hero, sessionToken, refreshHero } = useAuth();

  const [caches, setCaches] = useState<SealedCache[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<SealedCache | null>(null);
  const [reward, setReward] = useState<CacheReward | null>(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  const [titles, setTitles] = useState<TitleEntry[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(true);
  const [equippingTitle, setEquippingTitle] = useState<string | null>(null);

  type Section = 'caches' | 'titles' | 'gear';
  const [section, setSection] = useState<Section>('caches');
  const rootId = hero?.root_id;

  const fetchCaches = useCallback(async () => {
    if (!rootId) return;
    setCacheLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/caches`);
      const json = await res.json();
      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setCaches((raw as SealedCache[]).filter(c => c.status === 'sealed'));
    } catch {} finally { setCacheLoading(false); }
  }, [rootId]);

  useEffect(() => { fetchCaches(); }, [fetchCaches]);

  const fetchTitles = useCallback(async () => {
    if (!rootId || !sessionToken) return;
    setTitlesLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/titles`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const json = await res.json();
      const titleData = json?.data;
      setTitles(Array.isArray(titleData) ? titleData : Array.isArray(json) ? json : []);
    } catch {
      if (hero?.progression?.titles) {
        const equipped = hero.progression.equipped_title;
        setTitles(hero.progression.titles.map((t: any) => ({
          title_id: t.title_id ?? t,
          display_name: t.title_name ?? (typeof t === 'string'
            ? t.replace(/^title_/,'').replace(/_/g,' ').toUpperCase() : t),
          category: t.category ?? 'general',
          description: t.description ?? null,
          is_earned: true,
          is_equipped: (t.title_id ?? t) === equipped,
          granted_at: t.granted_at ?? null,
        })));
      }
    } finally { setTitlesLoading(false); }
  }, [rootId, sessionToken, hero]);

  useEffect(() => { fetchTitles(); }, [fetchTitles]);

  const handleOpenCache = async (cache: SealedCache) => {
    if (!rootId || !sessionToken) return;
    setOpeningId(cache.cache_id); setPendingOpen(null); setReward(null);
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/caches/${cache.cache_id}/open`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to open');
      const r: CacheReward = json?.data ?? json;
      setReward(r);
      await fetchCaches(); await refreshHero();
      if (r.reward_type === 'title') await fetchTitles();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to open cache');
    } finally { setOpeningId(null); }
  };

  const handleEquipTitle = async (titleId: string, isEquipped: boolean) => {
    if (!rootId || !sessionToken) return;
    setEquippingTitle(titleId);
    try {
      const target = isEquipped ? 'none' : titleId;
      const res = await fetch(`${BASE}/api/users/${rootId}/titles/${target}/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed');
      await fetchTitles(); await refreshHero();
    } catch {} finally { setEquippingTitle(null); }
  };

  const handleEquipGear = async (inventoryId: string) => {
    if (!rootId || !sessionToken) return;
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/equipment/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: inventoryId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to equip');
      await refreshHero();
    } catch (e: any) { alert(e?.message ?? 'Failed to equip item'); }
  };

  const inventoryRaw = hero?.gear?.inventory;
  const inventory: GearItem[] = Array.isArray(inventoryRaw) ? inventoryRaw as GearItem[] : [];
  const equipment = (hero?.gear?.equipment ?? {}) as Record<string, GearItem | null>;
  const unequippedCount = inventory.filter(i => !i.is_equipped).length;
  const safeTitles = Array.isArray(titles) ? titles : [];
  const earnedTitles = safeTitles.filter(t => t.is_earned);
  const lockedTitles = safeTitles.filter(t => !t.is_earned);

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Section pills */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 16px 0',
        position: 'sticky', top: 0, zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--bg)',
      }}>
        {(['caches', 'titles', 'gear'] as Section[]).map(s => {
          const labels = { caches: 'Fate Caches', titles: 'Titles', gear: 'Gear' };
          const counts = { caches: caches.length, titles: earnedTitles.length, gear: unequippedCount };
          const isActive = section === s;
          return (
            <button key={s} onClick={() => setSection(s)} style={{
              flex: 1, padding: '8px 4px',
              background: isActive ? 'var(--gold)' : 'var(--surface)',
              color: isActive ? '#0B0A08' : 'var(--text-2)',
              border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 8,
              fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.05em', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              transition: 'all 0.15s',
            }}>
              <span>{labels[s]}</span>
              {counts[s] > 0 && (
                <span style={{
                  fontSize: 9,
                  background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--gold)',
                  color: '#0B0A08', borderRadius: 999,
                  padding: '1px 6px', fontFamily: 'monospace',
                }}>
                  {counts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CACHES ─────────────────────────────────────────── */}
      {section === 'caches' && (
        <div style={{ padding: '20px 16px 0' }}>
          {reward && <RewardReveal reward={reward} onDismiss={() => setReward(null)} />}
          {pendingOpen && !reward && (
            <div style={{
              background: 'var(--surface)',
              border: `1px solid ${RARITY_COLOR[pendingOpen.rarity]}`,
              borderRadius: 12, padding: 20, marginBottom: 16,
              boxShadow: `0 0 24px ${RARITY_GLOW[pendingOpen.rarity]}`,
            }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: RARITY_COLOR[pendingOpen.rarity], margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {pendingOpen.label}
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 16px', fontStyle: 'italic' }}>
                "The seal holds what has been set aside for you."
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleOpenCache(pendingOpen)} disabled={openingId !== null} style={{
                  flex: 1, padding: '10px 0',
                  background: RARITY_COLOR[pendingOpen.rarity], color: '#0B0A08',
                  border: 'none', borderRadius: 8,
                  fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
                  cursor: openingId ? 'wait' : 'pointer',
                }}>
                  {openingId ? 'Opening…' : 'Break the Seal'}
                </button>
                <button onClick={() => setPendingOpen(null)} style={{
                  padding: '10px 16px', background: 'transparent',
                  color: 'var(--text-2)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13,
                }}>
                  Later
                </button>
              </div>
            </div>
          )}
          {cacheLoading ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: 13, marginTop: 32 }}>Loading caches…</p>
          ) : caches.length === 0 ? (
            <EmptyState icon="⬡" title="The Vault is Empty"
              body="Caches are granted by leveling up, defeating bosses, and completing milestones. Return after your next session." />
          ) : (
            <>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
                {caches.length} SEALED {caches.length === 1 ? 'CACHE' : 'CACHES'} AWAITING
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {caches.map(c => (
                  <CacheCard key={c.cache_id} cache={c} isOpening={openingId === c.cache_id}
                    onTap={() => { setPendingOpen(c); setReward(null); }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TITLES ─────────────────────────────────────────── */}
      {section === 'titles' && (
        <div style={{ padding: '20px 16px 0' }}>
          {titlesLoading ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: 13, marginTop: 32 }}>Loading titles…</p>
          ) : earnedTitles.length === 0 && lockedTitles.length === 0 ? (
            <EmptyState icon="◈" title="No Titles Yet"
              body="Titles are earned through sessions, pillar mastery, and combat milestones." />
          ) : (
            <>
              {earnedTitles.length > 0 && (
                <>
                  <SectionLabel>Earned</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {earnedTitles.map(t => (
                      <TitleCard key={t.title_id} title={t}
                        isEquipping={equippingTitle === t.title_id}
                        onEquip={() => handleEquipTitle(t.title_id, t.is_equipped)} />
                    ))}
                  </div>
                </>
              )}
              {lockedTitles.length > 0 && (
                <>
                  <SectionLabel>Locked</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lockedTitles.map(t => <LockedTitleCard key={t.title_id} title={t} />)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GEAR ───────────────────────────────────────────── */}
      {section === 'gear' && (
        <div style={{ padding: '20px 16px 0' }}>
          <SectionLabel>Loadout</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
            {GEAR_SLOTS.map(slot => {
              const item = equipment[slot] as GearItem | null | undefined;
              return <GearSlotCard key={slot} slot={slot} item={item ?? null} />;
            })}
          </div>
          <SectionLabel>Inventory</SectionLabel>
          {inventory.length === 0 ? (
            <EmptyState icon="⊕" title="Inventory Empty" body="Open Fate Caches to earn gear. Your loadout awaits." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventory.filter(i => !i.is_equipped).map(item => (
                <InventoryCard key={item.inventory_id} item={item}
                  onEquip={() => handleEquipGear(item.inventory_id)} />
              ))}
              {inventory.filter(i => !i.is_equipped).length === 0 && (
                <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
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

// ── Sub-components ───────────────────────────────────────────
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: 'Cinzel, serif', fontSize: 10, color: 'var(--text-3)',
      letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 0,
    }}>{children}</p>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--text-3)', opacity: 0.4 }}>{icon}</div>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

// ── Cache Card ───────────────────────────────────────────────
function CacheCard({ cache, isOpening, onTap }: {
  cache: SealedCache; isOpening: boolean; onTap: () => void;
}) {
  const color = RARITY_COLOR[cache.rarity];
  const glow  = RARITY_GLOW[cache.rarity];
  const cacheTypeLabel: Record<string, string> = { level_up: 'Level Up', boss_kill: 'Boss Kill', milestone: 'Milestone' };
  const triggerNum = cache.trigger.split(':')[1];
  return (
    <button onClick={onTap} disabled={isOpening} style={{
      width: '100%', textAlign: 'left', background: 'var(--surface)',
      border: `1px solid ${color}`, borderRadius: 12, padding: '14px 16px',
      boxShadow: `0 0 16px ${glow}`, cursor: isOpening ? 'wait' : 'pointer',
      opacity: isOpening ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
        border: `1px solid ${color}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>⬡</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>
          {cache.label}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {cacheTypeLabel[cache.cache_type] ?? cache.cache_type}{triggerNum ? ` · ${triggerNum}` : ''}
        </p>
        <p style={{ fontSize: 11, color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          {RARITY_LABEL[cache.rarity]}
        </p>
      </div>
      <div style={{ color, fontSize: 18, flexShrink: 0 }}>›</div>
    </button>
  );
}

// ── Reward Reveal ────────────────────────────────────────────
function RewardReveal({ reward, onDismiss }: { reward: CacheReward; onDismiss: () => void }) {
  const rarity = (reward.rarity_tier ?? 'common') as Rarity;
  const color  = RARITY_COLOR[rarity];
  const glow   = RARITY_GLOW[rarity];
  const rewardIcon: Record<string, string>      = { xp_boost: '✦', title: '◈', gear: '⚔', marker: '⬡' };
  const rewardTypeLabel: Record<string, string> = { xp_boost: 'Fate XP', title: 'Title Unlocked', gear: 'Gear Found', marker: 'Lore Fragment' };
  const itemName = reward.display_name || (
    reward.reward_type === 'gear' ? 'Gear Item' :
    reward.reward_type === 'title' ? 'New Title' :
    reward.reward_type === 'xp_boost' ? `${reward.reward_value ?? '?'} XP` : 'Reward'
  );
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(11,15,26,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 24px ${glow}; } 50% { box-shadow: 0 0 60px ${color}40; } }
      `}</style>
      <div style={{
        background: 'var(--surface)', border: `2px solid ${color}`,
        borderRadius: 16, padding: '40px 28px', textAlign: 'center',
        maxWidth: 300, width: '100%', animation: 'glowPulse 2s ease infinite',
      }}>
        <div style={{ fontSize: 52, marginBottom: 12, color, filter: `drop-shadow(0 0 12px ${color})` }}>
          {rewardIcon[reward.reward_type] ?? '✦'}
        </div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          {rewardTypeLabel[reward.reward_type] ?? 'Reward'}
        </p>
        <div style={{ display: 'inline-block', background: `${color}22`, border: `1px solid ${color}`, borderRadius: 999, padding: '3px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color, textTransform: 'uppercase', marginBottom: 16 }}>
          {RARITY_LABEL[rarity]}
        </div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px', lineHeight: 1.2 }}>
          {itemName}
        </p>
        {reward.reward_type === 'gear' && reward.slot && (
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {GEAR_SLOT_LABEL[reward.slot] ?? reward.slot}
          </p>
        )}
        {reward.modifiers && Object.keys(reward.modifiers).length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '8px 14px', marginBottom: 14, textAlign: 'left' }}>
            {Object.entries(reward.modifiers).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '3px 0' }}>
                <span style={{ color: 'var(--text-2)' }}>{MODIFIER_LABEL[k] ?? k}</span>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>+{v}</span>
              </div>
            ))}
          </div>
        )}
        {reward.xp_granted && (
          <p style={{ fontSize: 13, color: 'var(--gold)', margin: '0 0 14px', fontWeight: 700 }}>
            +{reward.xp_granted} Fate XP
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', margin: '0 0 28px', lineHeight: 1.5 }}>
          {reward.message ?? 'The Veil has given what was kept for you.'}
        </p>
        <button onClick={e => { e.stopPropagation(); onDismiss(); }} style={{
          width: '100%', padding: '12px 0',
          background: color, color: '#0B0A08', border: 'none', borderRadius: 8,
          fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Claim
        </button>
      </div>
    </div>
  );
}

// ── Title Card ───────────────────────────────────────────────
function TitleCard({ title, isEquipping, onEquip }: {
  title: TitleEntry; isEquipping: boolean; onEquip: () => void;
}) {
  const catColor: Record<string, string> = {
    fate: 'var(--gold)', boss: 'var(--ember)', session: '#1E90FF',
    meta: '#A855F7', training: '#34d399', general: 'var(--text-3)',
  };
  const color = catColor[title.category] ?? 'var(--text-3)';
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${title.is_equipped ? color : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: title.is_equipped ? `0 0 12px ${color}30` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>
          {title.display_name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
          {CATEGORY_LABEL[title.category] ?? title.category}
          {title.description ? ` · ${title.description}` : ''}
        </p>
      </div>
      <button onClick={onEquip} disabled={isEquipping} style={{
        padding: '6px 12px', flexShrink: 0,
        background: title.is_equipped ? 'transparent' : color,
        color: title.is_equipped ? color : '#0B0A08',
        border: `1px solid ${color}`, borderRadius: 6,
        fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
        cursor: isEquipping ? 'wait' : 'pointer',
        opacity: isEquipping ? 0.6 : 1, letterSpacing: '0.05em',
      }}>
        {isEquipping ? '…' : title.is_equipped ? 'Remove' : 'Equip'}
      </button>
    </div>
  );
}

// ── Locked Title Card ────────────────────────────────────────
function LockedTitleCard({ title }: { title: TitleEntry }) {
  const categoryUnlockHint: Record<string, string> = {
    fate: 'Reach a Fate Level milestone', boss: 'Deal significant damage to a boss',
    session: 'Complete sessions at Heroes Veritas', meta: 'Connect with multiple venues',
    training: 'Reach a Training Pillar mastery level', general: 'Complete specific challenges',
  };
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5,
    }}>
      <div style={{ color: 'var(--text-3)', fontSize: 16, flexShrink: 0 }}>🔒</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-3)', margin: '0 0 2px' }}>
          {title.display_name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
          {categoryUnlockHint[title.category] ?? 'Complete specific challenges'}
        </p>
      </div>
    </div>
  );
}

// ── Gear Slot Card ─────────────────────────────────────────── 
// v2: item name uses rarity color + border, slot icon/label smaller + below item
function GearSlotCard({ slot, item }: { slot: string; item: GearItem | null }) {
  const rarity = item ? ((item.rarity_tier as Rarity) ?? 'common') : null;
  const color  = rarity ? (RARITY_COLOR[rarity] ?? '#8899AA') : 'rgba(232,224,204,0.10)';
  const glow   = rarity ? RARITY_GLOW[rarity] : 'transparent';

  return (
    <div style={{
      background: rarity
        ? `linear-gradient(160deg, ${glow}30 0%, var(--surface) 55%)`
        : 'var(--surface)',
      border: `${rarity ? 2 : 1}px solid ${color}`,
      borderRadius: 10,
      padding: '10px 6px 8px',
      textAlign: 'center',
      minHeight: 94,
      boxShadow: rarity ? `0 0 20px ${glow}, inset 0 0 10px ${glow}33` : 'none',
      transition: 'all 0.2s ease',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}>
      {/* Rarity shimmer bar at top */}
      {rarity && (
        <div style={{
          position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: '0 0 4px 4px',
        }} />
      )}

      {item ? (
        <>
          {/* Item icon — prominent */}
          <div style={{
            fontSize: 22, lineHeight: 1, marginBottom: 3,
            color, filter: `drop-shadow(0 0 6px ${color})`,
          }}>
            {item.icon ?? GEAR_SLOT_ICON[slot]}
          </div>

          {/* Item name — rarity color */}
          <p style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 10, fontWeight: 700,
            color,
            margin: 0, lineHeight: 1.25,
            textShadow: `0 0 10px ${color}80`,
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}>
            {item.item_name}
          </p>

          {/* Slot label — small, muted, below item */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 3, marginTop: 4,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(232,224,204,0.25)', lineHeight: 1 }}>
              {GEAR_SLOT_ICON[slot]}
            </span>
            <span style={{
              fontFamily: 'Cinzel, serif', fontSize: 7,
              color: 'rgba(232,224,204,0.25)',
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              {GEAR_SLOT_LABEL[slot]}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Empty slot — slot icon takes centre, muted */}
          <div style={{ fontSize: 16, color: 'rgba(232,224,204,0.15)', marginBottom: 3 }}>
            {GEAR_SLOT_ICON[slot]}
          </div>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 8,
            color: 'rgba(232,224,204,0.20)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            margin: '0 0 2px',
          }}>
            {GEAR_SLOT_LABEL[slot]}
          </p>
          <p style={{ fontSize: 9, color: 'rgba(232,224,204,0.15)', margin: 0, fontStyle: 'italic' }}>
            Empty
          </p>
        </>
      )}
    </div>
  );
}

// ── Inventory Card ───────────────────────────────────────────
function InventoryCard({ item, onEquip }: { item: GearItem; onEquip: () => void }) {
  const rarity = (item.rarity_tier as Rarity) ?? 'common';
  const color  = RARITY_COLOR[rarity] ?? '#8899AA';
  const [busy, setBusy] = useState(false);

  const handleEquip = async () => {
    setBusy(true);
    try { await onEquip(); } finally { setBusy(false); }
  };

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${color}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `0 0 10px ${RARITY_GLOW[rarity]}`,
    }}>
      <div style={{
        width: 40, height: 40, flexShrink: 0,
        background: RARITY_GLOW[rarity], border: `1px solid ${color}`,
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {item.icon ?? '⚔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: color, margin: '0 0 2px' }}>
          {item.item_name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {RARITY_LABEL[rarity]} · {GEAR_SLOT_LABEL[item.slot] ?? item.slot}
        </p>
      </div>
      <button onClick={handleEquip} disabled={busy} style={{
        padding: '8px 16px', flexShrink: 0,
        background: color, color: '#0B0A08',
        border: `2px solid ${color}`, borderRadius: 6,
        fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 900,
        cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
        letterSpacing: '0.08em', boxShadow: `0 0 8px ${color}60`, minWidth: 64,
      }}>
        {busy ? '…' : 'EQUIP'}
      </button>
    </div>
  );
}

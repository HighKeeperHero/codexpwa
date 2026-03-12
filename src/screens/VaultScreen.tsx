// src/screens/VaultScreen.tsx
// ============================================================
// Sprint 9+ — Vault (Archive tab)
// Sections: Fate Caches | Gear | Forge
//
// New features:
//   - Nexus balance (in-app currency) displayed in Gear + Forge
//   - Dismantle unequipped gear → components + Nexus
//   - Forge (Workshop): craft gear from components + Nexus
//
// API endpoints assumed:
//   GET  /api/users/:id/nexus               → { balance: number }
//   GET  /api/users/:id/components          → ComponentEntry[]
//   POST /api/users/:id/gear/:iid/dismantle → DismantleResult
//   GET  /api/workshop/recipes              → Recipe[]  (fallback: hardcoded)
//   POST /api/users/:id/workshop/craft      → { gear_item, nexus_spent, components_spent }
// ============================================================
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../AuthContext';
import { CacheOpenOverlay, type CacheRewardPayload } from './CacheOpenOverlay';
import { DismantleOverlay, type DismantleResult } from './DismantleOverlay';

const BASE = 'https://pik-prd-production.up.railway.app';

// ── Response unwrapper ─────────────────────────────────────────
// The PIK backend wraps every response in { status, data: X } via a global
// ResponseInterceptor, but controllers also return { status, data } manually —
// resulting in a double envelope: { status, data: { status, data: payload } }.
// This helper collapses either shape to the raw payload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(json: any): any {
  const d = json?.data;
  if (d !== null && d !== undefined && typeof d === 'object' && 'data' in d) return d.data;
  return d ?? json;
}

// ── Types ──────────────────────────────────────────────────────
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type CacheReward = CacheRewardPayload;

interface SealedCache {
  cache_id: string; cache_type: string; rarity: Rarity;
  label: string; status: 'sealed' | 'opened'; trigger: string; granted_at: string;
}
interface GearItem {
  inventory_id: string; item_id: string; item_name: string; slot: string;
  rarity: Rarity; icon: string; description: string; is_equipped: boolean;
  modifiers: Record<string, number>;
}
interface ComponentEntry {
  id:       string;   // 'salvage_shard' | 'refined_core' | 'arcane_essence' | 'void_fragment'
  name:     string;
  icon:     string;
  quantity: number;
}
interface RecipeCost {
  component_id: string;
  quantity:     number;
}
interface Recipe {
  recipe_id:    string;
  name:         string;
  slot:         string;
  rarity:       Rarity;
  icon:         string;
  description:  string;
  nexus_cost:   number;
  components:   RecipeCost[];
}

// ── Constants ──────────────────────────────────────────────────
const RARITY_COLOR: Record<Rarity, string> = {
  common:    'var(--rarity-common)',
  uncommon:  'var(--rarity-honored)',
  rare:      'var(--rarity-rare)',
  epic:      'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};
const RARITY_GLOW: Record<Rarity, string> = {
  common: 'rgba(136,153,170,0.15)', uncommon: 'rgba(52,211,153,0.20)',
  rare: 'rgba(30,144,255,0.22)', epic: 'rgba(168,85,247,0.25)', legendary: 'rgba(255,165,0,0.30)',
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

// Dismantle yield by rarity
const DISMANTLE_YIELD: Record<Rarity, { nexus: number; components: Array<{ id: string; name: string; icon: string; qty: number }> }> = {
  common:    { nexus: 10,  components: [{ id: 'salvage_shard', name: 'Salvage Shard', icon: '🪨', qty: 2 }] },
  uncommon:  { nexus: 25,  components: [{ id: 'salvage_shard', name: 'Salvage Shard', icon: '🪨', qty: 2 }, { id: 'refined_core', name: 'Refined Core', icon: '⚙️', qty: 1 }] },
  rare:      { nexus: 50,  components: [{ id: 'refined_core', name: 'Refined Core', icon: '⚙️', qty: 2 }, { id: 'arcane_essence', name: 'Arcane Essence', icon: '🔮', qty: 1 }] },
  epic:      { nexus: 100, components: [{ id: 'arcane_essence', name: 'Arcane Essence', icon: '🔮', qty: 2 }, { id: 'void_fragment', name: 'Void Fragment', icon: '💠', qty: 1 }] },
  legendary: { nexus: 200, components: [{ id: 'arcane_essence', name: 'Arcane Essence', icon: '🔮', qty: 2 }, { id: 'void_fragment', name: 'Void Fragment', icon: '💠', qty: 2 }] },
};

// Hardcoded recipes (fallback if /api/workshop/recipes is unavailable)
const DEFAULT_RECIPES: Recipe[] = [
  {
    recipe_id: 'craft_runed_sigil',
    name: 'Runed Sigil', slot: 'rune', rarity: 'uncommon', icon: '◈',
    description: 'A carved rune inscribed with faint ward-marks. Increases luck.',
    nexus_cost: 30,
    components: [{ component_id: 'salvage_shard', quantity: 2 }, { component_id: 'refined_core', quantity: 1 }],
  },
  {
    recipe_id: 'craft_ironveil_arms',
    name: 'Ironveil Gauntlets', slot: 'arms', rarity: 'uncommon', icon: '🦾',
    description: 'Layered iron plating over Veil-woven cloth. Solid defense.',
    nexus_cost: 20,
    components: [{ component_id: 'salvage_shard', quantity: 3 }],
  },
  {
    recipe_id: 'craft_veilrunner_legs',
    name: 'Veilrunner Boots', slot: 'legs', rarity: 'rare', icon: '👢',
    description: 'Shadowstep soles from the Veil Marches. Enhances cooldown.',
    nexus_cost: 60,
    components: [{ component_id: 'refined_core', quantity: 2 }],
  },
  {
    recipe_id: 'craft_embercrest_helm',
    name: 'Embercrest Helm', slot: 'helm', rarity: 'rare', icon: '⛑',
    description: 'Forged from cinderwall ore. Grants boss damage bonus.',
    nexus_cost: 80,
    components: [{ component_id: 'refined_core', quantity: 2 }, { component_id: 'arcane_essence', quantity: 1 }],
  },
  {
    recipe_id: 'craft_shadowweave_chest',
    name: 'Shadowweave Chest', slot: 'chest', rarity: 'epic', icon: '🔰',
    description: 'Woven from threads of concentrated darkness. XP bonus on kills.',
    nexus_cost: 150,
    components: [{ component_id: 'arcane_essence', quantity: 3 }],
  },
  {
    recipe_id: 'craft_fatebreaker',
    name: 'Fatebreaker', slot: 'weapon', rarity: 'epic', icon: '⚔',
    description: 'A blade tempered in the Veil. Fate affinity beyond measure.',
    nexus_cost: 200,
    components: [{ component_id: 'arcane_essence', quantity: 2 }, { component_id: 'void_fragment', quantity: 1 }],
  },
];

// ── Main Component ─────────────────────────────────────────────
export function VaultScreen() {
  const { hero, sessionToken, refreshHero } = useAuth();

  // Cache state
  const [caches, setCaches] = useState<SealedCache[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openingCache, setOpeningCache] = useState<SealedCache | null>(null);
  const [cacheReward, setCacheReward] = useState<CacheReward | null>(null);
  const [cacheLoading, setCacheLoading] = useState(true);

  // Title state

  // Nexus + component economy
  const [nexusBalance, setNexusBalance] = useState<number>(0);
  const [components, setComponents] = useState<Record<string, number>>({});
  const [economyLoading, setEconomyLoading] = useState(true);

  // Dismantle — dismantledIds removes items from local list instantly before server confirms
  const [dismantlingItem, setDismantlingItem] = useState<GearItem | null>(null);
  const [dismantleResult, setDismantleResult] = useState<DismantleResult | null>(null);
  const [dismantledIds, setDismantledIds]     = useState<Set<string>>(new Set());

  // Workshop / Forge
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [craftingId, setCraftingId] = useState<string | null>(null);
  const [craftMsg, setCraftMsg] = useState<string | null>(null);

  type Section = 'caches' | 'gear' | 'forge';
  const [section, setSection] = useState<Section>('caches');

  const handleSectionChange = (s: Section) => { setSection(s); };

  const rootId = hero?.root_id;

  // ── Fetchers ──────────────────────────────────────────────
  const fetchCaches = useCallback(async () => {
    if (!rootId) return;
    setCacheLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/caches`);
      const json = await res.json();
      const raw  = unwrap(json);
      setCaches((Array.isArray(raw) ? raw as SealedCache[] : []).filter(c => c.status === 'sealed'));
    } catch {} finally { setCacheLoading(false); }
  }, [rootId]);

  const fetchEconomy = useCallback(async () => {
    if (!rootId || !sessionToken) return;
    setEconomyLoading(true);
    try {
      // Nexus balance
      const nRes  = await fetch(`${BASE}/api/users/${rootId}/nexus`, { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (nRes.ok) {
        const nJson   = await nRes.json();
        const nData   = unwrap(nJson);
        setNexusBalance((nData?.balance ?? nData ?? 0) as number);
      }
      // Components
      const cRes  = await fetch(`${BASE}/api/users/${rootId}/components`, { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (cRes.ok) {
        const cJson = await cRes.json();
        const arr   = unwrap(cJson) as ComponentEntry[];
        if (Array.isArray(arr)) {
          const map: Record<string, number> = {};
          arr.forEach(c => { map[c.id] = c.quantity; });
          setComponents(map);
        }
      }
      // Recipes (optional)
      const rRes  = await fetch(`${BASE}/api/workshop/recipes`);
      if (rRes.ok) {
        const rJson = await rRes.json();
        const arr   = unwrap(rJson);
        if (Array.isArray(arr) && arr.length > 0) setRecipes(arr);
      }
    } catch {} finally { setEconomyLoading(false); }
  }, [rootId, sessionToken]);

  useEffect(() => { fetchCaches(); },  [fetchCaches]);
  useEffect(() => { fetchEconomy(); }, [fetchEconomy]);

  // ── Cache open ────────────────────────────────────────────
  const handleOpenCache = async (cache: SealedCache) => {
    if (!rootId || !sessionToken) return;
    setOpeningCache(cache); setCacheReward(null); setOpeningId(cache.cache_id);
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/caches/${cache.cache_id}/open`, {
        method: 'POST', headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to open');
      const r: CacheReward = json?.data ?? json;
      setCacheReward(r);
      await fetchCaches(); await refreshHero();
      if (r.reward_type === 'nexus') await fetchEconomy();
    } catch (e: any) { setOpeningCache(null); setCacheReward(null); alert(e?.message ?? 'Failed'); }
    finally { setOpeningId(null); }
  };

  // ── Gear equip ────────────────────────────────────────────
  const handleEquipGear = async (inventoryId: string) => {
    if (!rootId || !sessionToken) return;
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/equipment/equip`, {
        method: 'POST', headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: inventoryId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Failed to equip');
      await refreshHero();
    } catch (e: any) { alert(e?.message ?? 'Failed to equip item'); }
  };

  // ── Dismantle ─────────────────────────────────────────────
  const handleDismantle = async (item: GearItem) => {
    if (!rootId || !sessionToken) return;

    // ① Compute yield synchronously — no API wait, zero overlay delay
    const yield_  = DISMANTLE_YIELD[item.rarity];
    const newBal  = nexusBalance + yield_.nexus;
    const newComp = { ...components };
    yield_.components.forEach(c => { newComp[c.id] = (newComp[c.id] ?? 0) + c.qty; });
    const immediateResult: DismantleResult = {
      nexus_gained:      yield_.nexus,
      components_gained: yield_.components.map(c => ({ id: c.id, name: c.name, icon: c.icon, quantity: c.qty })),
      new_nexus_balance: newBal,
      new_components:    newComp,
    };

    // ② Show overlay with result immediately — DismantleOverlay transitions straight to YIELD
    setDismantlingItem(item);
    setDismantleResult(immediateResult);

    // ③ Remove item from local inventory list instantly
    setDismantledIds(prev => { const next = new Set(prev); next.add(item.inventory_id); return next; });

    // ④ Apply economy locally
    setNexusBalance(newBal);
    setComponents(newComp);

    // ⑤ Fire API in background — reconcile with server values if endpoint exists
    try {
      const res = await fetch(`${BASE}/api/users/${rootId}/gear/${item.inventory_id}/dismantle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json    = await res.json();
        const payload = unwrap(json);
        // Reconcile with authoritative server values
        const serverBal  = payload.new_nexus_balance ?? newBal;
        const serverComp = payload.new_components    ?? newComp;
        setNexusBalance(serverBal);
        setComponents(serverComp);
        setDismantleResult(prev => prev ? { ...prev, new_nexus_balance: serverBal, new_components: serverComp } : prev);
      }
      // Whether endpoint existed or not, server state now matches — safe to refresh
    } catch {}
    // Do NOT refreshHero here — it would re-add the item before DB deletion commits
  };

  const handleDismantleDismiss = () => {
    setDismantlingItem(null); setDismantleResult(null);
    // Refresh now to sync hero state post-dismantle
    refreshHero();
  };

  // ── Craft ─────────────────────────────────────────────────
  const handleCraft = async (recipe: Recipe) => {
    if (!rootId || !sessionToken) return;
    // Check if player can afford
    const canAfford = recipe.nexus_cost <= nexusBalance &&
      recipe.components.every(c => (components[c.component_id] ?? 0) >= c.quantity);
    if (!canAfford) { setCraftMsg('Insufficient materials.'); setTimeout(() => setCraftMsg(null), 2500); return; }

    setCraftingId(recipe.recipe_id); setCraftMsg(null);
    try {
      const res  = await fetch(`${BASE}/api/users/${rootId}/workshop/craft`, {
        method: 'POST', headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.recipe_id }),
      });
      if (res.ok) {
        const json = await res.json();
        const payload = unwrap(json);
        if (payload.new_nexus_balance !== undefined) setNexusBalance(payload.new_nexus_balance);
        if (payload.new_components)                  setComponents(payload.new_components);
        await refreshHero();
        setCraftMsg(`${recipe.name} added to inventory!`);
      } else {
        // Optimistic local deduction (backend not yet available)
        const newBal  = nexusBalance - recipe.nexus_cost;
        const newComp = { ...components };
        recipe.components.forEach(c => { newComp[c.component_id] = (newComp[c.component_id] ?? 0) - c.quantity; });
        setNexusBalance(newBal);
        setComponents(newComp);
        setCraftMsg(`${recipe.name} crafted! Check your inventory.`);
        await refreshHero();
      }
    } catch {
      setCraftMsg(`${recipe.name} crafted! Check your inventory.`);
    } finally {
      setCraftingId(null);
      setTimeout(() => setCraftMsg(null), 3500);
    }
  };

  // ── Derived state ──────────────────────────────────────────
  const inventoryRaw     = hero?.gear?.inventory;
  const inventory: GearItem[] = Array.isArray(inventoryRaw) ? inventoryRaw as GearItem[] : [];
  const equipment        = (hero?.gear?.equipment ?? {}) as Record<string, GearItem | null>;
  const unequippedItems  = inventory.filter(i => !i.is_equipped && !dismantledIds.has(i.inventory_id));

  return (
    <div className="screen-enter" style={{ padding: '0 0 80px', minHeight: '100%' }}>

      {/* Cache opening overlay */}
      {openingCache && (
        <CacheOpenOverlay
          cache={openingCache} reward={cacheReward}
          onDismiss={() => { setOpeningCache(null); setCacheReward(null); }}
        />
      )}

      {/* Dismantle overlay */}
      {dismantlingItem && (
        <DismantleOverlay
          item={dismantlingItem} result={dismantleResult}
          onDismiss={handleDismantleDismiss}
        />
      )}

      {/* Section pills */}
      <div style={{
        display: 'flex', gap: 6, padding: '16px 12px 0',
        position: 'sticky', top: 0, zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)', background: 'var(--bg)',
      }}>
        {(['caches','gear','forge'] as Section[]).map(s => {
          const labels: Record<Section, string> = { caches: 'Caches', gear: 'Gear', forge: 'Forge' };
          const rawCounts: Record<Section, number> = {
            caches: caches.length,
            gear: unequippedItems.length, forge: recipes.length,
          };
          const badgeCount = rawCounts[s];
          const isActive = section === s;
          const isForge  = s === 'forge';
          return (
            <button key={s} onClick={() => handleSectionChange(s)} style={{
              flex: 1, padding: '8px 2px',
              background: isActive ? (isForge ? 'rgba(255,165,0,0.15)' : 'var(--gold)') : 'var(--surface)',
              color: isActive ? (isForge ? 'var(--gold)' : '#0B0A08') : 'var(--text-2)',
              border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s',
            }}>
              <span>{labels[s]}</span>
              {badgeCount > 0 && (
                <span style={{
                  fontSize: 9,
                  background: isActive ? (isForge ? 'var(--gold)' : 'rgba(0,0,0,0.2)') : 'var(--gold)',
                  color: '#0B0A08', borderRadius: 999, padding: '1px 5px', fontFamily: 'monospace',
                }}>{badgeCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CACHES ──────────────────────────────────────────── */}
      {section === 'caches' && (
        <div style={{ padding: '20px 16px 0' }}>
          {cacheLoading ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: 13, marginTop: 32 }}>Loading caches…</p>
          ) : caches.length === 0 ? (
            <EmptyState icon="⬡" title="The Vault is Empty" body="Caches are granted by leveling up, defeating bosses, and completing milestones." />
          ) : (
            <>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
                {caches.length} SEALED {caches.length === 1 ? 'CACHE' : 'CACHES'} AWAITING
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {caches.map(c => (
                  <CacheCard key={c.cache_id} cache={c} isOpening={openingId === c.cache_id}
                    onTap={() => handleOpenCache(c)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TITLES ──────────────────────────────────────────── */}
      {/* ── GEAR ────────────────────────────────────────────── */}
      {section === 'gear' && (
        <div style={{ padding: '20px 16px 0' }}>
          {/* Nexus balance bar */}
          <NexusBar balance={nexusBalance} loading={economyLoading} />

          <SectionLabel>Loadout</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
            {GEAR_SLOTS.map(slot => {
              const item = equipment[slot] as GearItem | null | undefined;
              return <GearSlotCard key={slot} slot={slot} item={item ?? null} />;
            })}
          </div>

          <SectionLabel>Inventory</SectionLabel>
          {inventory.length === 0 ? (
            <EmptyState icon="⊕" title="Inventory Empty" body="Open Fate Caches to earn gear. Dismantle duplicates for components and Nexus." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unequippedItems.map(item => (
                <InventoryCard key={item.inventory_id} item={item}
                  onEquip={() => handleEquipGear(item.inventory_id)}
                  onDismantle={() => handleDismantle(item)} />
              ))}
              {unequippedItems.length === 0 && (
                <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  All items equipped.
                </p>
              )}
            </div>
          )}

          {/* Components stash */}
          {Object.keys(components).length > 0 && (
            <>
              <SectionLabel>Components</SectionLabel>
              <ComponentsStash components={components} />
            </>
          )}
        </div>
      )}

      {/* ── FORGE ───────────────────────────────────────────── */}
      {section === 'forge' && (
        <div style={{ padding: '20px 16px 0' }}>
          {/* Nexus balance bar */}
          <NexusBar balance={nexusBalance} loading={economyLoading} />

          {/* Components stash */}
          <SectionLabel>Your Materials</SectionLabel>
          {Object.keys(components).length === 0 ? (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic', margin: '0 0 16px' }}>
                Dismantle gear to obtain components for crafting.
              </p>
            </div>
          ) : (
            <ComponentsStash components={components} />
          )}

          {/* Craft message */}
          {craftMsg && (
            <div style={{
              background: craftMsg.includes('Insufficient') ? 'rgba(200,94,40,0.1)' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${craftMsg.includes('Insufficient') ? 'rgba(200,94,40,0.3)' : 'rgba(52,211,153,0.3)'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: craftMsg.includes('Insufficient') ? 'var(--ember)' : '#34d399',
              fontFamily: 'Cinzel, serif',
            }}>
              {craftMsg}
            </div>
          )}

          <SectionLabel>Recipes</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recipes.map(r => (
              <RecipeCard
                key={r.recipe_id} recipe={r}
                nexusBalance={nexusBalance} components={components}
                isCrafting={craftingId === r.recipe_id}
                onCraft={() => handleCraft(r)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nexus Balance Bar ──────────────────────────────────────────
function NexusBar({ balance, loading }: { balance: number; loading: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)',
      borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 20,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>◈</span>
      <div>
        <p style={{ margin: 0, fontSize: 9, fontFamily: 'Cinzel, serif', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,165,0,0.6)' }}>
          Nexus
        </p>
        <p style={{ margin: 0, fontSize: 20, fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#FFA500', lineHeight: 1 }}>
          {loading ? '—' : balance.toLocaleString()}
        </p>
      </div>
      <p style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
        In-game currency
      </p>
    </div>
  );
}

// ── Components Stash ───────────────────────────────────────────
const COMPONENT_META: Record<string, { name: string; icon: string; color: string }> = {
  salvage_shard:  { name: 'Salvage Shard',  icon: '🪨', color: '#8899AA' },
  refined_core:   { name: 'Refined Core',   icon: '⚙️', color: '#34d399' },
  arcane_essence: { name: 'Arcane Essence', icon: '🔮', color: '#1E90FF' },
  void_fragment:  { name: 'Void Fragment',  icon: '💠', color: '#A855F7' },
};

function ComponentsStash({ components }: { components: Record<string, number> }) {
  const entries = Object.entries(components).filter(([, qty]) => qty > 0);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {entries.map(([id, qty]) => {
        const meta  = COMPONENT_META[id] ?? { name: id, icon: '◆', color: 'var(--text-2)' };
        return (
          <div key={id} style={{
            background: 'var(--surface)', border: `1px solid ${meta.color}44`,
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>{meta.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 8, color: meta.color, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>
                {meta.name}
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EDE6', fontFamily: 'Cinzel, serif' }}>
                ×{qty}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recipe Card ────────────────────────────────────────────────
function RecipeCard({ recipe, nexusBalance, components, isCrafting, onCraft }: {
  recipe:       Recipe;
  nexusBalance: number;
  components:   Record<string, number>;
  isCrafting:   boolean;
  onCraft:      () => void;
}) {
  const color    = RARITY_COLOR[recipe.rarity];
  const glow     = RARITY_GLOW[recipe.rarity];
  const canAffordNexus = nexusBalance >= recipe.nexus_cost;
  const compCheck = recipe.components.map(c => ({
    ...c,
    have: components[c.component_id] ?? 0,
    meta: COMPONENT_META[c.component_id] ?? { name: c.component_id, icon: '◆', color: 'var(--text-3)' },
    ok:   (components[c.component_id] ?? 0) >= c.quantity,
  }));
  const canCraft = canAffordNexus && compCheck.every(c => c.ok);

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${canCraft ? color : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '14px 14px 12px',
      boxShadow: canCraft ? `0 0 14px ${glow}` : 'none',
      opacity: canCraft || isCrafting ? 1 : 0.7,
      transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}44`,
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>
          {recipe.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>
            {recipe.name}
          </p>
          <p style={{ fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px', fontWeight: 700 }}>
            {RARITY_LABEL[recipe.rarity]} · {GEAR_SLOT_LABEL[recipe.slot] ?? recipe.slot}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
            {recipe.description}
          </p>
        </div>
      </div>

      {/* Cost */}
      <div style={{
        background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 10px',
        marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      }}>
        {/* Nexus cost */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>◈</span>
          <span style={{
            fontSize: 13, fontFamily: 'Cinzel, serif', fontWeight: 700,
            color: canAffordNexus ? '#FFA500' : '#C85E28',
          }}>
            {recipe.nexus_cost}
          </span>
          {!canAffordNexus && (
            <span style={{ fontSize: 9, color: '#C85E28', letterSpacing: '0.05em' }}>(need {recipe.nexus_cost - nexusBalance} more)</span>
          )}
        </div>
        <span style={{ color: 'var(--border)', fontSize: 12 }}>+</span>
        {/* Component costs */}
        {compCheck.map(c => (
          <div key={c.component_id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13 }}>{c.meta.icon}</span>
            <span style={{
              fontSize: 12, fontFamily: 'Cinzel, serif',
              color: c.ok ? c.meta.color : '#C85E28',
              fontWeight: 700,
            }}>
              {c.have}/{c.quantity}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{c.meta.name}</span>
          </div>
        ))}
      </div>

      {/* Craft button */}
      <button onClick={onCraft} disabled={!canCraft || isCrafting} style={{
        width: '100%', padding: '10px 0',
        background: canCraft ? color : 'transparent',
        color: canCraft ? '#0B0A08' : 'var(--text-3)',
        border: `1px solid ${canCraft ? color : 'var(--border)'}`,
        borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
        letterSpacing: '0.1em', cursor: canCraft && !isCrafting ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s',
        boxShadow: canCraft ? `0 0 12px ${glow}` : 'none',
      }}>
        {isCrafting ? 'Forging…' : canCraft ? 'FORGE' : 'INSUFFICIENT MATERIALS'}
      </button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 0 }}>
      {children}
    </p>
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

// ── Cache Card ─────────────────────────────────────────────────
function CacheCard({ cache, isOpening, onTap }: { cache: SealedCache; isOpening: boolean; onTap: () => void }) {
  const color = RARITY_COLOR[cache.rarity];
  const glow  = RARITY_GLOW[cache.rarity];
  const cacheTypeLabel: Record<string, string> = { level_up: 'Level Up', boss_kill: 'Boss Kill', milestone: 'Milestone' };
  const triggerNum = cache.trigger.split(':')[1];
  return (
    <button onClick={onTap} disabled={isOpening} style={{
      width: '100%', textAlign: 'left', background: 'var(--surface)',
      border: `1px solid ${color}`, borderRadius: 'var(--radius)', padding: '14px 16px',
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
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px' }}>{cache.label}</p>
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

// ── Gear Item Modal ────────────────────────────────────────────
function GearItemModal({ item, onClose }: { item: GearItem; onClose: () => void }) {
  const rarity  = (item.rarity as Rarity) ?? 'common';
  const color   = RARITY_COLOR[rarity] ?? '#8899AA';
  const glow    = RARITY_GLOW[rarity];
  const mods    = Object.entries(item.modifiers ?? {}).filter(([, v]) => v !== 0);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 max(env(safe-area-inset-bottom),16px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface)',
          border: `1px solid ${color}`,
          borderRadius: '16px 16px 0 0',
          boxShadow: `0 -8px 40px ${glow}, 0 -2px 0 ${color}`,
          padding: '0 0 24px',
          animation: 'slideUp 0.22s ease',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px 0' }}>
          <div style={{
            width: 56, height: 56, flexShrink: 0,
            background: `radial-gradient(circle, ${glow} 0%, var(--surface) 70%)`,
            border: `2px solid ${color}`, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: `0 0 20px ${glow}`,
          }}>
            {item.icon ?? GEAR_SLOT_ICON[item.slot] ?? '⚔'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px', lineHeight: 1.2 }}>
              {item.item_name}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color, background: `${color}15`, border: `1px solid ${color}40`,
                borderRadius: 4, padding: '2px 7px',
              }}>
                {RARITY_LABEL[rarity]}
              </span>
              <span style={{
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px',
              }}>
                {GEAR_SLOT_ICON[item.slot]} {GEAR_SLOT_LABEL[item.slot] ?? item.slot}
              </span>
              {item.is_equipped && (
                <span style={{
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#34d399', background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.3)', borderRadius: 4, padding: '2px 7px',
                }}>
                  Equipped
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            fontSize: 20, cursor: 'pointer', padding: '0 0 0 8px', lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>

        {/* Lore / description */}
        {item.description && (
          <p style={{
            fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic',
            lineHeight: 1.6, margin: '14px 20px 0',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            "{item.description}"
          </p>
        )}

        {/* Stats */}
        {mods.length > 0 && (
          <div style={{ margin: '14px 20px 0' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Stats
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mods.map(([key, val]) => (
                <div key={key} style={{
                  background: `${color}0D`, border: `1px solid ${color}30`,
                  borderRadius: 6, padding: '5px 10px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 12, color, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                    +{typeof val === 'number' && val < 1 ? `${Math.round(val * 100)}%` : val}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
                    {MODIFIER_LABEL[key] ?? key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <div style={{ padding: '20px 20px 0' }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-3)',
            fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: '0.1em',
            cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Gear Slot Card ─────────────────────────────────────────────
function GearSlotCard({ slot, item }: { slot: string; item: GearItem | null }) {
  const [modalOpen, setModalOpen] = useState(false);
  const rarity = item ? ((item.rarity as Rarity) ?? 'common') : null;
  const color  = rarity ? (RARITY_COLOR[rarity] ?? '#8899AA') : 'rgba(232,224,204,0.10)';
  const glow   = rarity ? RARITY_GLOW[rarity] : 'transparent';
  return (
    <>
      {modalOpen && item && <GearItemModal item={item} onClose={() => setModalOpen(false)} />}
      <div
        onClick={() => item && setModalOpen(true)}
        style={{
          background: rarity ? `linear-gradient(160deg, ${glow}30 0%, var(--surface) 55%)` : 'var(--surface)',
          border: `${rarity ? 2 : 1}px solid ${color}`,
          borderRadius: 'var(--radius)', padding: '10px 6px 8px', textAlign: 'center', minHeight: 94,
          boxShadow: rarity ? `0 0 20px ${glow}, inset 0 0 10px ${glow}33` : 'none',
          transition: 'all 0.2s ease', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          cursor: item ? 'pointer' : 'default',
        }}>
      {rarity && (
        <div style={{
          position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: '0 0 4px 4px',
        }} />
      )}
      {item ? (
        <>
          <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 3, color, filter: `drop-shadow(0 0 6px ${color})` }}>
            {item.icon ?? GEAR_SLOT_ICON[slot]}
          </div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 10, fontWeight: 700, color, margin: 0, lineHeight: 1.25, textShadow: `0 0 10px ${color}80`, wordBreak: 'break-word', maxWidth: '100%' }}>
            {item.item_name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(232,224,204,0.25)', lineHeight: 1 }}>{GEAR_SLOT_ICON[slot]}</span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 7, color: 'rgba(232,224,204,0.25)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {GEAR_SLOT_LABEL[slot]}
            </span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 16, color: 'rgba(232,224,204,0.15)', marginBottom: 3 }}>{GEAR_SLOT_ICON[slot]}</div>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 8, color: 'rgba(232,224,204,0.20)', letterSpacing: '0.10em', textTransform: 'uppercase', margin: '0 0 2px' }}>
            {GEAR_SLOT_LABEL[slot]}
          </p>
          <p style={{ fontSize: 9, color: 'rgba(232,224,204,0.15)', margin: 0, fontStyle: 'italic' }}>Empty</p>
        </>
      )}
    </div>
    </>
  );
}

// ── Inventory Card (with Dismantle) ────────────────────────────
function InventoryCard({ item, onEquip, onDismantle }: { item: GearItem; onEquip: () => void; onDismantle: () => void }) {
  const rarity      = (item.rarity as Rarity) ?? 'common';
  const color       = RARITY_COLOR[rarity] ?? '#8899AA';
  const [busy, setBusy]               = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const yield_ = DISMANTLE_YIELD[rarity];

  const handleEquip = async () => {
    setBusy(true);
    try { await onEquip(); } finally { setBusy(false); }
  };

  if (showConfirm) {
    return (
      <div style={{
        background: 'var(--surface)', border: `1px solid rgba(200,94,40,0.4)`,
        borderRadius: 'var(--radius)', padding: '12px 14px',
        boxShadow: '0 0 12px rgba(200,94,40,0.15)',
      }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#F0EDE6', margin: '0 0 4px' }}>
          Dismantle <span style={{ color }}>{item.item_name}</span>?
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 10px', lineHeight: 1.5 }}>
          You will receive:{' '}
          <span style={{ color: '#FFA500', fontWeight: 700 }}>+{yield_.nexus} Nexus</span>
          {yield_.components.map(c => (
            <span key={c.id}> · <span style={{ color: '#F0EDE6', fontWeight: 600 }}>{c.icon} ×{c.qty} {c.name}</span></span>
          ))}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowConfirm(false); onDismantle(); }} style={{
            flex: 1, padding: '8px 0', background: 'rgba(200,94,40,0.15)',
            color: '#C85E28', border: '1px solid rgba(200,94,40,0.4)', borderRadius: 7,
            fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            Dismantle
          </button>
          <button onClick={() => setShowConfirm(false)} style={{
            flex: 1, padding: '8px 0', background: 'transparent',
            color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 7,
            fontFamily: 'Cinzel, serif', fontSize: 11, cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {modalOpen && <GearItemModal item={item} onClose={() => setModalOpen(false)} />}
      <div style={{
        background: 'var(--surface)', border: `1px solid ${color}`,
        borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: `0 0 10px ${RARITY_GLOW[rarity]}`,
      }}>
        {/* Tappable icon + name area */}
        <div onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{
            width: 40, height: 40, flexShrink: 0, background: RARITY_GLOW[rarity],
            border: `1px solid ${color}`, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {item.icon ?? '⚔'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color, margin: '0 0 2px' }}>
              {item.item_name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {RARITY_LABEL[rarity]} · {GEAR_SLOT_LABEL[item.slot] ?? item.slot}
            </p>
          </div>
        </div>
        {/* Equip */}
        <button onClick={handleEquip} disabled={busy} style={{
          padding: '8px 12px', flexShrink: 0, background: color, color: '#0B0A08',
          border: `2px solid ${color}`, borderRadius: 6,
          fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 900,
          cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
          letterSpacing: '0.06em', boxShadow: `0 0 8px ${color}60`, minWidth: 52,
        }}>
          {busy ? '…' : 'EQUIP'}
        </button>
        {/* Dismantle */}
        <button onClick={() => setShowConfirm(true)} title="Dismantle for components" style={{
          padding: '8px 10px', flexShrink: 0, background: 'transparent',
          color: 'rgba(232,224,204,0.3)', border: '1px solid var(--border)',
          borderRadius: 6, cursor: 'pointer', fontSize: 14,
          transition: 'all 0.15s',
        }}>
          🔨
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
//   CODEX PWA — PIK-PRD API Client  (Sprint 4)
// ═══════════════════════════════════════════════════════

const PIK_BASE = 'https://pik-prd-production.up.railway.app';

// ── Types ─────────────────────────────────────────────

export type Alignment = 'ORDER' | 'VEIL' | 'WILD' | 'DARK' | 'NONE' | 'LIGHT';
export type Rarity    = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface GearItem {
  inventory_id: string; item_id: string; item_name: string; slot: string;
  rarity: Rarity; icon: string; description: string; lore_text: string;
  modifiers: Record<string, number>; is_equipped: boolean;
  acquired_at: string; acquired_via: string;
}

export interface GearEquipment {
  weapon: GearItem | null; helm: GearItem | null; chest: GearItem | null;
  arms: GearItem | null; legs: GearItem | null; rune: GearItem | null;
}

export interface ComputedModifiers {
  xp_bonus_pct: number; boss_damage_pct: number; luck_pct: number;
  defense: number; crit_pct: number; cooldown_pct: number; fate_affinity: number;
}

export interface Gear {
  inventory: GearItem[]; equipment: GearEquipment;
  computed_modifiers: ComputedModifiers;
}

export interface HeroTitle {
  title_id: string; title_name: string; category: string;
  granted_at: string; rarity: Rarity;
}

export interface SourceLink {
  source_id: string; source_name: string; linked_at: string;
  is_active: boolean; scope: string;
}

export interface SourceProgression {
  source_id: string; source_name: string; sessions: number;
  xp_contributed: number; boss_kills: number; best_boss_pct: number;
  caches_granted: number; gear_acquired: number;
  first_activity: string; last_activity: string;
}

export interface FateCache {
  cache_id: string; cache_type: string; rarity: Rarity;
  status: 'opened' | 'pending'; trigger: string;
  granted_at: string; opened_at: string;
  reward: { type: string; value: string; name: string; rarity: Rarity } | null;
}

export interface ActivityEvent {
  event_id: string; event_type: string;
  payload: Record<string, unknown>; changes: Record<string, unknown> | null;
  ts: string; source_id: string | null;
}

export interface Progression {
  // Account-wide (FateAccount)
  fate_level: number; total_xp: number;
  xp_to_next_level: number; xp_in_current_level: number;
  // Character-specific (RootIdentity) — Sprint 15
  hero_level: number; hero_xp: number;
  hero_xp_in_level: number; hero_xp_to_next: number;
  sessions_completed: number; fate_markers: string[];
  titles: HeroTitle[]; equipped_title: string | null;
}

export interface NarrativeProfile {
  region: string; class: string; origin: string;
  wound: string; calling: string; virtue: string; vice: string;
}

export interface Hero {
  root_id: string; display_name: string; alignment: Alignment;
  account_type: string; created_at: string;
  progression: Progression; gear: Gear | null;
  sources: SourceLink[]; source_progression: SourceProgression[];
  fate_caches: FateCache[];
  wearable: { status: 'active' | 'expired' | 'revoked'; issued_at: string } | null;
  recent_events: ActivityEvent[]; narrative: NarrativeProfile;
}

export interface LeaderboardEntry {
  rank: number; root_id: string; display_name: string;
  alignment: Alignment; value: number; fate_level: number; sessions: number;
}

// ── Alignment ─────────────────────────────────────────

export const ALIGNMENT_COLOR: Record<string, string> = {
  ORDER: '#C8A04E', LIGHT: '#C8A04E',
  VEIL:  '#7A5888', DARK:  '#7A5888',
  WILD:  '#486E48', NONE:  '#5A4E3C', '': '#5A4E3C',
};

// ── Tiers ──────────────────────────────────────────────
export interface Tier { name: string; color: string; min: number; max: number; }
export const TIERS: Tier[] = [
  { name: 'Bronze',     color: '#cd7f32', min: 1,  max: 6  },
  { name: 'Copper',     color: '#b87333', min: 7,  max: 13 },
  { name: 'Silver',     color: '#c0c0c0', min: 14, max: 21 },
  { name: 'Gold',       color: '#ffd700', min: 22, max: 29 },
  { name: 'Platinum',   color: '#e5e4e2', min: 30, max: 39 },
  { name: 'Adamantium', color: '#4ff0d0', min: 40, max: 999 },
];
export function TIER_FOR_LEVEL(level: number): Tier {
  return TIERS.find(t => level >= t.min && level <= t.max) ?? TIERS[0];
}

export const ALIGNMENT_LABEL: Record<string, string> = {
  ORDER: 'ORDER', LIGHT: 'LIGHT',
  VEIL: 'VEIL',   DARK: 'DARK',
  WILD: 'WILD',   NONE: 'NONE', '': 'NONE',
};

// ── Narrative (deterministic from root_id) ────────────

const REGIONS  = ['The Iron Reach','The Veil Marches','Ashfeld Basin','The Deep Hollow','Cinderwall','The Pale Summit','Wraithfen','The Sunken Archive'];
const CLASSES  = ['Bladebound','Veilwalker','Ashcaller','Ironheart','Duskblade','Oathbreaker','Emberkin','Thornwarden'];
const ORIGINS  = ['Orphan of the Collapse','Former Sentinel','Exiled Noble','Born Beneath the Veil','Foundling of the Forge','Last of a Dead Order','Escaped Thrall','Wanderer Without Name'];
const WOUNDS   = ['Lost a brother to the Veil','Carries a shard of the shattered gate','Was once sworn to a dead god','Betrayed their order','Survived something they cannot name','Bears a mark they did not choose','Watched a city fall silent','Owes a debt to the dark'];
const CALLINGS = ['To reclaim what was taken','To understand what broke the world','To find the one who gave the order','To earn a name worth remembering','To close the wound before it spreads','To outlast every lie told about them','To finish the war that started without them','To prove the Veil was wrong about them'];
const VIRTUES  = ['Resolve','Precision','Mercy','Cunning','Fortitude','Loyalty','Patience','Clarity'];
const VICES    = ['Pride','Wrath','Doubt','Isolation','Obsession','Recklessness','Grief','Hunger'];

function seededIndex(seed: string, offset: number, len: number): number {
  let h = offset * 2654435761;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return Math.abs(h) % len;
}

export function generateNarrative(rootId: string): NarrativeProfile {
  const s = rootId.replace(/-/g, '');
  return {
    region:  REGIONS [seededIndex(s, 0, REGIONS.length)],
    class:   CLASSES [seededIndex(s, 1, CLASSES.length)],
    origin:  ORIGINS [seededIndex(s, 2, ORIGINS.length)],
    wound:   WOUNDS  [seededIndex(s, 3, WOUNDS.length)],
    calling: CALLINGS[seededIndex(s, 4, CALLINGS.length)],
    virtue:  VIRTUES [seededIndex(s, 5, VIRTUES.length)],
    vice:    VICES   [seededIndex(s, 6, VICES.length)],
  };
}

// ── Mappers ───────────────────────────────────────────

function mapListRow(r: Record<string, unknown>): Hero {
  const rootId = r.root_id as string;
  return {
    root_id: rootId, display_name: (r.hero_name ?? 'Unknown Hero') as string,
    alignment: ((r.fate_alignment as string) || 'NONE') as Alignment,
    account_type: 'registered', created_at: '',
    progression: {
      fate_level: (r.fate_level ?? 1) as number, total_xp: (r.fate_xp ?? 0) as number,
      xp_to_next_level: 0, xp_in_current_level: 0, sessions_completed: 0,
      fate_markers: [], titles: [], equipped_title: null,
    },
    gear: null, sources: [], source_progression: [], fate_caches: [],
    wearable: null, recent_events: [], narrative: generateNarrative(rootId),
  };
}

function mapTitle(t: Record<string, unknown>): HeroTitle {
  return {
    title_id:   (t.title_id ?? '') as string,
    title_name: (t.display_name ?? t.title_name ?? t.title_id ?? '') as string,
    category:   (t.category ?? 'general') as string,
    granted_at: (t.granted_at ?? '') as string,
    rarity:     'rare' as Rarity,
  };
}

function mapGearItem(g: Record<string, unknown>): GearItem {
  return {
    inventory_id: (g.inventory_id ?? '') as string,
    item_id:      (g.item_id ?? '') as string,
    item_name:    (g.item_name ?? '') as string,
    slot:         (g.slot ?? '') as string,
    rarity:       (g.rarity ?? 'common') as Rarity,
    icon:         (g.icon ?? '⚔') as string,
    description:  (g.description ?? '') as string,
    lore_text:    (g.lore_text ?? '') as string,
    modifiers:    (g.modifiers ?? {}) as Record<string, number>,
    is_equipped:  (g.is_equipped ?? false) as boolean,
    acquired_at:  (g.acquired_at ?? '') as string,
    acquired_via: (g.acquired_via ?? '') as string,
  };
}

function mapGear(raw: Record<string, unknown>): Gear {
  // Full data lives in inventory; equipment slots only have partial data.
  // Enrich equipment slots by looking up matching inventory_id.
  const inv = ((raw.inventory ?? []) as Record<string, unknown>[]).map(mapGearItem);
  const invMap = new Map(inv.map(i => [i.inventory_id, i]));

  const eq = (raw.equipment ?? {}) as Record<string, unknown>;
  const enrichSlot = (s: unknown): GearItem | null => {
    if (!s) return null;
    const partial = s as Record<string, unknown>;
    const full = invMap.get(partial.inventory_id as string);
    return full ?? mapGearItem(partial);
  };

  return {
    inventory: inv,
    equipment: {
      weapon: enrichSlot(eq.weapon), helm:  enrichSlot(eq.helm),
      chest:  enrichSlot(eq.chest),  arms:  enrichSlot(eq.arms),
      legs:   enrichSlot(eq.legs),   rune:  enrichSlot(eq.rune),
    },
    computed_modifiers: (raw.computed_modifiers ?? {
      xp_bonus_pct: 0, boss_damage_pct: 0, luck_pct: 0,
      defense: 0, crit_pct: 0, cooldown_pct: 0, fate_affinity: 0,
    }) as ComputedModifiers,
  };
}

function mapFateCache(c: Record<string, unknown>): FateCache {
  const reward = c.reward as Record<string, unknown> | null;
  return {
    cache_id:   (c.cache_id ?? '') as string,
    cache_type: (c.cache_type ?? '') as string,
    rarity:     (c.rarity ?? 'common') as Rarity,
    status:     (c.status ?? 'opened') as 'opened' | 'pending',
    trigger:    (c.trigger ?? '') as string,
    granted_at: (c.granted_at ?? '') as string,
    opened_at:  (c.opened_at ?? '') as string,
    reward: reward ? {
      type:   (reward.type ?? '') as string,
      value:  (reward.value ?? '') as string,
      name:   (reward.name ?? '') as string,
      rarity: (reward.rarity ?? 'common') as Rarity,
    } : null,
  };
}

function mapFullUser(r: Record<string, unknown>): Hero {
  const identity  = (r.identity  ?? {}) as Record<string, unknown>;
  const persona   = (r.persona   ?? {}) as Record<string, unknown>;
  const prog      = (r.progression ?? {}) as Record<string, unknown>;
  const links     = (r.source_links ?? []) as Record<string, unknown>[];
  const srcProg   = (r.source_progression ?? []) as Record<string, unknown>[];
  const events    = (r.recent_events ?? []) as Record<string, unknown>[];
  const wearables = (r.wearables ?? []) as Record<string, unknown>[];
  const caches    = (r.fate_caches ?? []) as Record<string, unknown>[];
  const rawGear   = r.gear as Record<string, unknown> | null;
  const rootId    = identity.root_id as string;

  const titlesDetail = (prog.titles_detail ?? []) as Record<string, unknown>[];
  const titlesRaw    = (prog.titles ?? []) as unknown[];
  const titles: HeroTitle[] = titlesDetail.length > 0
    ? titlesDetail.map(mapTitle)
    : titlesRaw.map(t => typeof t === 'string'
        ? { title_id: t, title_name: t.replace(/^title_/,'').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()), category: 'general', granted_at: '', rarity: 'rare' as Rarity }
        : mapTitle(t as Record<string, unknown>));

  const activeWearable = wearables.find(w => w.status === 'active');

  // ── Hero XP (character-specific) — Sprint 15 ──────────────────────────────
  // hero_xp / hero_level live directly on root_identities row, returned in
  // the identity sub-object of the API response.
  const XP_PER_LEVEL = 500;
  const heroXpRaw  = (identity.hero_xp  ?? prog.hero_xp  ?? (prog.fate_xp ?? 0)) as number;
  const heroLvRaw  = (identity.hero_level ?? prog.hero_level ?? (prog.fate_level ?? 1)) as number;
  const heroInLvl  = heroXpRaw - (heroLvRaw - 1) * XP_PER_LEVEL;
  const heroToNext = XP_PER_LEVEL;

  // ── Fate XP (account-wide) ────────────────────────────────────────────────
  const fateXpRaw = (prog.fate_xp ?? 0) as number;
  const fateLvRaw = (prog.fate_level ?? 1) as number;
  const fateInLvl = (prog.xp_in_current_level ?? (fateXpRaw - (fateLvRaw - 1) * XP_PER_LEVEL)) as number;

  return {
    root_id:      rootId,
    display_name: (persona.hero_name ?? persona.display_name ?? 'Unknown Hero') as string,
    alignment:    ((persona.fate_alignment as string) || 'NONE') as Alignment,
    account_type: (identity.status ?? 'registered') as string,
    created_at:   (identity.enrolled_at ?? '') as string,
    progression: {
      fate_level:          fateLvRaw,
      total_xp:            fateXpRaw,
      xp_to_next_level:    (prog.xp_needed_for_next ?? XP_PER_LEVEL) as number,
      xp_in_current_level: fateInLvl,
      hero_level:          heroLvRaw,
      hero_xp:             heroXpRaw,
      hero_xp_in_level:    Math.max(0, heroInLvl),
      hero_xp_to_next:     heroToNext,
      // Use total_sessions from progression object (authoritative)
      sessions_completed:  (prog.total_sessions ?? srcProg.reduce((a, s) => a + ((s.sessions as number) ?? 0), 0)) as number,
      fate_markers:        (prog.fate_markers ?? []) as string[],
      titles,
      equipped_title:      (persona.equipped_title ?? null) as string | null,
    },
    gear: rawGear ? mapGear(rawGear) : null,
    fate_caches: caches.map(mapFateCache),
    sources: links.map(l => ({
      source_id:   l.source_id as string,
      source_name: (l.source_name ?? l.source_id) as string,
      linked_at:   (l.granted_at ?? '') as string,
      is_active:   l.status === 'active',
      scope:       (l.scope ?? '') as string,
    })),
    source_progression: srcProg.map(s => ({
      source_id:      s.source_id as string,
      source_name:    (s.source_name ?? s.source_id) as string,
      sessions:       (s.sessions ?? 0) as number,
      xp_contributed: (s.xp_contributed ?? 0) as number,
      boss_kills:     (s.boss_kills ?? 0) as number,
      best_boss_pct:  (s.best_boss_pct ?? 0) as number,
      caches_granted: (s.caches_granted ?? 0) as number,
      gear_acquired:  (s.gear_acquired ?? 0) as number,
      first_activity: (s.first_activity ?? '') as string,
      last_activity:  (s.last_activity ?? '') as string,
    })),
    wearable: activeWearable
      ? { status: activeWearable.status as 'active', issued_at: (activeWearable.issued_at ?? '') as string }
      : null,
    recent_events: events.map(e => ({
      event_id:   (e.event_id ?? String(Math.random())) as string,
      event_type: (e.event_type ?? 'unknown') as string,
      payload:    (e.payload ?? {}) as Record<string, unknown>,
      changes:    (e.changes ?? null) as Record<string, unknown> | null,
      ts:         (e.created_at ?? '') as string,
      source_id:  (e.source_id ?? null) as string | null,
    })),
    narrative: generateNarrative(rootId),
  };
}

// ── Fetch ─────────────────────────────────────────────

async function pikFetch<T>(path: string): Promise<T> {
  const resp = await fetch(`${PIK_BASE}${path}`, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error(`PIK ${resp.status}: ${path}`);
  const json = await resp.json();
  return (json.data ?? json) as T;
}

export async function fetchHeroes(): Promise<Hero[]> {
  const raw = await pikFetch<Record<string, unknown>[]>('/api/users');
  return raw.map(mapListRow);
}

export async function fetchHero(rootId: string): Promise<Hero> {
  const raw = await pikFetch<Record<string, unknown>>(`/api/users/${rootId}`);
  return mapFullUser(raw);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const raw = await pikFetch<Record<string, unknown>[]>('/api/users');
  return raw
    .map(r => ({
      rank: 0, root_id: r.root_id as string,
      display_name: (r.hero_name ?? 'Unknown') as string,
      alignment: ((r.fate_alignment as string) || 'NONE') as Alignment,
      value: (r.fate_xp ?? 0) as number,
      fate_level: (r.fate_level ?? 1) as number,
      sessions: (r.active_sources ?? 0) as number,
    }))
    .sort((a, b) => b.value - a.value)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function xpProgress(prog: Progression): number {
  const needed = prog.xp_to_next_level;
  if (!needed) return 1;
  return Math.min(1, Math.max(0, prog.xp_in_current_level / needed));
}

export const MODIFIER_LABEL: Record<string, string> = {
  xp_bonus_pct: 'XP Bonus', boss_damage_pct: 'Boss Dmg', luck_pct: 'Luck',
  defense: 'Defense', crit_pct: 'Crit', cooldown_pct: 'Cooldown', fate_affinity: 'Fate Affinity',
};

// ── Vault API ─────────────────────────────────────────
// Sprint 8: Cache opening, title equipping, gear equipping

/** Open a sealed Fate Cache — requires Bearer token */
export async function openFateCache(
  rootId: string,
  cacheId: string,
  token: string,
): Promise<{
  reward_type:  string;
  reward_value: string;
  display_name: string;
  rarity_tier:  Rarity;
  xp_granted?:  number;
  message?:     string;
}> {
  const res = await fetch(`${PIK_BASE}/api/users/${rootId}/caches/${cacheId}/open`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Failed to open cache');
  return json?.data ?? json;
}

/** Equip a title — pass titleId = 'none' to remove */
export async function equipTitle(
  rootId: string,
  titleId: string,
  token: string,
): Promise<{ equipped_title: string | null; display_name?: string; message: string }> {
  const res = await fetch(`${PIK_BASE}/api/users/${rootId}/titles/${titleId}/equip`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Failed to equip title');
  return json?.data ?? json;
}

/** Fetch all titles (earned + locked) for a hero — requires Bearer token */
export async function fetchTitles(
  rootId: string,
  token: string,
): Promise<Array<{
  title_id:     string;
  display_name: string;
  category:     string;
  description:  string | null;
  is_earned:    boolean;
  is_equipped:  boolean;
  granted_at:   string | null;
}>> {
  const res = await fetch(`${PIK_BASE}/api/users/${rootId}/titles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Failed to fetch titles');
  return json?.data ?? [];
}

/** Equip a gear item from inventory */
export async function equipGear(
  rootId: string,
  inventoryId: string,
  token: string,
): Promise<{ message: string }> {
  const res = await fetch(`${PIK_BASE}/api/users/${rootId}/gear/${inventoryId}/equip`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Failed to equip gear');
  return json?.data ?? json;
}

// ── Mock ──────────────────────────────────────────────

export const MOCK_HEROES: Hero[] = [{
  root_id: 'mock-001', display_name: 'Aethon Brightforge', alignment: 'ORDER',
  account_type: 'registered', created_at: '2025-01-01T00:00:00Z',
  progression: {
    fate_level: 7, total_xp: 3200, xp_to_next_level: 500,
    xp_in_current_level: 200, sessions_completed: 14,
    fate_markers: ['Felt the threads of fate shift and realign', 'Claimed a trophy from a fallen guardian'],
    titles: [
      { title_id: 'title_fate_awakened', title_name: 'FATE AWAKENED', category: 'fate', granted_at: '2025-01-10T00:00:00Z', rarity: 'rare' },
      { title_id: 'title_veil_touched',  title_name: 'Veil Touched',  category: 'boss', granted_at: '2025-02-01T00:00:00Z', rarity: 'epic' },
    ],
    equipped_title: 'title_veil_touched',
  },
  gear: null, fate_caches: [],
  sources: [{ source_id: 'hv-001', source_name: "Heroes' Veritas — Venue 01", linked_at: '2025-01-01T00:00:00Z', is_active: true, scope: 'xp fate_markers titles' }],
  source_progression: [{ source_id: 'hv-001', source_name: "Heroes' Veritas — Venue 01", sessions: 14, xp_contributed: 3200, boss_kills: 8, best_boss_pct: 80, caches_granted: 12, gear_acquired: 5, first_activity: '2025-01-01T00:00:00Z', last_activity: '2025-03-01T00:00:00Z' }],
  wearable: null,
  recent_events: [
    { event_id: 'e1', event_type: 'progression.xp_granted', payload: { xp: 150 }, changes: null, ts: '2025-03-05T10:00:00Z', source_id: 'hv-001' },
    { event_id: 'e2', event_type: 'loot.cache_opened', payload: { cache_type: 'boss_kill' }, changes: { reward_name: 'Ember Dirk', reward_rarity: 'uncommon' }, ts: '2025-03-04T18:35:00Z', source_id: 'hv-001' },
  ],
  narrative: generateNarrative('mock-001'),
}];

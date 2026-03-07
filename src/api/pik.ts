// ═══════════════════════════════════════════════════════
//   CODEX PWA — PIK API Client
// ═══════════════════════════════════════════════════════

const PIK_BASE = 'https://pik-prd-production.up.railway.app';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Alignment = 'Order' | 'Veil' | 'Wild';
export type Rarity = 'common' | 'honored' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Progression {
  fate_level:               number;
  total_xp:                 number;
  xp_to_next_level:         number;
  sessions_completed:       number;
  best_completion_time_secs: number | null;
  highest_difficulty:       string;
  fate_markers?:            string[];
}

export interface HeroTitle {
  title_id:   string;
  title_name: string;
  earned_at:  string;
  rarity:     Rarity;
}

export interface LootItem {
  item_id:      string;
  display_name: string;
  category:     string;
  rarity:       Rarity;
  description:  string;
  earned_at:    string;
}

export interface SourceLink {
  source_id:   string;
  source_name: string;
  linked_at:   string;
  is_active:   boolean;
}

export interface ActivityEvent {
  event_id:   string;
  event_type: string;
  payload:    Record<string, unknown>;
  changes:    Record<string, unknown>;
  ts:         string;
  source_id:  string | null;
}

export interface Hero {
  root_id:       string;
  display_name:  string;
  persona:       string;
  alignment:     Alignment;
  account_type:  string;
  created_at:    string;
  progression:   Progression;
  titles:        HeroTitle[];
  loot:          LootItem[];
  sources:       SourceLink[];
  wearable:      { status: 'active' | 'expired' | 'revoked'; issued_at: string } | null;
  recent_events: ActivityEvent[];
}

export interface LeaderboardEntry {
  rank:         number;
  root_id:      string;
  display_name: string;
  alignment:    Alignment;
  value:        number;
  fate_level:   number;
  sessions:     number;
}

// ── Title registry ────────────────────────────────────────────────────────────

const TITLE_REGISTRY: Record<string, string> = {
  iron_vow:      'Iron-Vowed',
  ember_watch:   'Hero of the Emberwatch',
  first_blood:   'First Blood',
  shadow_walker: 'Shadow Walker',
  veil_touched:  'Veil-Touched',
  wild_heart:    'Wild Heart',
  order_keeper:  'Keeper of Order',
  fate_seeker:   'Fate Seeker',
  node_breaker:  'Node Breaker',
  perfect_run:   'Perfect Run',
  speed_demon:   'Speed Demon',
  veteran:       'Veteran',
  legend:        'Living Legend',
};

function formatTitleId(id: string): string {
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapListRow(r: Record<string, unknown>): Hero {
  return {
    root_id:      r.root_id as string,
    display_name: (r.hero_name ?? r.display_name ?? 'Unknown Hero') as string,
    persona:      (r.persona_id ?? '') as string,
    alignment:    (r.fate_alignment ?? r.alignment ?? 'Order') as Alignment,
    account_type: (r.status ?? 'registered') as string,
    created_at:   (r.created_at ?? '') as string,
    progression: {
      fate_level:               (r.fate_level ?? 1) as number,
      total_xp:                 (r.fate_xp ?? 0) as number,
      xp_to_next_level:         (r.xp_needed_for_next ?? 500) as number,
      sessions_completed:       (r.total_sessions ?? 0) as number,
      best_completion_time_secs: null,
      highest_difficulty:       'normal',
    },
    titles: [], loot: [], sources: [], wearable: null, recent_events: [],
  };
}

function mapFullUser(r: Record<string, unknown>): Hero {
  const identity = (r.identity ?? r) as Record<string, unknown>;
  const persona  = (r.persona  ?? {}) as Record<string, unknown>;
  const prog     = (r.progression ?? {}) as Record<string, unknown>;
  const links    = (r.source_links  ?? []) as Record<string, unknown>[];
  const events   = (r.recent_events ?? []) as Record<string, unknown>[];

  const rawTitles = (prog.titles ?? []) as unknown[];

  return {
    root_id:      identity.root_id as string,
    display_name: (persona.hero_name ?? identity.display_name ?? 'Unknown Hero') as string,
    persona:      (persona.persona_id ?? '') as string,
    alignment:    (persona.fate_alignment ?? identity.alignment ?? 'Order') as Alignment,
    account_type: (identity.status ?? 'registered') as string,
    created_at:   (identity.created_at ?? '') as string,
    progression: {
      fate_level:               (prog.fate_level ?? 1) as number,
      total_xp:                 (prog.fate_xp ?? 0) as number,
      xp_to_next_level:         (prog.xp_needed_for_next ?? 500) as number,
      sessions_completed:       (prog.total_sessions ?? 0) as number,
      best_completion_time_secs: (prog.best_completion_time_secs ?? null) as number | null,
      highest_difficulty:       (prog.highest_difficulty ?? 'normal') as string,
      fate_markers:             (prog.fate_markers ?? []) as string[],
    },
    titles: rawTitles.map(t => {
      if (typeof t === 'string') return {
        title_id: t, title_name: TITLE_REGISTRY[t] ?? formatTitleId(t),
        earned_at: '', rarity: 'common' as Rarity,
      };
      const to = t as Record<string, unknown>;
      return {
        title_id:   to.title_id as string,
        title_name: (to.title_name ?? TITLE_REGISTRY[to.title_id as string] ?? formatTitleId(to.title_id as string)) as string,
        earned_at:  (to.earned_at ?? '') as string,
        rarity:     (to.rarity ?? 'common') as Rarity,
      };
    }),
    loot: [],
    sources: links.map(l => ({
      source_id:   l.source_id as string,
      source_name: (l.source_name ?? l.source_id) as string,
      linked_at:   (l.granted_at ?? l.linked_at ?? '') as string,
      is_active:   l.status === 'active',
    })),
    wearable: null,
    recent_events: events.map(e => ({
      event_id:   (e.event_id ?? String(Math.random())) as string,
      event_type: (e.event_type ?? 'unknown') as string,
      payload:    (typeof e.payload === 'string' ? JSON.parse(e.payload || '{}') : (e.payload ?? {})) as Record<string, unknown>,
      changes:    (typeof e.changes === 'string' ? JSON.parse(e.changes || '{}') : (e.changes ?? {})) as Record<string, unknown>,
      ts:         (e.occurred_at ?? e.ts ?? '') as string,
      source_id:  (e.source_id ?? null) as string | null,
    })),
  };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function pikFetch<T>(path: string): Promise<T> {
  const resp = await fetch(`${PIK_BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) throw new Error(`PIK ${resp.status}: ${path}`);
  const json = await resp.json();
  return (json.data ?? json) as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchHeroes(): Promise<Hero[]> {
  const raw = await pikFetch<Record<string, unknown>[]>('/api/users');
  return raw.map(mapListRow);
}

export async function fetchHero(rootId: string): Promise<Hero> {
  const raw = await pikFetch<Record<string, unknown>>(`/api/users/${rootId}`);
  return mapFullUser(raw);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const heroes = await fetchHeroes();
  return heroes
    .sort((a, b) => b.progression.total_xp - a.progression.total_xp)
    .map((h, i) => ({
      rank:         i + 1,
      root_id:      h.root_id,
      display_name: h.display_name,
      alignment:    h.alignment,
      value:        h.progression.total_xp,
      fate_level:   h.progression.fate_level,
      sessions:     h.progression.sessions_completed,
    }));
}

// ── XP helpers ────────────────────────────────────────────────────────────────

export function xpProgress(prog: Progression): number {
  const needed = prog.fate_level * 500;
  const prev   = (prog.fate_level - 1) * 500;
  return Math.min(1, Math.max(0, (prog.total_xp - prev) / (needed - prev)));
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_HEROES: Hero[] = [{
  root_id: 'mock-001', display_name: 'Aethon Brightforge', persona: 'Aethon',
  alignment: 'Order', account_type: 'registered', created_at: '2025-01-01T00:00:00Z',
  progression: {
    fate_level: 7, total_xp: 3200, xp_to_next_level: 300,
    sessions_completed: 14, best_completion_time_secs: 2847,
    highest_difficulty: 'hard', fate_markers: ['ember_touched', 'veil_witnessed'],
  },
  titles: [
    { title_id: 'iron_vow', title_name: 'Iron-Vowed', earned_at: '2025-01-10T00:00:00Z', rarity: 'rare' },
    { title_id: 'ember_watch', title_name: 'Hero of the Emberwatch', earned_at: '2025-02-01T00:00:00Z', rarity: 'epic' },
  ],
  loot: [
    { item_id: 'blade-001', display_name: 'Ashen Blade', category: 'weapon_skin', rarity: 'epic', description: 'Forged from the embers of the first forge.', earned_at: '2025-01-15T00:00:00Z' },
  ],
  sources: [{ source_id: 'hv-001', source_name: "Heroes' Veritas", linked_at: '2025-01-01T00:00:00Z', is_active: true }],
  wearable: { status: 'active', issued_at: '2025-03-01T00:00:00Z' },
  recent_events: [
    { event_id: 'e1', event_type: 'progression.xp_granted', payload: { xp: 150 }, changes: {}, ts: '2025-03-05T10:00:00Z', source_id: 'hv-001' },
    { event_id: 'e2', event_type: 'progression.session_completed', payload: { difficulty: 'hard', nodes_completed: 6 }, changes: {}, ts: '2025-03-04T18:30:00Z', source_id: 'hv-001' },
    { event_id: 'e3', event_type: 'loot.cache_opened', payload: {}, changes: { reward_name: 'Ashen Blade', reward_rarity: 'epic' }, ts: '2025-03-04T18:35:00Z', source_id: 'hv-001' },
  ],
}];

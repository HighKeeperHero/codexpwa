// src/screens/VeilTearsScreen.tsx
// Requires: npm install leaflet @types/leaflet
// Add to index.css (or import at top): @import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../AuthContext';

const PIK_BASE = 'https://pik-prd-production.up.railway.app';

interface ServerResult {
  shards: number;
  multiplier?: number;
  convergence_event?: string;
  cache_earned?: { cache_id: string; cache_type: string; rarity: string } | null;
  quests_completed?: Array<{ quest_id: string; name: string; cache: object | null }>;
}

interface ActiveEvent {
  event_id: string; name: string; description?: string; flavor_text?: string;
  affected_tiers: string[]; shard_multiplier: number; cache_bonus: boolean; ends_at: number;
}

// Posts encounter to backend and returns enriched server result.
async function postEncounter(
  rootId: string | undefined,
  payload: { tear_type: string; tear_name: string; outcome: 'won' | 'fled'; shards: number; lat?: number; lon?: number; }
): Promise<ServerResult | null> {
  if (!rootId) return null;
  try {
    const res = await fetch(`${PIK_BASE}/api/veil/encounter`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ root_id: rootId, ...payload }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; /* localStorage record is the fallback */ }
}

// Fetches active convergence events (global, no auth needed).
async function fetchActiveEvents(): Promise<ActiveEvent[]> {
  try {
    const res = await fetch(`${PIK_BASE}/api/veil/events/active`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// ─── Types ──────────────────────────────────────────────────────────────────

type TearType = 'minor' | 'wander' | 'dormant' | 'double';

interface Tear {
  id: number;
  type: TearType;
  lat: number;
  lon: number;
  name: string;
  lore: string;
  sealed: boolean;
  marker?: L.Marker;
}

interface TearTypeDef {
  label: string;
  glyph: string;
  color: string;
  bgColor: string;
  names: string[];
  lore: string[];
  tier: string;
  hp: number;
  dur: string;
  rewards: RewardDef[];
}

interface RewardDef {
  icon: string;
  label: string;
  val: string;
  color: string;
  border: string;
}

type BattleAction = 'strike' | 'ability' | 'item' | 'retreat';
type ScreenState = 'map' | 'battle' | 'victory' | 'defeat';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEMO_LAT = 38.6773;
const DEMO_LON = -121.235;

const TEAR_TYPES: Record<TearType, TearTypeDef> = {
  minor: {
    label: 'MINOR THREAT',
    glyph: '✦',
    color: '#1A6ED4',
    bgColor: 'rgba(26,110,212,0.15)',
    names: ['Ashfeld Rift', 'Shadow Fracture', 'Blue Seam', 'Pale Breach', 'Veil Thinning'],
    lore: [
      'A thin place in the Veil. Something small presses through from the dark mirror.',
      'The fabric of Elysendar strains here. A minor Shade has slipped through.',
      'Corruption seeps from this fracture. Seal it before it widens.',
      'The world is thinner here — a small wound, but wounds invite worse things.',
    ],
    tier: 'T1', hp: 60, dur: '~2m',
    rewards: [
      { icon: '◆', label: 'Veil Shards', val: '8–12', color: 'rgba(26,110,212,0.15)', border: 'rgba(26,110,212,0.3)' },
      { icon: '◇', label: 'Lore Fragment', val: '+1', color: 'rgba(200,144,10,0.1)', border: 'rgba(200,144,10,0.25)' },
    ],
  },
  wander: {
    label: 'WANDERING SHADE',
    glyph: '◉',
    color: '#8040C8',
    bgColor: 'rgba(128,64,200,0.15)',
    names: ['Drifting Hollow', 'Veil Wanderer', 'Lost Shade', 'Unmoored Specter', 'Errant Hollow'],
    lore: [
      'This shade moves with purpose. It has not yet found its target.',
      'Torn from the dark mirror, this entity drifts without anchor.',
      'A wandering hollow — more dangerous than a fixed tear, less predictable.',
    ],
    tier: 'T2', hp: 120, dur: '~4m',
    rewards: [
      { icon: '◆', label: 'Veil Shards', val: '15–20', color: 'rgba(128,64,200,0.15)', border: 'rgba(128,64,200,0.35)' },
      { icon: '◧', label: 'Craft Material', val: '+2', color: 'rgba(128,64,200,0.12)', border: 'rgba(128,64,200,0.3)' },
    ],
  },
  dormant: {
    label: 'DORMANT RIFT',
    glyph: '⊛',
    color: '#E8820A',
    bgColor: 'rgba(232,130,10,0.15)',
    names: ['The Gathering Dark', 'Ancient Rupture', 'Veil Wound', 'Ember Scar', 'Realm Fracture'],
    lore: [
      'This rift has been here longer than you. It will require three visits to seal.',
      'Something ancient holds this fracture open. It recognizes you now.',
      'The Veil wound runs deep. Approach it three times — it will not yield in one.',
    ],
    tier: 'T3', hp: 240, dur: '~3 visits',
    rewards: [
      { icon: '◆', label: 'Veil Shards', val: '30–50', color: 'rgba(232,130,10,0.15)', border: 'rgba(232,130,10,0.35)' },
      { icon: '✦', label: 'Rare Material', val: '+1', color: 'rgba(232,130,10,0.1)', border: 'rgba(232,130,10,0.25)' },
      { icon: '◇', label: 'Deep Lore', val: '+3', color: 'rgba(200,144,10,0.1)', border: 'rgba(200,144,10,0.25)' },
    ],
  },
  double: {
    label: 'DOUBLE RIFT EVENT',
    glyph: '⚡',
    color: '#CC1020',
    bgColor: 'rgba(204,16,32,0.18)',
    names: ['The Shattering', 'Twin Veil Breach', 'Convergence Wound', 'Dual Fracture', 'The Bleeding Point'],
    lore: [
      'Two rifts tearing simultaneously. The Veil is screaming.',
      'A convergence event. Two wounds feeding each other — seal both or neither holds.',
      'This has never happened this close to the Source. Something is orchestrating this.',
    ],
    tier: 'T4', hp: 400, dur: '~8m',
    rewards: [
      { icon: '⚡', label: 'Veil Shards', val: '60–90', color: 'rgba(204,16,32,0.15)', border: 'rgba(204,16,32,0.4)' },
      { icon: '◆', label: 'Epic Material', val: '+3', color: 'rgba(204,16,32,0.12)', border: 'rgba(204,16,32,0.3)' },
      { icon: '✦', label: 'Event Lore', val: '+5', color: 'rgba(200,144,10,0.1)', border: 'rgba(200,144,10,0.25)' },
    ],
  },
};

const TELEGRAPHS: Record<TearType, string[]> = {
  minor:   ['The shade lashes out with shadowed claws…', 'A tendril of darkness reaches toward you…', 'The rift pulses with dim energy…'],
  wander:  ['The wandering shade focuses its gaze on you…', 'It draws power from the fracture behind it…', 'The Shade prepares a Veil Surge…'],
  dormant: ['The rift thrums with ancient malice…', 'Something vast stirs within the dormant wound…', 'The darkness coalesces into a striking form…'],
  double:  ['BOTH rifts discharge simultaneously—', 'The twin wounds arc electricity between them—', 'A surge of raw Veil energy crackles toward you—'],
};

const BATTLE_LOGS = {
  strike:  ['You drive your blade through the fracture.', 'The Veil shudders under your assault.', 'Your strike lands true — the shade recoils.'],
  ability: ['Resonance flows through you — the Shade buckles.', "You channel the Veil's own power against it.", "The ability tears through the shade's essence."],
  item:    ['You consume a Veil Shard Flask — vitality restored.', "The shard's energy mends what the dark has torn."],
  hit:     ['The shade\'s attack finds purchase — you stagger.', 'Darkness claws at your resolve.', 'You absorb the blow but feel the cost.'],
  miss:    ['The shade\'s strike passes harmlessly.', 'You evade — the dark finds nothing.'],
};

const DAILY_QUESTS = [
  { id: 'warden',       title: "The Warden's Signal",  desc: 'Seal 3 Minor Tears before midnight.', reward: '15 Shards',    icon: '⚔', max: 3 },
  { id: 'echoes',       title: 'Echoes of the Source', desc: 'Walk 1km near a Tear without engaging.', reward: 'Attunement', icon: '◈', max: 1 },
  { id: 'firstlight',   title: 'First Light',          desc: 'Open the app before 9am.',            reward: 'Lore Fragment', icon: '◇', max: 1 },
  { id: 'gatheringdark',title: 'The Gathering Dark',   desc: 'Locate a Dormant Rift near you.',      reward: 'Rift Map',      icon: '⊛', max: 1 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function spawnTears(lat: number, lon: number): Omit<Tear, 'marker'>[] {
  const day     = Math.floor(Date.now() / 86400000);
  const gridLat = Math.round(lat * 1000);
  const gridLon = Math.round(lon * 1000);
  const rand    = seededRand((gridLat * 73856093) ^ (gridLon * 19349663) ^ day);
  const spread  = 0.012;

  const defs: TearType[] = ['minor', 'minor', 'minor', 'wander', 'wander', 'dormant', 'double'];

  return defs.map((type, i) => {
    const angle = rand() * Math.PI * 2;
    const dist  = (0.3 + rand() * 0.7) * spread;
    const tLat  = lat + Math.sin(angle) * dist;
    const tLon  = lon + Math.cos(angle) * dist / Math.cos((lat * Math.PI) / 180);
    const td    = TEAR_TYPES[type];
    const name  = td.names[Math.floor(rand() * td.names.length)];
    const lore  = td.lore[Math.floor(rand() * td.lore.length)];
    return { id: i, type, lat: tLat, lon: tLon, name, lore, sealed: false };
  });
}

function tearMarkerHTML(type: TearType): string {
  const td = TEAR_TYPES[type];
  const extraRings = type === 'double'
    ? `<div style="position:absolute;inset:-18px;border-radius:50%;border:1px solid ${td.color}40;animation:tearRing 0.5s ease-out infinite 0.25s;opacity:0"></div>`
    : '';
  return `
    <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer">
      <div class="vt-tear-inner vt-tear-${type}" style="
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        position:relative;
        background:radial-gradient(circle,${td.bgColor},transparent);
        border:1px solid ${td.color}99;
        box-shadow:0 0 14px ${td.color}88,inset 0 0 8px ${td.color}33;
      ">
        <div style="position:absolute;inset:-6px;border-radius:50%;border:1px solid ${td.color}77;animation:tearRing ${type === 'double' ? '0.5s' : type === 'dormant' ? '0.9s' : type === 'wander' ? '1.2s' : '2s'} ease-out infinite;opacity:0"></div>
        <div style="position:absolute;inset:-12px;border-radius:50%;border:1px solid ${td.color}33;animation:tearRing ${type === 'double' ? '0.5s' : type === 'dormant' ? '0.9s' : type === 'wander' ? '1.2s' : '2s'} ease-out infinite 0.6s;opacity:0"></div>
        ${extraRings}
        <span style="font-size:13px;color:${td.color};text-shadow:0 0 10px ${td.color};z-index:1">${td.glyph}</span>
      </div>
    </div>`;
}

function midnight(): string {
  const now     = new Date();
  const end     = new Date();
  end.setUTCHours(24, 0, 0, 0);
  const diff    = end.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VeilTearsScreen() {
  const { hero } = useAuth();

  // Map refs
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<L.Map | null>(null);
  const tearsRef    = useRef<Tear[]>([]);

  // Location / init
  const [locationReady, setLocationReady]   = useState(false);
  const [coords, setCoords]                 = useState<[number, number]>([DEMO_LAT, DEMO_LON]);

  // UI state
  const [activeTear, setActiveTear]         = useState<Tear | null>(null);
  const [screen, setScreen]                 = useState<ScreenState>('map');
  const [countdown, setCountdown]           = useState(midnight());

  // Battle state
  const [enemyHp, setEnemyHp]               = useState(0);
  const [enemyMaxHp, setEnemyMaxHp]         = useState(1);
  const [playerHp, setPlayerHp]             = useState(100);
  const [battleLog, setBattleLog]           = useState("The Veil tears open before you.");
  const [telegraph, setTelegraph]           = useState("The shade gathers dark energy…");
  const [battleBusy, setBattleBusy]         = useState(false);
  const [damageFlash, setDamageFlash]       = useState<string | null>(null);
  const [battleResult, setBattleResult]     = useState<{ won: boolean; shards: number } | null>(null);
  const [serverResult, setServerResult]     = useState<ServerResult | null>(null);
  const [activeEvents, setActiveEvents]     = useState<ActiveEvent[]>([]);

  // Load convergence events on mount
  useEffect(() => {
    fetchActiveEvents().then(setActiveEvents);
  }, []);

  // Quest progress
  const [questProgress, setQuestProgress]   = useState<Record<string, number>>({
    warden: 0, echoes: 0, firstlight: new Date().getHours() < 9 ? 1 : 0, gatheringdark: 0,
  });

  // Derived hero stats (map from PIK stats or fallback)
  const stats = {
    power:     hero?.progression?.power     ?? hero?.attributes?.power     ?? 42,
    ward:      hero?.progression?.ward      ?? hero?.attributes?.ward      ?? 28,
    resonance: hero?.progression?.resonance ?? hero?.attributes?.resonance ?? 35,
    veilSense: (hero?.progression?.fate_level ?? 1) > 5
      ? Math.floor((hero?.progression?.fate_level ?? 1) * 0.4)
      : 3,
  };

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCountdown(midnight()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Leaflet init ──────────────────────────────────────────────────────────
  const initMap = useCallback(async (lat: number, lon: number) => {
    if (!mapRef.current || leafletRef.current) return;

    // Dynamically import Leaflet to keep bundle lean
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    // Inject keyframe animation for tear rings
    if (!document.getElementById('vt-keyframes')) {
      const style = document.createElement('style');
      style.id = 'vt-keyframes';
      style.textContent = `
        @keyframes tearRing {
          0%   { transform:scale(0.8);opacity:0.8; }
          100% { transform:scale(1.7);opacity:0; }
        }
        @keyframes vtUnstable {
          0%,100%{ opacity:1;transform:scale(1); }
          25%    { opacity:0.85;transform:scale(1.04) rotate(2deg); }
          50%    { opacity:1;transform:scale(0.97) rotate(-1deg); }
          75%    { opacity:0.9;transform:scale(1.02) rotate(1deg); }
        }
        .vt-tear-dormant { animation: vtUnstable 0.15s ease-in-out infinite !important; }
      `;
      document.head.appendChild(style);
    }

    const map = L.map(mapRef.current, {
      center: [lat, lon],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });

    // Apply filter via Leaflet's own pane reference + tile load event.
    // getPanes().tilePane is the authoritative handle; re-apply on every
    // tileload so late-loading tiles don't reset it.
    const applyTileFilter = () => {
      const tp = map.getPanes().tilePane as HTMLElement | undefined;
      if (tp) tp.style.filter = 'invert(1) hue-rotate(180deg) saturate(0.35) brightness(0.65)';
    };
    const tl = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    tl.on('tileload', applyTileFilter);
    map.on('load', applyTileFilter);
    applyTileFilter(); // also apply immediately in case pane already exists

    // Player marker
    const playerIcon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,rgba(200,160,78,0.9),rgba(200,160,78,0.3));border:2px solid rgba(200,160,78,0.9);box-shadow:0 0 16px rgba(200,160,78,0.7)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([lat, lon], { icon: playerIcon, zIndexOffset: 1000 }).addTo(map);

    // Spawn tears
    const tears = spawnTears(lat, lon) as Tear[];
    tears.forEach(t => {
      const icon = L.divIcon({
        className: '',
        html: tearMarkerHTML(t.type),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const marker = L.marker([t.lat, t.lon], { icon }).addTo(map);
      marker.on('click', () => setActiveTear({ ...t, marker }));
      t.marker = marker;
    });

    tearsRef.current = tears;
    leafletRef.current = map;
  }, []);

  // ── Location permission ────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { startDemo(); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords([lat, lon]);
        setLocationReady(true);
        initMap(lat, lon);
      },
      () => startDemo(),
      { timeout: 8000 }
    );
  }, [initMap]);

  const startDemo = useCallback(() => {
    setCoords([DEMO_LAT, DEMO_LON]);
    setLocationReady(true);
    initMap(DEMO_LAT, DEMO_LON);
  }, [initMap]);

  // ── Re-center ──────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    leafletRef.current?.panTo(coords, { animate: true, duration: 0.8 });
  }, [coords]);

  // ── Battle ─────────────────────────────────────────────────────────────────
  // ── Battle tear ref — set DIRECTLY in startBattle, never via useEffect ──────
  const battleTearRef = useRef<Tear | null>(null);

  const startBattle = useCallback((tear: Tear) => {
    // Set ref first — this is what handleBattleAction reads
    battleTearRef.current = tear;
    const td = TEAR_TYPES[tear.type];
    setEnemyMaxHp(td.hp);
    setEnemyHp(td.hp);
    setPlayerHp(100);
    setBattleLog('The Veil tears open before you.');
    setTelegraph(pickRand(TELEGRAPHS[tear.type]));
    setBattleBusy(false);
    setBattleResult(null);
    setServerResult(null);
    setActiveTear(null);
    setScreen('battle');
  }, []);

  // Fully synchronous — no async/await, no stale closure issues
  const handleBattleAction = useCallback((action: BattleAction) => {
    const tear = battleTearRef.current;
    if (!tear) return;

    // Item: heal only, no enemy counter
    if (action === 'item') {
      const heal = 20 + Math.floor(Math.random() * 10);
      setPlayerHp(hp => Math.min(100, hp + heal));
      setBattleLog(`${pickRand(BATTLE_LOGS.item)} (+${heal} HP)`);
      return;
    }

    // Player attack
    const dmg = action === 'strike'
      ? 12 + Math.floor(Math.random() * 10)
      : 20 + Math.floor(Math.random() * 15);
    setBattleLog(`${pickRand(BATTLE_LOGS[action])} (${dmg} dmg)`);

    setEnemyHp(prevHp => {
      const nextHp = Math.max(0, prevHp - dmg);

      if (nextHp <= 0) {
        // Victory — schedule state updates outside updater
        setTimeout(() => {
          if (tear.marker && leafletRef.current) leafletRef.current.removeLayer(tear.marker);
          tearsRef.current = tearsRef.current.map(t =>
            t.id === tear.id ? { ...t, sealed: true } : t
          );
          const shards = tear.type === 'minor' ? 10
            : tear.type === 'wander' ? 17
            : tear.type === 'dormant' ? 40 : 75;
          setBattleResult({ won: true, shards });
          try {
            const h = JSON.parse(localStorage.getItem('vt_battles') ?? '[]');
            h.unshift({ tear_type: tear.type, tear_name: tear.name, won: true, shards, ts: Date.now() });
            localStorage.setItem('vt_battles', JSON.stringify(h.slice(0, 20)));
          } catch {}
          postEncounter(hero?.root_id, { tear_type: tear.type, tear_name: tear.name, outcome: 'won', shards, lat: coords[0], lon: coords[1] })
            .then(r => setServerResult(r));
          if (tear.type === 'minor')   setQuestProgress(q => ({ ...q, warden: Math.min(3, q.warden + 1) }));
          if (tear.type === 'dormant') setQuestProgress(q => ({ ...q, gatheringdark: 1 }));
          setScreen('victory');
        }, 0);
        return 0;
      }

      // Enemy counter — schedule outside updater
      setTimeout(() => {
        const isDouble = tear.type === 'double';
        if (Math.random() > 0.25) {
          const eDmg = isDouble
            ? 18 + Math.floor(Math.random() * 16)
            : 8  + Math.floor(Math.random() * 12);
          setBattleLog(`${pickRand(BATTLE_LOGS.hit)} (${eDmg} dmg)`);
          setPlayerHp(php => {
            const next = Math.max(0, php - eDmg);
            if (next <= 0) {
              setBattleResult({ won: false, shards: 0 });
              setScreen('defeat');
              try {
                const h = JSON.parse(localStorage.getItem('vt_battles') ?? '[]');
                h.unshift({ tear_type: tear.type, tear_name: tear.name, won: false, shards: 0, ts: Date.now() });
                localStorage.setItem('vt_battles', JSON.stringify(h.slice(0, 20)));
              } catch {}
              postEncounter(hero?.root_id, { tear_type: tear.type, tear_name: tear.name, outcome: 'fled', shards: 0, lat: coords[0], lon: coords[1] })
                .then(r => setServerResult(r));
            }
            return next;
          });
          setDamageFlash(isDouble ? '#CC1020' : '#C84020');
          setTimeout(() => setDamageFlash(null), 350);
        } else {
          setBattleLog(pickRand(BATTLE_LOGS.miss));
        }
        setTelegraph(pickRand(TELEGRAPHS[tear.type]));
      }, 0);

      return nextHp;
    });
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const hpPct   = Math.max(0, (enemyHp / Math.max(1, enemyMaxHp)) * 100);
  const hpColor = hpPct > 60 ? '#C84020' : hpPct > 30 ? '#C8900A' : '#6030A0';

  const tearCounts = {
    minor:   tearsRef.current.filter(t => t.type === 'minor'   && !t.sealed).length,
    wander:  tearsRef.current.filter(t => t.type === 'wander'  && !t.sealed).length,
    dormant: tearsRef.current.filter(t => t.type === 'dormant' && !t.sealed).length,
    double:  tearsRef.current.filter(t => t.type === 'double'  && !t.sealed).length,
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={css.root}>

      {/* ── MAP LAYER ── */}
      <div ref={mapRef} style={css.map} />
      <div style={css.vignette} />
      <div style={css.scanlines} />

      {/* ── LOCATION PROMPT ── */}
      {!locationReady && (
        <div style={css.locPrompt}>
          <div style={css.locGlyph}>◈</div>
          <div style={css.locTitle}>The Veil Calls</div>
          <p style={css.locBody}>
            "The fractures are spreading. Your presence is required in the compromised realm."
            <br /><br />
            Allow location access to reveal nearby Veil Tears.
          </p>
          <button style={css.btnPrimary} onClick={requestLocation}>Allow Location</button>
          <button style={css.btnGhost} onClick={startDemo}>Demo Mode — Simulated Location</button>
        </div>
      )}

      {/* ── TOP HUD ── */}
      {locationReady && screen === 'map' && (
        <div style={css.topHud}>
          <div style={css.hudRow}>
            <span style={css.hudTitle}>Veil Tears</span>
            <div style={css.threatBadge}>
              <div style={css.threatDot} />
              <span style={css.threatText}>VEIL WEAKENING</span>
            </div>
          </div>
          <div style={css.statRow}>
            {[
              { val: stats.power,     label: 'Power' },
              { val: stats.ward,      label: 'Ward' },
              { val: stats.resonance, label: 'Resonance' },
              { val: stats.veilSense, label: 'Veil Sense', accent: true },
            ].map(s => (
              <div key={s.label} style={css.statPill}>
                <span style={{ ...css.statVal, color: s.accent ? '#8040C8' : 'var(--text-1)' }}>{s.val}</span>
                <span style={css.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONVERGENCE EVENT BANNER ── */}
      {locationReady && screen === 'map' && activeEvents.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(80px + env(safe-area-inset-top, 0px))', left: 12, right: 12, zIndex: 11,
          background: 'linear-gradient(135deg, rgba(128,40,200,0.22), rgba(200,100,20,0.18))',
          border: '1px solid rgba(160,96,224,0.40)',
          borderRadius: 8, padding: '7px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 14, color: '#A060E0' }}>⚡</span>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#A060E0', fontWeight: 700 }}>
              CONVERGENCE EVENT ACTIVE
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>
              {activeEvents[0].name} — ×{activeEvents[0].shard_multiplier} shards
              {activeEvents[0].cache_bonus ? ', bonus caches' : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM HUD ── */}
      {locationReady && screen === 'map' && (
        <div style={css.bottomHud}>
          {/* Tear count bar */}
          <div style={css.tearCountBar}>
            {([
              { type: 'minor',   color: '#1A6ED4', label: 'MINOR' },
              { type: 'wander',  color: '#8040C8', label: 'WANDER' },
              { type: 'dormant', color: '#E8820A', label: 'DORMANT' },
              { type: 'double',  color: '#CC1020', label: 'EVENT' },
            ] as { type: TearType; color: string; label: string }[]).map(t => (
              <div key={t.type} style={css.tearCountItem}>
                <div style={{ ...css.tearCountDot, background: t.color, boxShadow: `0 0 4px ${t.color}` }} />
                <span style={{ ...css.tearCountNum, color: t.type === 'double' ? '#CC1020' : 'var(--text-1)' }}>
                  {tearCounts[t.type]}
                </span>
                <span style={css.tearCountLbl}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Quest strip */}
          <div style={css.questStrip}>
            {DAILY_QUESTS.map(q => {
              const done = (questProgress[q.id] ?? 0) >= q.max;
              return (
                <div key={q.id} style={{ ...css.questCard, ...(done ? css.questDone : {}) }}>
                  <div style={css.questTitle}>{q.icon} {q.title}</div>
                  <div style={css.questDesc}>{q.desc}</div>
                  <div style={css.questReward}>
                    Reward: <span style={{ color: 'var(--gold)' }}>{q.reward}</span>
                    {q.max > 1 && <span style={{ color: 'var(--text-3)' }}> · {questProgress[q.id] ?? 0}/{q.max}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action row */}
          <div style={css.actionRow}>
            <div style={css.countdownBadge}>
              <span style={css.countdownLabel}>TEARS RESET</span>
              <span style={css.countdownTime}>{countdown}</span>
            </div>
            <button style={css.locateBtn} onClick={recenter} title="Re-center">◎</button>
          </div>
        </div>
      )}

      {/* ── ENCOUNTER MODAL ── */}
      {activeTear && screen === 'map' && createPortal(
        <div style={css.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setActiveTear(null); }}>
          <div style={css.encounterPanel}>
            <div style={css.dragHandle} />
            {(() => {
              const td = TEAR_TYPES[activeTear.type];
              return (
                <>
                  <div style={css.encHeader}>
                    <div style={{
                      ...css.encIcon,
                      background: td.bgColor,
                      border: `1px solid ${td.color}55`,
                      boxShadow: `0 0 16px ${td.color}33`,
                    }}>
                      <span style={{ fontSize: 24, color: td.color, textShadow: `0 0 12px ${td.color}` }}>
                        {td.glyph}
                      </span>
                    </div>
                    <div>
                      <div style={{ ...css.encType, color: td.color }}>{td.label}</div>
                      <div style={css.encName}>{activeTear.name}</div>
                      <div style={css.encLore}>{activeTear.lore}</div>
                    </div>
                  </div>

                  <div style={css.encStats}>
                    {[
                      { val: td.tier, label: 'Tier' },
                      { val: td.hp,   label: 'Enemy HP' },
                      { val: td.dur,  label: 'Duration' },
                    ].map(s => (
                      <div key={s.label} style={css.encStat}>
                        <div style={css.encStatVal}>{s.val}</div>
                        <div style={css.encStatLabel}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={css.encRewards}>
                    {td.rewards.map((r, i) => (
                      <div key={i} style={{ ...css.rewardPill, background: r.color, border: `1px solid ${r.border}` }}>
                        <span>{r.icon}</span>
                        <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
                        <span style={{ color: 'var(--gold-hi)', fontWeight: 700 }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  <div style={css.encActions}>
                    <button
                      style={css.btnPrimary}
                      onClick={() => startBattle(activeTear)}
                    >
                      Enter the Veil
                    </button>
                    <button style={css.btnClose} onClick={() => setActiveTear(null)}>✕</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── BATTLE SCREEN ── */}
      {screen === 'battle' && battleTearRef.current && createPortal(
        <div style={css.battleOverlay}>
          <div style={css.battleBg} />
          {damageFlash && <div style={{ ...css.damageFlash, background: damageFlash }} />}

          <div style={css.battleContent}>
            {/* Enemy */}
            <div style={css.enemyZone}>
              {(() => {
                const tear = battleTearRef.current!;
                const td = TEAR_TYPES[tear.type];
                return (
                  <>
                    <div style={{
                      ...css.enemySigil,
                      background: `radial-gradient(circle, ${td.color}22, transparent)`,
                      border: `1px solid ${td.color}33`,
                    }}>
                      <span style={{ fontSize: 52, color: td.color, textShadow: `0 0 24px ${td.color}, 0 0 48px ${td.color}60` }}>
                        {td.glyph}
                      </span>
                    </div>
                    <div style={css.enemyName}>{tear.name}</div>
                    <div style={css.enemyTier}>{td.tier} · {td.label}</div>
                    <div style={css.hpBarTrack}>
                      <div style={{ ...css.hpBarFill, width: `${hpPct}%`, background: `linear-gradient(90deg,${hpColor}80,${hpColor})` }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12, letterSpacing: '0.1em' }}>
                      {enemyHp} / {enemyMaxHp} HP
                    </div>
                    <div style={css.telegraph}>{telegraph}</div>
                  </>
                );
              })()}
            </div>

            {/* Player HP */}
            <div style={css.playerHpRow}>
              <span style={css.playerHpLabel}>YOUR RESOLVE</span>
              <div style={css.playerHpTrack}>
                <div style={{
                  ...css.playerHpFill,
                  width: `${playerHp}%`,
                  background: playerHp > 50 ? 'linear-gradient(90deg,#1A6ED4,#4A9EF4)' : playerHp > 25 ? 'linear-gradient(90deg,#C8900A,#E8C040)' : 'linear-gradient(90deg,#C84020,#E85030)',
                }} />
              </div>
              <span style={{ ...css.playerHpLabel, color: 'var(--text-2)' }}>{playerHp}</span>
            </div>

            {/* Log */}
            <div style={css.battleLog}>{battleLog}</div>
          </div>

          {/* Actions */}
          <div style={css.battleActions}>
            {([
              { action: 'strike'  as BattleAction, icon: '⚔', label: 'STRIKE',  sub: 'Basic Attack',      color: '#C84020' },
              { action: 'ability' as BattleAction, icon: '◈', label: 'ABILITY', sub: 'Resonance Strike',   color: '#8040C8' },
              { action: 'item'    as BattleAction, icon: '⊕', label: 'ITEM',    sub: 'Veil Shard Flask',   color: '#C8900A' },
              { action: 'retreat' as BattleAction, icon: '↩', label: 'RETREAT', sub: 'Flee Encounter',     color: '#485E7A' },
            ]).map(b => (
              <button
                key={b.action}
                onClick={() => {
                  if (b.action === 'retreat') { setScreen('map'); return; }
                  handleBattleAction(b.action);
                }}
                style={{
                  ...css.battleBtn,
                  borderColor: `${b.color}66`,
                  color: b.color,
                }}
              >
                <span style={{ fontSize: 22 }}>{b.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>{b.label}</span>
                <span style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.1em' }}>{b.sub}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── RESULT PANEL ── */}
      {(screen === 'victory' || screen === 'defeat') && battleResult && createPortal(
        <div style={css.resultPanel}>
          {screen === 'victory' ? (
            <>
              <div style={{ fontSize: 64 }}>◈</div>
              <div style={{ ...css.resultTitle, color: 'var(--gold-hi)' }}>Tear Sealed</div>
              <p style={css.resultLore}>
                "{battleTearRef.current?.name} has been driven back.<br />The Veil holds — for now."
              </p>
              <div style={css.resultRewards}>
                <div style={css.resultRewardItem}>
                  <div style={{ ...css.resultRewardVal, color: 'var(--gold)' }}>
                    +{serverResult?.shards ?? battleResult.shards}
                    {serverResult?.multiplier && (
                      <span style={{ fontSize: 9, color: '#E8B040', marginLeft: 4 }}>×{serverResult.multiplier}</span>
                    )}
                  </div>
                  <div style={css.resultRewardLabel}>VEIL SHARDS</div>
                </div>
                {serverResult?.cache_earned && (
                  <div style={{ ...css.resultRewardItem, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 22 }}>🎁</div>
                    <div style={{ ...css.resultRewardLabel, color: serverResult.cache_earned.rarity === 'epic' ? '#A855F7' : serverResult.cache_earned.rarity === 'rare' ? '#1E90FF' : serverResult.cache_earned.rarity === 'uncommon' ? '#34d399' : '#8899AA', textTransform: 'uppercase' }}>
                      {serverResult.cache_earned.rarity} cache
                    </div>
                  </div>
                )}
                {!serverResult && (
                  <div style={{ ...css.resultRewardItem, paddingLeft: 12, borderLeft: '1px solid var(--border)', opacity: 0.5 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>checking rewards…</div>
                  </div>
                )}
              </div>
              {serverResult?.quests_completed && serverResult.quests_completed.length > 0 && (
                <div style={{ margin: '8px 0 12px', padding: '10px 16px', background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.25)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: 4 }}>QUEST COMPLETE</div>
                  {serverResult.quests_completed.map(q => (
                    <div key={q.quest_id} style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic' }}>
                      ◈ {q.name}
                    </div>
                  ))}
                </div>
              )}
              {serverResult?.convergence_event && (
                <div style={{ fontSize: 9, color: '#A060E0', letterSpacing: '0.1em', marginBottom: 8, opacity: 0.8 }}>
                  ⚡ {serverResult.convergence_event} BONUS APPLIED
                </div>
              )}
              <button style={css.btnPrimary} onClick={() => setScreen('map')}>Return to the World</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, color: '#C84020' }}>✦</div>
              <div style={{ ...css.resultTitle, color: '#C84020' }}>Forced Retreat</div>
              <p style={css.resultLore}>
                "The {battleTearRef.current?.name} endures.<br />The Veil remembers your weakness."
              </p>
              <button
                style={{ ...css.btnPrimary, background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                onClick={() => setScreen('map')}
              >
                Withdraw
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    background: '#080C14',
    fontFamily: "'Cinzel', serif",
    color: 'var(--text-1)',
    overflow: 'hidden',
  },
  map: {
    position: 'absolute', inset: 0,
    zIndex: 0,
  },
  vignette: {
    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(8,12,20,0.55) 60%, rgba(8,12,20,0.93) 100%)',
  },
  scanlines: {
    position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
  },

  // Location prompt
  locPrompt: {
    position: 'absolute', inset: 0, zIndex: 90,
    background: '#080C14',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 20,
    paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(40px + var(--tab-h, 64px) + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 40, paddingRight: 40,
    textAlign: 'center',
  },
  locGlyph: { fontSize: 48, color: '#8040C8', textShadow: '0 0 30px rgba(128,64,200,0.6)' },
  locTitle: { fontFamily: "'Cinzel Decorative', serif", fontSize: 18, color: 'var(--text-1)' },
  locBody:  { fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, maxWidth: 280 },

  // Top HUD
  topHud: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
    paddingLeft: 16, paddingRight: 16, paddingBottom: 12,
    background: 'linear-gradient(to bottom, rgba(8,12,20,0.95), transparent)',
  },
  hudRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hudTitle: { fontFamily: "'Cinzel Decorative', serif", fontSize: 11, letterSpacing: '0.35em', color: '#E8A820', textShadow: '0 0 20px rgba(200,144,10,0.6)' },
  threatBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid rgba(200,64,32,0.4)', borderRadius: 20, background: 'rgba(200,64,32,0.08)' },
  threatDot: { width: 6, height: 6, borderRadius: '50%', background: '#C84020', animation: 'vtBlink 1.2s ease-in-out infinite' } as React.CSSProperties,
  threatText: { fontSize: 8, letterSpacing: '0.15em', color: '#C84020', fontWeight: 700 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 },
  statPill: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', background: 'rgba(15,21,32,0.85)', border: '1px solid var(--border)', borderRadius: 8, backdropFilter: 'blur(8px)' },
  statVal: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1, marginBottom: 3 },
  statLabel: { fontSize: 7, letterSpacing: '0.15em', color: 'var(--text-3)', textTransform: 'uppercase' },

  // Bottom HUD
  bottomHud: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 12, paddingLeft: 16, paddingRight: 16,
    paddingBottom: 'calc(16px + var(--tab-h, 64px) + env(safe-area-inset-bottom, 0px))',
    background: 'linear-gradient(to top, rgba(8,12,20,0.98) 70%, transparent)',
  },
  tearCountBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 10 },
  tearCountItem: { display: 'flex', alignItems: 'center', gap: 5 },
  tearCountDot: { width: 8, height: 8, borderRadius: '50%' },
  tearCountNum: { fontSize: 12, fontWeight: 700 },
  tearCountLbl: { fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.1em' },
  questStrip: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' },
  questCard: { flexShrink: 0, width: 160, padding: '10px 12px', background: 'rgba(15,21,32,0.9)', border: '1px solid var(--border)', borderRadius: 10, backdropFilter: 'blur(8px)', cursor: 'pointer' },
  questDone: { opacity: 0.6, borderColor: 'rgba(80,140,80,0.4)', background: 'rgba(60,100,60,0.08)' },
  questTitle: { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 },
  questDesc: { fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 10, color: 'var(--text-2)', lineHeight: 1.4, marginBottom: 6 },
  questReward: { fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.08em' },
  actionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  countdownBadge: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(15,21,32,0.9)', border: '1px solid var(--border)', borderRadius: 20 },
  countdownLabel: { fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.12em' },
  countdownTime: { fontSize: 13, color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 700 },
  locateBtn: { width: 44, height: 44, borderRadius: '50%', background: 'rgba(15,21,32,0.9)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', fontSize: 18 },

  // Encounter modal
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  encounterPanel: { width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: '24px 24px 0 0', paddingTop: 24, paddingLeft: 20, paddingRight: 20, paddingBottom: 'calc(32px + var(--tab-h, 64px) + env(safe-area-inset-bottom, 0px))' },
  dragHandle: { width: 36, height: 3, borderRadius: 2, background: 'var(--border-hi)', margin: '0 auto 20px' },
  encHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  encIcon: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  encType: { fontSize: 8, letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 },
  encName: { fontFamily: "'Cinzel Decorative', serif", fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, lineHeight: 1.2 },
  encLore: { fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 },
  encStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 },
  encStat: { background: '#080C14', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' },
  encStatVal: { fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 },
  encStatLabel: { fontSize: 7, color: 'var(--text-3)', letterSpacing: '0.15em' },
  encRewards: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  rewardPill: { padding: '6px 12px', borderRadius: 20, fontSize: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 },
  encActions: { display: 'flex', gap: 10 },
  btnClose: { width: 52, padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 },

  // Battle
  battleOverlay: { position: 'fixed', inset: 0, zIndex: 200, background: '#080C14', display: 'flex', flexDirection: 'column' },
  battleBg: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(96,48,160,0.15) 0%, transparent 70%)' },
  damageFlash: { position: 'fixed', inset: 0, zIndex: 210, pointerEvents: 'none', opacity: 0.35 } as React.CSSProperties,
  battleContent: { position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 'calc(48px + env(safe-area-inset-top, 0px))', paddingLeft: 20, paddingRight: 20, paddingBottom: 0 },
  enemyZone: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  enemySigil: { width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  enemyName: { fontFamily: "'Cinzel Decorative', serif", fontSize: 16, color: 'var(--text-1)', marginBottom: 4, textAlign: 'center' },
  enemyTier: { fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-3)', marginBottom: 12 },
  hpBarTrack: { width: '100%', maxWidth: 280, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  hpBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  telegraph: { padding: '8px 16px', borderRadius: 20, fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 11, color: 'var(--text-2)', textAlign: 'center', maxWidth: 280, background: 'rgba(200,64,32,0.08)', border: '1px solid rgba(200,64,32,0.2)' },
  playerHpRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  playerHpLabel: { fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-3)', whiteSpace: 'nowrap' },
  playerHpTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  playerHpFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  battleLog: { fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 12, color: 'var(--text-2)', textAlign: 'center', padding: '8px 20px 12px', minHeight: 36 },
  battleActions: { paddingTop: 12, paddingLeft: 20, paddingRight: 20, paddingBottom: 'calc(36px + env(safe-area-inset-bottom, 0px))', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  battleBtn: { padding: '14px 10px', borderRadius: 12, border: '1px solid', background: 'transparent', cursor: 'pointer', fontFamily: "'Cinzel', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s' },

  // Result
  resultPanel: { position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,20,0.95)', backdropFilter: 'blur(6px)', flexDirection: 'column', gap: 16, paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))', paddingLeft: 40, paddingRight: 40, textAlign: 'center', overflowY: 'auto' },
  resultTitle: { fontFamily: "'Cinzel Decorative', serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.1em' },
  resultLore: { fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300 },
  resultRewards: { display: 'flex', gap: 12, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 14 },
  resultRewardItem: { textAlign: 'center' },
  resultRewardVal: { fontSize: 20, fontWeight: 700 },
  resultRewardLabel: { fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.12em', marginTop: 2 },

  // Shared buttons
  btnPrimary: { padding: '16px 32px', borderRadius: 12, border: 'none', background: 'var(--gold)', color: '#080C14', fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', width: '100%', maxWidth: 280 },
  btnGhost: { padding: '12px 30px', borderRadius: 12, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' },
};

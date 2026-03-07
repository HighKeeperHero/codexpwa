# Codex PWA — Heroes' Veritas

The official record of your heroic journey. A mobile-first PWA deployable to Vercel in minutes.

## Local Development

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

## Deploy to Vercel (5 minutes)

**Option A — Vercel CLI (fastest):**
```bash
npm install -g vercel
vercel login
vercel --prod
```
That's it. Vercel auto-detects Vite. Your app is live at a `*.vercel.app` URL.

**Option B — Vercel Dashboard:**
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import the repo
3. Framework: Vite (auto-detected)
4. Click Deploy

## Install as iPhone App (PWA)

1. Open your Vercel URL in **Safari** on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

The app icon appears on your home screen and opens full-screen, indistinguishable from a native app.

## Project Structure

```
src/
├── api/pik.ts              # PIK API client + mappers + mock data
├── AuthContext.tsx         # Hero session (localStorage)
├── utils/questEngine.ts   # Dynamic quest generation from progression
├── screens/
│   ├── LoginScreen.tsx     # Hero selection
│   ├── HomeScreen.tsx      # Identity card + XP + chronicle
│   ├── QuestsScreen.tsx    # Quest board with filter + expand
│   ├── LeaderboardScreen.tsx # Live rankings
│   └── ProfileScreen.tsx   # Titles, relics, venues, wristband
├── App.tsx                 # Shell + tab navigation
├── index.css               # Design tokens + global styles
└── main.tsx                # Entry point
```

## Design System

All tokens live in `index.css` as CSS variables:
- `--gold` `--ember` `--sapphire` — primary accent colors
- `--bg` `--surface` `--border` — surface hierarchy
- `--text-primary` `--text-secondary` `--text-dim` — type hierarchy
- Cinzel serif for ceremonial text, system sans for UI

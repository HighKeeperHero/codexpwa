# CodexPWA — Deprecated

This repository is retired as of **May 2026**.

The web client that lived here was the original Heroes Veritas POC.
It proved the core loop — Awakening, Veil Tears via Mapbox GPS,
Convergence events, battle, caches — and is preserved here as a
legacy artifact.

The active product is the iOS native app:
- **Repo**: [heroes-veritas-native](https://github.com/HighKeeperHero/heroes-veritas-native)
- **Distribution**: TestFlight (request access at `developer@heroesveritas.com`)
- **App Store**: coming soon

## What this repo serves now

A single static landing page (`index.html`) directing visitors to
TestFlight access. Hosted on Vercel under the same domain that
previously served the web app.

## Recovering the legacy source

The full pre-retirement state is preserved at:

- **Tag**: `archive/codexpwa-v0`
- **Branch**: `archive/codexpwa-v0`

To inspect or fork:

```bash
git checkout archive/codexpwa-v0
# or
git checkout -b legacy-work archive/codexpwa-v0
```

Last commit before retirement: `Sprint 25 feat hotfix 8` (`e3565d1`).
The web client used React 18 + Vite, with Mapbox GL for the Veil
Tears map and a Vercel serverless `/api/lore` endpoint.

## Backend

The pik-prd backend that the web client used is still the active
backend for the iOS app. See:
[pik-prd](https://github.com/HighKeeperHero/pik-prd).

The web-specific endpoints (`/api/veil/encounter`, `/api/users/:id/awakening`,
etc.) remain wired and will be retired in a separate sweep as the
iOS app stops needing them.

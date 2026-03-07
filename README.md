# Codex — Sprint 5: Splash · Landing · Registration · Alignment

## Files in this sprint

### NEW files (create these)
- src/screens/SplashScreen.tsx    — Cinematic CSS splash, auto-advances at 3.5s, tap-to-skip
- src/screens/LandingScreen.tsx   — "New to the Codex" vs "I Have a Fate ID" landing
- src/screens/RegisterScreen.tsx  — Hero name enrollment: uniqueness check + POST /api/users/enroll
- src/screens/AlignmentModal.tsx  — ORDER / CHAOS / LIGHT / DARK pledge modal

### REPLACE files (overwrite these)
- src/App.tsx                     — New routing: splash → landing → register/login → dashboard
- src/AuthContext.tsx              — Alignment localStorage, signIn accepts new registrants
- src/screens/LoginScreen.tsx     — Added onBack prop for back-navigation from landing
- src/screens/QuestsScreen.tsx    — Full alignment-gated hunt system (4 hunts × 4 alignments)

### UNTOUCHED (keep your sprint 4 versions)
- src/index.css                   — DO NOT REPLACE
- src/main.tsx                    — DO NOT REPLACE
- src/api/pik.ts                  — DO NOT REPLACE (sprint 4 version still used)
- src/screens/HomeScreen.tsx      — DO NOT REPLACE
- src/screens/ProfileScreen.tsx   — DO NOT REPLACE
- src/screens/LeaderboardScreen.tsx — DO NOT REPLACE

## Deploy
git add .
git commit -m "Sprint 5: splash, landing, registration, alignment system"
git push

## Alignment note
PUT /api/users/:root_id/profile requires SessionGuard in PIK-PRD.
Alignment is stored in localStorage keyed as:  codex_alignment_<root_id>
It reads PIK-stored alignment first; falls back to local.
When you implement passkey sessions, wire setAlignment() to also PATCH the backend.

## New user flow
POST /api/users/enroll  —  no auth required
Body: { hero_name, fate_alignment: "", enrolled_by: "self:codex-pwa" }
Response: { status: "ok", data: { root_id, persona_id, hero_name, ... } }

## Alignment unlock
Triggers automatically on HomeScreen mount when:
  - fate_level >= 20
  - No alignment in PIK-PRD (NONE / empty)
  - No alignment in localStorage
Will re-prompt on next login until confirmed.

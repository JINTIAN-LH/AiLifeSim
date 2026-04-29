# Commit Log

## 2026-04-21  Initial project bootstrap and frontend redesign
- Branch: master
- Type: feat
- Summary:
  - Initialize repository and connect remote origin.
  - Add backend and frontend MVP structure for AI Life Sim.
  - Implement full frontend UI redesign with responsive layout and unified visual system.
  - Add skill configuration standard in `skills.md`.
- Verification:
  - Frontend build passed (`npm run build`).
- Notes:
  - First project commit and remote push.

## 2026-04-21  Rewrite history to remove large dependency traces
- Branch: master
- Type: chore
- Summary:
  - Rewrite repository history into a single clean root commit.
  - Remove previously tracked dependency artifacts from history (node_modules and generated build outputs).
  - Force-push rewritten history to origin/master.
- Verification:
  - `git count-objects -vH` shows reduced object footprint.
  - `git ls-files | findstr /I "node_modules"` returns no tracked dependency files.
- Notes:
  - A local backup branch is created before rewrite.

## 2026-04-29  Stabilize API fallback and CORS for degraded mode
- Branch: master
- Type: fix
- Summary:
  - Harden backend CORS handling to better support browser cross-origin requests.
  - Improve frontend backend health-check with timed recheck and cleaner offline fallback behavior.
  - Preserve local game engine fallback while preventing one-time failure from locking permanent offline mode.
- Verification:
  - Frontend build passed (`npm --prefix frontend run build`).
  - Backend app bootstrap check passed (`node -e "require('./backend/app'); console.log('backend app load ok')"`).
- Notes:
  - Local runtime DB file changed during verification and is intentionally excluded from this commit.

## 2026-04-29  Fix false offline fallback on business errors
- Branch: master
- Type: fix
- Summary:
  - Update frontend API fallback logic to treat 4xx as business errors instead of backend outage.
  - Keep backend connectivity status online for 4xx responses, and only switch offline on network/no-response/5xx errors.
  - Return 404 (instead of 400) for `GET /api/character/status` when character does not exist.
- Verification:
  - Workspace check passed (`npm run check`).
- Notes:
  - Local runtime DB file changed during verification and is intentionally excluded from this commit.

## 2026-04-29  Fix resolve-event 400 and option undefined crash
- Branch: master
- Type: fix
- Summary:
  - Pass event context from timeline UI when resolving events to support custom events not present in static backend pools.
  - Update backend `POST /api/life/resolve-event` to resolve custom/generated events from request payload when static lookup misses.
  - Add frontend guards to prevent dereferencing undefined event options after failed resolve requests.
- Verification:
  - Frontend build passed (`npm --prefix frontend run build`).
  - Backend app bootstrap check passed (`node -e "require('./backend/app'); console.log('backend app load ok')"`).
- Notes:
  - Local runtime DB file changed during verification and is intentionally excluded from this commit.

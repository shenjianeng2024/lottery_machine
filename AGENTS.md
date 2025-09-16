# Repository Guidelines

## Project Structure & Module Organization
- `src/` — React + TypeScript app (components, pages, hooks, context, lib, utils, types). Entry: `src/main.tsx`, root app: `src/App.tsx`.
- `src-tauri/` — Tauri (Rust) backend. Config: `src-tauri/tauri.conf.json`, crate: `src-tauri/Cargo.toml`, Rust code in `src-tauri/src/`.
- `e2e/` — Playwright end-to-end tests. Config: `e2e/playwright.config.ts`, specs under `e2e/tests`.
- `public/` — Static assets. `dist/` — Vite build output (Tauri consumes `../dist`).
- `scripts/` — Utility scripts (e.g., `scripts/test-build.sh`).

## Build, Test, and Development Commands
- Dev (web): `pnpm dev` — Vite dev server.
- Dev (desktop): `pnpm tauri:dev` — Runs Tauri app (spawns frontend via `pnpm dev`).
- Build (web): `pnpm build` — Type-check then Vite build to `dist/`.
- Build (desktop): `pnpm tauri:build` — Bundle Tauri app (uses `dist/`).
- Lint: `pnpm lint` — ESLint across repo.
- Unit tests: `pnpm test` (watch), `pnpm test:run` (CI), coverage: `pnpm coverage`.
- E2E tests: `pnpm test:e2e` — Playwright (starts dev server per config). Debug: `pnpm test:e2e:debug`.
- Full check: `bash scripts/test-build.sh` — clean, lint, type-check, test, build.

## Coding Style & Naming Conventions
- TypeScript + React, 2-space indentation. Prefer functional components and hooks.
- ESLint config at `eslint.config.js`; fix issues before PRs.
- Imports: use alias `@/...` for `src` (see `vitest.config.ts` and `tsconfig*`).
- Filenames: components `PascalCase.tsx` (e.g., `components/lottery/LotteryMachine.tsx`), utilities/hooks `camelCase.ts` (e.g., `hooks/useLotteryHistory.ts`).
- Styling: Tailwind CSS classes inline; keep utility classes readable and grouped by purpose.

## Testing Guidelines
- Unit/integration: Vitest (`jsdom`) + Testing Library. Place specs as `*.test.ts[x]` under `src/**/__tests__`, `src/test/**`, or alongside modules.
- Coverage: generated via V8; keep critical logic (`src/lib/**`, reducers, hooks) covered.
- E2E: Playwright config uses base URL `http://localhost:1420` and starts a dev server. Ensure no port conflicts.

## Commit & Pull Request Guidelines
- Commits: reference issues in the subject (e.g., `Issue #7: React Context状态管理实现完成`). Keep messages imperative and scoped.
- PRs must include: clear description, linked issues, screenshots/GIFs for UI, test plan/steps, and pass lint + tests.
- Small, focused PRs are preferred. Update relevant docs when behavior changes.

## Security & Configuration Tips
- Tauri FS plugin scopes are restricted in `tauri.conf.json`; avoid broadening without review.
- Do not store secrets in the frontend. Follow the CSP defined in `tauri.conf.json`.

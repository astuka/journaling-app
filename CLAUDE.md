# CLAUDE.md — JBR Software House Style

This file tells AI coding agents (Claude Code, Copilot, etc.) how we build software at JBR.

## Philosophy

We build **local-first desktop apps** sold as one-time purchases. No SaaS, no servers, no subscriptions. The user owns their data and their software. Every product should be buildable in roughly one week and shippable immediately.

If an idea requires a server, kill it or redesign it as local-first.

## Architecture Defaults

| Layer | Default | Notes |
|---|---|---|
| Framework | **Tauri** (preferred) or Electron | Tauri for smaller bundle size; Electron if speed of development matters more |
| Frontend | **React + TypeScript** | Always TypeScript, never plain JS |
| Styling | **Tailwind CSS** | Utility-first, no custom CSS frameworks |
| Local storage | **SQLite** (better-sqlite3 / Tauri built-in) | JSON files only if data is trivial |
| State management | **Zustand** or React Context | No Redux |
| Packaging | **Tauri bundler** or electron-builder | Target: .exe (Windows), .dmg (Mac), .zip (Linux) |
| Testing | **Vitest** for unit tests, **Playwright** for E2E | Tests are encouraged but don't block shipping 1.0 |

Deviate only with good reason. Document deviations in the README.

## AI Features (BYOK)

If the app has AI-powered features:
- **BYOK (Bring Your Own Key)** — the user provides their own API key (OpenAI, Anthropic, etc.)
- **No proxy, no billing, no server** — API calls go directly from the user's machine to the provider
- Store the API key locally (encrypted if possible, never transmitted)
- AI features should be optional — the app must be fully functional without them
- Clearly label which features require an API key in the UI

## Code Style

- **TypeScript strict mode** — `strict: true` in tsconfig
- **Functional components** — no class components in React
- **Named exports** over default exports
- **Small files** — if a file exceeds ~200 lines, split it
- **Descriptive names** — `calculateGlobalRanking()` not `calc()`, `FundExplorer.tsx` not `Page2.tsx`
- **No `any` types** — if you're tempted to use `any`, define an interface instead
- **Comments for "why", not "what"** — the code shows what; comments explain non-obvious decisions

## File Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── lib/            # Business logic, utilities, database
├── types/          # TypeScript interfaces and types
├── assets/         # Icons, images, static files
└── main.tsx        # Entry point
```

## Data Principles

- **All data stays local.** No telemetry, no analytics, no phone-home.
- **Import/export everything.** Users should be able to get their data in and out easily (CSV, JSON, etc.)
- **Respect existing files.** If the app reads user files (images, documents, etc.), never modify or delete them without explicit user action.
- **SQLite migrations.** Use a version table and migration scripts so the DB schema can evolve across updates.

## Shipping

- **1.0 means "it works."** Not "it's perfect." Ship when core functionality is solid and there are no crash bugs.
- **README with screenshots.** Every repo needs a README that shows what the app looks like and does.
- **Changelog.** Maintain a CHANGELOG.md from day one.
- **No CI/CD for 1.0.** Build locally, test locally, ship manually. Automate later if the product proves itself.

## What NOT to Build

- ❌ User accounts or authentication systems
- ❌ Server infrastructure (databases, APIs, hosting)
- ❌ Subscription billing or payment processing (Gumroad handles this)
- ❌ Cloud sync (local-first means local)
- ❌ Electron auto-updater for 1.0 (manual updates via new Gumroad download)
- ❌ Complex onboarding flows (the app should be self-explanatory)

## When You're Blocked on a Human

If a task requires human action — asset creation, marketing, purchasing, level design, manual testing, app store submissions, or anything you can't do from the codebase — **don't block on it.** Instead:

1. Create a markdown file in `needs-human/` at the repo root.
2. Name it descriptively: `needs-human/create-macos-build.md`, `needs-human/upload-store-screenshots.md`.
3. In the file, explain what's needed, why, and any relevant context. Keep it short.
4. Move on to the next thing you *can* do.

A separate process will pick these up, file them to the human's task board, and delete them from the repo. Don't worry about cleanup.

## Context

This app is part of the JBR software portfolio. Products are sold on Gumroad (software) or Itch.io (games) as one-time purchases at $10-25. Marketing is handled separately — the codebase just needs to be a solid product.

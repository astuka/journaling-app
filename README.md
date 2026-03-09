# Reflections - Daily Journaling

A local-first desktop journaling app built with Tauri, React, and SQLite. All your data stays on your machine.

Based on the daily notes feature from Aries — create daily reflections from journal prompts, then visualize your entries on an interactive canvas.

## Features

- **Daily Journal** — Answer 10 random questions from your personal question bank each day
- **Question Bank** — Build a collection of reflection prompts
- **Reflection Canvas** — Visualize journal entries as draggable cards, create connections, add annotations
- **Import/Export** — Back up and restore your data via JSON files
- **Fully Local** — SQLite database, no servers, no accounts, no telemetry

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Tauri v2 |
| Frontend | React 19 + TypeScript |
| Styling | Custom CSS (dark theme) |
| Database | SQLite (via rusqlite) |
| Build | Vite |

## Development

### Prerequisites

- Node.js 18+
- Rust toolchain (rustup)
- System dependencies for Tauri ([see Tauri docs](https://v2.tauri.app/start/prerequisites/))

### Setup

```bash
npm install
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
```

Produces platform-specific installers in `src-tauri/target/release/bundle/`.

## Data Storage

All data is stored in a local SQLite database at:
- **Linux:** `~/.local/share/Reflections/reflections.db`
- **macOS:** `~/Library/Application Support/Reflections/reflections.db`
- **Windows:** `%LOCALAPPDATA%\Reflections\reflections.db`

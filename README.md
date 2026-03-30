# WorkPulse (拾光)

A lightweight desktop app that captures your daily work in seconds — log what you did, track tasks on a kanban board, and generate AI-powered reports.

Built for individual contributors who want a frictionless way to remember what they accomplished each day.

## Features

**Work Log** — Type what you just did, press Enter. That's it. Supports `#tag` for auto-categorization, full-text search, and CSV/Markdown export.

**Kanban Board** — Drag tasks between Todo → In Progress → Done. Includes a draft box for "maybe later" ideas, due date tracking, and inline editing. Completing a task auto-generates a work log entry.

**AI Reports** — Select a date range, get a structured summary of your work. Powered by Claude API. Supports weekly/monthly/quarterly reports with history.

**Statistics** — 14-day activity bar chart, GitHub-style heat map, streak counter, and task completion metrics.

**Quick Capture** — Global shortcuts (`Ctrl+Shift+L` for logs, `Ctrl+Shift+T` for tasks) let you record without switching windows. Also accessible from the menu bar tray icon.

**Dark Mode** — System, light, or dark theme with full UI coverage.

## Tech Stack

- **Electron** + **React** + **TypeScript**
- **Vite** via electron-vite for fast builds
- **SQLite** (better-sqlite3) for local-first data storage
- **Zustand** for state management
- **@dnd-kit** for drag-and-drop
- **Tailwind CSS** for styling

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist:mac    # macOS (DMG + ZIP, x64 + arm64)
npm run dist:win    # Windows (NSIS installer)
npm run dist:linux  # Linux (AppImage)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘1` / `Ctrl+1` | Switch to Work Log |
| `⌘2` / `Ctrl+2` | Switch to Kanban |
| `⌘3` / `Ctrl+3` | Switch to Reports |
| `⌘4` / `Ctrl+4` | Switch to Stats |
| `⌘,` / `Ctrl+,` | Settings |
| `Ctrl+Shift+L` | Quick log (global) |
| `Ctrl+Shift+T` | Quick task (global) |

## Data

All data is stored locally in SQLite at your system's app data directory. Automatic daily backups are created. No cloud, no account, no telemetry.

## License

MIT

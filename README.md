# OC Config

OC Config is a standalone desktop settings app for OpenCode and Oh-My-OpenAgent. It combines a Next.js interface with a Tauri shell so you can inspect, edit, back up, and restore local configuration files without editing JSON by hand.

## Features

- Edit `opencode.json` from a structured form generated from the config schema.
- Edit `oh-my-openagent.json` and manage Oh-My-OpenAgent presets.
- Create and restore `.backup` files next to the active config.
- Load remote JSON schemas referenced by `$schema` and validate edited values in the UI.
- Discover OpenCode models from a running `opencode serve` process, or start one automatically on port `4096`.
- Build as a static Next.js frontend packaged by Tauri 2.

## Configuration files

OC Config looks for configuration files in the standard OpenCode config directory:

- macOS/Linux: `~/.config/opencode/`
- Windows: `%APPDATA%\\opencode\\`

Expected files:

- `opencode.json`
- `oh-my-openagent.json`

Oh-My-OpenAgent presets are stored beside `oh-my-openagent.json` with the suffix `.oh-my-openagent.json`. The app excludes `_original.oh-my-openagent.json` and the active config file from the preset list.

## Requirements

- Node.js with npm
- Rust toolchain for Tauri builds
- OpenCode CLI available as `opencode` when using model discovery

## Development

Install dependencies:

```bash
npm install
```

Run the Next.js development server only:

```bash
npm run dev
```

Run the desktop app in development mode:

```bash
npm run tauri:dev
```

The frontend development server runs on port `3101`.

## Build

Build the static frontend:

```bash
npm run build
```

Build the Tauri desktop bundle:

```bash
npm run tauri:build
```

Build a macOS DMG:

```bash
npm run tauri:build:dmg
```

Open the built macOS app:

```bash
npm run tauri:open
```

Run a new instance of the built macOS app:

```bash
npm run tauri:run
```

## Quality checks

Run TypeScript checking:

```bash
npm run typecheck
```

## Project structure

```text
src/app/                         Next.js routes
src/components/                  React UI components
src/components/settings/         OpenCode and Oh-My-OpenAgent settings screens
src/lib/                         API client, schema helpers, shared types
src/server/                      Config file helpers used by server-side code
src-tauri/                       Tauri 2 desktop shell and Rust commands
scripts/copy-next-assets.mjs     Post-build asset copy step
```

## Notes

- Production frontend output is static (`next export` style via `output: "export"`) and is copied to `out/` for Tauri packaging.
- The Tauri backend reads and writes local config files directly, so changes affect the real files in your OpenCode config directory.
- Backups are written as `<config-file>.backup` next to the original file.

# OC Config

OC Config is a standalone desktop settings app for OpenCode and Oh-My-OpenAgent. It combines a Next.js interface with a Tauri shell so you can inspect, edit, back up, and restore local configuration files without editing JSON by hand.

## Features

- Edit `opencode.json` from a structured form generated from the config schema.
- Edit `oh-my-openagent.json` and manage Oh-My-OpenAgent presets.
- Create and restore `.backup` files next to the active config.
- Load remote JSON schemas referenced by `$schema` and validate edited values in the UI.
- Discover OpenCode models via the `opencode models` CLI command without starting `opencode serve`.
- Build as a static Next.js frontend packaged by Tauri 2.

## Distribution model

This project does **not** publish official signed macOS binaries. Instead, users build the `.app` or `.dmg` locally from source.

Why:

- Local builds do not require sharing Apple Developer certificates or notarization credentials.
- Users can inspect the source and create their own app bundle.
- The build scripts use `--no-sign`, so no private signing identity is needed.

If you want to distribute a public binary yourself, you can sign/notarize your own build with your own Apple Developer account after building.

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

For macOS universal builds, install both Rust targets:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

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

## Build locally

Build the static frontend only:

```bash
npm run build
```

Build the default unsigned Tauri bundle:

```bash
npm run tauri:build
```

Build an unsigned macOS `.app` locally:

```bash
npm run tauri:build:app
```

Build an unsigned macOS `.dmg` locally:

```bash
npm run tauri:build:dmg
```

Build both unsigned `.app` and `.dmg` locally:

```bash
npm run tauri:build:mac
```

Build a universal unsigned macOS `.app` and `.dmg` for Apple Silicon + Intel:

```bash
npm run tauri:build:mac:universal
```

Outputs are written under:

```text
src-tauri/target/release/bundle/
```

Useful paths on macOS:

```text
src-tauri/target/release/bundle/macos/OC Config.app
src-tauri/target/release/bundle/dmg/*.dmg
```

Open the built macOS app:

```bash
npm run tauri:open
```

Run a new instance of the built macOS app:

```bash
npm run tauri:run
```

### macOS Gatekeeper note

The local build scripts intentionally skip signing with `--no-sign`. An app built on your own machine should run locally. If you copy the unsigned app/DMG to another Mac, macOS may warn because it is not notarized by Apple.

For public distribution to other users, sign and notarize your own build with your own Apple Developer account.

## Quality checks

Run TypeScript checking:

```bash
npm run typecheck
```

Run Rust checking:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
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

- Production frontend output uses Next.js static export mode (`output: "export"`) and is copied to `out/` for Tauri packaging.
- The Tauri backend reads and writes local config files directly, so changes affect the real files in your OpenCode config directory.
- Backups are written as `<config-file>.backup` next to the original file.
- Apple signing secrets and local env files are ignored by git.

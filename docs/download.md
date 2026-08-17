# ⬇️ Download

**English** | [简体中文](/zh/download)

Installers for **macOS / Windows / Linux** are published on GitHub Releases:

> ### 👉 [Latest release — github.com/leochan007/cc-mode-switcher/releases/latest](https://github.com/leochan007/cc-mode-switcher/releases/latest)

A release goes public only after **all three** OS builds have uploaded successfully, so every published release always contains the complete artifact set.

## Pick your file

| OS | File | Notes |
| --- | --- | --- |
| macOS (Apple Silicon) | `.dmg` | arm64 build — M1/M2/M3/M4 Macs. macOS 12+ |
| Windows 10/11 | `.exe` | NSIS installer (64-bit) |
| Linux | `.AppImage` | x86-64, runs in place — no install |

Older versions: browse [all releases](https://github.com/leochan007/cc-mode-switcher/releases).

## Install notes

### macOS

1. Open the `.dmg` and drag **CC Mode Switcher** into `Applications`.
2. The app is **not code-signed** (no Apple Developer certificate), so Gatekeeper
   blocks the first launch: **right-click the app → Open → Open** (once —
   macOS remembers the choice afterwards).

### Windows

1. Run the `.exe` and follow the NSIS wizard.
2. Unsigned apps trip SmartScreen on first run: **More info → Run anyway**.

### Linux

```bash
chmod +x 'CC Mode Switcher-*.AppImage'
./'CC Mode Switcher-*.AppImage'
```

If it fails to start, install `libfuse2` (required by AppImage): `sudo apt install libfuse2`.

## What works where

The full UI — model management, mode binding, settings — works on every OS.
**"Open in Terminal" is macOS-only** for now (it drives Terminal.app / iTerm via
AppleScript and `.command` files).

---

New here? Continue to [01 · Quick Start](guide/01-getting-started.md) — first-time
setup in five steps.

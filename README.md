<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Voxel Logo" width="120" />
</p>

<h1 align="center">Voxel</h1>

<p align="center">
  <strong>The Silent Conductor for your desktop.</strong><br/>
  Ultra-fast AI-powered dictation — speak anywhere, type nothing.
</p>

<p align="center">
  <a href="https://github.com/venkatkagi/voxel/releases">
    <img src="https://img.shields.io/badge/Download-Windows%20Installer-blue?style=for-the-badge&logo=windows" alt="Download for Windows" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/venkatkagi/voxel?style=flat-square&label=version" alt="Version" />
  <img src="https://img.shields.io/github/license/venkatkagi/voxel?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/built%20with-Tauri%20%2B%20React-orange?style=flat-square" alt="Built with Tauri + React" />
</p>

---

## Download (Windows)

> **Grab the installer and start dictating in under 60 seconds.**

1. Go to the [**Releases Page**](https://github.com/venkatkagi/voxel/releases)
2. Download **`Voxel_0.1.0_x64-setup.exe`**
3. Run the installer — no dependencies needed
4. Launch Voxel, set your API key, hold your hotkey, and dictate

---

## Build from Source (macOS / Linux / Windows)

If you're on **macOS or Linux** (or prefer building yourself), clone and build:

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Rust** | stable | [rustup.rs](https://rustup.rs) |
| **Tauri CLI** | 2.x | `cargo install tauri-cli --version "^2"` |

> **Linux only:** You also need system deps — see the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux).

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/venkatkagi/voxel.git
cd voxel

# 2. Install frontend dependencies
npm install

# 3. Run in development mode
npm run tauri dev

# 4. OR build a production installer for your platform
npm run tauri build
```

The built installer will appear in:

| Platform | Output Path |
|----------|-------------|
| Windows | `src-tauri/target/release/bundle/nsis/Voxel_x.x.x_x64-setup.exe` |
| macOS | `src-tauri/target/release/bundle/dmg/Voxel_x.x.x_x64.dmg` |
| Linux | `src-tauri/target/release/bundle/appimage/Voxel_x.x.x_amd64.AppImage` |

---

## Release Automation

To trigger a new official release:

1. Update the version in `package.json` and `src-tauri/tauri.conf.json`.
2. Commit and push your changes.
3. Push a new tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
The GitHub Action will automatically build the installer and create a draft release for you.


---

## What is Voxel?

Voxel is a premium, minimal dictation app that lives in your system tray. Hold a global hotkey, speak, and your words get transcribed and polished by AI — then pasted into whatever app you're using.

### Features

- **Global Dictation** — Hold your custom hotkey to dictate into any app on your OS
- **AI-Powered Polishing** — Automatically cleans up stutters, fillers, and grammar (professional, casual, or formal tone)
- **Multi-Provider** — Works with Groq (Whisper), Deepgram, AssemblyAI, Gemini, and Anthropic
- **Microphone Selection** — Pick your input device from settings
- **Productivity Dashboard** — Track words dictated, time saved, and streaks
- **Privacy First** — Local SQLite database, no cloud storage of your recordings

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · Vite · Tailwind CSS v4 · Framer Motion |
| Backend | Rust (Tauri v2) |
| Audio | CPAL (capture) · Hound (WAV encoding) |
| State | Zustand |
| Database | SQLite via tauri-plugin-sql |

---

## Project Structure

```
voxel/
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand state management
│   └── lib/              # Utilities
├── src-tauri/            # Rust backend (Tauri)
│   ├── src/              # Rust source code
│   ├── icons/            # App icons (all platforms)
│   ├── capabilities/     # Tauri permissions
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Static assets
├── index.html            # Entry point
├── package.json          # Node dependencies
└── vite.config.ts        # Vite configuration
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Push and open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

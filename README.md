# video-to-wiki

CLI tool that ingests YouTube and Instagram videos into an [Obsidian](https://obsidian.md)-compatible knowledge vault. Drop links into your inbox, run the tool, and get structured JSON sources with metadata and transcripts ready for AI processing.

## How it works

1. Add video URLs to `$VAULT_PATH/Inbox/links.md` (one per line)
2. Run the CLI — it reads the links, fetches metadata + transcripts, and saves structured JSON to `Sources/raw/`
3. Already-ingested URLs are skipped automatically (deduplication via SHA1 hash)
4. Instagram links trigger an automatic browser auth flow if cookies aren't present yet

## Prerequisites

| Tool                                                        | Install                           |
| ----------------------------------------------------------- | --------------------------------- |
| Node.js ≥ 18                                                | [nodejs.org](https://nodejs.org)  |
| Python ≥ 3.9                                                | [python.org](https://python.org)  |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)                  | `brew install yt-dlp`             |
| [ffmpeg](https://ffmpeg.org)                                | `brew install ffmpeg`             |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | `pip install faster-whisper`      |
| Playwright Chromium                                         | `npx playwright install chromium` |

> **Note:** yt-dlp and faster-whisper are only required for Instagram ingestion. YouTube videos use the native transcript API and only fall back to Whisper when no captions are available.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd video-to-wiki
npm install
```

### 2. Configure your vault

Copy the example env file and set your vault path:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VAULT_PATH=/absolute/path/to/your/obsidian/vault
# Or relative to the repo root:
# VAULT_PATH=./vault
```

The vault directory will be created automatically on first run with the following structure:

```
vault/
├── _inbox/
│   └── links.md       ← Drop your URLs here
├── *.md               ← Docs live at the vault root (visible in Obsidian)
└── .system/           ← Hidden from Obsidian
    ├── sources/
    │   └── raw/       ← Ingested JSON files land here
    ├── sources.json   ← Ingestion tracking
    ├── tags.json      ← Tag definitions
    ├── config.json    ← App config
    └── backup/
        └── docs/      ← Versioned doc backups
```

### 3. Install Python dependencies

```bash
pip install faster-whisper
```

### 4. Install Playwright browser (for Instagram)

```bash
npx playwright install chromium
```

## Usage

### Add links to your inbox

Open `$VAULT_PATH/_inbox/links.md` in Obsidian (or any editor) and add URLs — one per line. Markdown formatting is fine; the tool picks up any line starting with `http`.

```md
# Videos to process

https://youtube.com/watch?v=dQw4w9WgXcQ
https://www.instagram.com/reel/ABC123/
```

### Run ingestion

```bash
# Development
npm run dev

# Production (build first)
npm run build
npm start
```

If Instagram links are detected and no cookies are saved yet, a browser window will open automatically for you to log in. The session is saved and reused on subsequent runs.

### Commands

```bash
# Run ingestion (default — same as bare `npm run dev`)
npm run dev ingest

# Authenticate Instagram manually
npm run dev auth instagram
```

## Development

```bash
# Type-check
npx tsc --noEmit

# Build
npm run build

# Watch mode build
npm run build:watch
```

## How deduplication works

Each URL is normalized (tracking params stripped, short URLs expanded) and hashed with SHA1. The hash is used as the filename in `Sources/raw/<hash>.json` and tracked in `System/sources.json`. Re-running with the same URL is always a no-op.

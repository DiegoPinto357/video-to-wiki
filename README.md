# video-to-wiki

CLI tool that ingests YouTube and Instagram videos into an [Obsidian](https://obsidian.md)-compatible knowledge wiki. Drop links into your inbox, run the tool, and get structured Markdown documents built from video transcripts — with optional AI-powered automation via a GitHub Copilot CLI skill.

## How it works

1. Add video URLs to `$WIKI_PATH/_inbox/links.md` (one per line)
2. Run ingestion — it fetches metadata + transcripts and saves structured JSON to `.system/sources/raw/`
3. An AI agent (via the `update-wiki` Copilot CLI skill) reads the raw sources, decides where content belongs in the wiki, asks for your approval on tags and folder structure, and writes clean Markdown documents
4. Already-ingested URLs are skipped automatically (deduplication via SHA1 hash)

## Prerequisites

| Tool                                                        | Install                           |
| ----------------------------------------------------------- | --------------------------------- |
| Node.js ≥ 18                                                | [nodejs.org](https://nodejs.org)  |
| Python ≥ 3.9                                                | [python.org](https://python.org)  |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)                  | `brew install yt-dlp`             |
| [ffmpeg](https://ffmpeg.org)                                | `brew install ffmpeg`             |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | `pip install faster-whisper`      |
| Playwright Chromium                                         | `npx playwright install chromium` |

> **Note:** yt-dlp, ffmpeg, faster-whisper, and Playwright are only required for Instagram ingestion. YouTube videos use the native transcript API and only fall back to Whisper when no captions are available.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd video-to-wiki
npm install
```

### 2. Configure

Copy the example env file and edit it:

```bash
cp .env.example .env
```

```env
# Required — path to your Obsidian vault (absolute or relative to repo root)
WIKI_PATH=/path/to/your/obsidian/vault

# Optional — describe the scope of your wiki.
# The AI agent uses this to avoid suggesting redundant tags or folders.
WIKI_CONTEXT="Practical guide for first-time parents caring for a newborn."
```

The wiki directory is created automatically on first run:

```
wiki/
├── _inbox/
│   └── links.md          ← Drop your URLs here
├── *.md                  ← Docs live at root (visible in Obsidian)
├── <Folder>/             ← Subfolders created on agent suggestion + approval
└── .system/              ← Hidden from Obsidian
    ├── sources/
    │   └── raw/          ← Ingested JSON files
    ├── sources.json      ← Ingestion tracking
    ├── tags.json         ← Tag and category definitions
    ├── config.json       ← App config
    └── backup/docs/      ← Versioned doc backups
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

Open `$WIKI_PATH/_inbox/links.md` and add URLs — one per line:

```md
https://youtube.com/watch?v=dQw4w9WgXcQ
https://www.instagram.com/reel/ABC123/
```

### Run ingestion

```bash
npm run dev          # ingest (default)
npm run dev -- ingest
```

If Instagram links are detected and no cookies are saved, a browser window opens for you to log in. The session is saved and reused.

### Build and run in production

```bash
npm run build
npm start
```

## CLI Commands

```bash
# Ingestion
npm run dev -- ingest                  # Ingest links from inbox
npm run dev -- auth instagram          # Authenticate Instagram manually

# Source management
npm run dev -- list-raw                # List all ingested sources
npm run dev -- list-unprocessed        # List sources not yet turned into docs
npm run dev -- get-raw <id>            # Full raw JSON for a source
npm run dev -- mark-processed <id>     # Mark a source as processed
npm run dev -- add-source <url>        # Add a URL directly to the inbox

# Wiki management
npm run dev -- list-structure          # Current wiki structure (docs + tags + summaries)
npm run dev -- get-doc <file>          # Full content + metadata for a doc
npm run dev -- ai-context <id>         # Raw source + wiki structure in one call (AI-optimized)
npm run dev -- apply <file|-> [--json] # Apply AI-generated JSON (create/update/suggest/ask)

# Tags
npm run dev -- tags list               # List all tags and categories
npm run dev -- tags validate           # Check docs only use defined tags
npm run dev -- tags add <tag> [tag2...]          # Add one or more tags
npm run dev -- tags add <tag> [tag2...] --category  # Add one or more categories
npm run dev -- tags remove <tag>       # Remove a tag
```

## AI Agent Integration (Copilot CLI Skill)

The `update-wiki` skill automates the full pipeline using [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).

### Setup

The skill is already included in `.github/skills/update-wiki/`. No additional setup needed — Copilot CLI picks it up automatically.

### How to use

Open Copilot CLI in the repo directory and invoke the skill:

```
/update-wiki
```

The agent will:

1. Ingest any new links from the inbox
2. List unprocessed sources and pick one
3. Fetch the raw source + current wiki structure
4. Check related existing documents to avoid duplication
5. **Ask you** about folder structure (proposes subfolders when relevant)
6. **Ask you** about tags/categories (proposes new ones when needed, then adds them)
7. Write the document in the approved location using the standard template
8. Mark the source as processed and report a summary

Each invocation processes **one source** and stops — re-invoke to process the next. This keeps the AI context clean between items.

### Document template

All documents follow a consistent structure (defined in `.github/skills/update-wiki/template.md`):

```md
#tag1 #tag2

Introductory paragraph.

# Section

Content.

---

# Fontes

- [Video title](https://url)
```

Tags use [Obsidian inline tag syntax](https://help.obsidian.md/Editing+and+formatting/Tags). The filename is the document title (Obsidian renders it automatically).

### `apply` JSON format

The agent (or you manually) can pipe a JSON decision to `apply`:

```bash
echo '{"action":"create","target":"Doc.md","content":"...","sources":[{"title":"Title","url":"https://..."}]}' \
  | npm run dev -- apply - --json
```

Supported actions:

| Action    | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `create`  | Write a new document                                        |
| `update`  | Overwrite an existing document (backs up first)             |
| `suggest` | Propose a structural change (folder, tag) — no file written |
| `ask`     | Surface a question to the user — no file written            |

The `--json` flag returns machine-readable output: `{ "status": "success\|error", "action": "...", "file": "..." }`.

## Development

```bash
npx tsc --noEmit   # Type-check
npm run build      # Build
```

## How deduplication works

Each URL is normalized (tracking params stripped) and hashed with SHA1. The hash is used as the filename in `.system/sources/raw/<hash>.json` and tracked in `.system/sources.json`. Re-running with the same URL is always a no-op.

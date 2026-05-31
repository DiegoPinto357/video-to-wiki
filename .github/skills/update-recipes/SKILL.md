---
name: update-recipes
description: Maintains a recipe wiki by processing unprocessed video sources and creating structured recipe Markdown documents. Use when asked to update the recipe wiki, process recipe sources, or add new recipes.
allowed-tools: shell
---

You are an AI assistant responsible for maintaining a structured recipe wiki stored in Markdown files.

You must use the available CLI commands to retrieve and manipulate data.
Do NOT read files directly unless explicitly instructed.

All commands are run from the app directory using:

npm run dev -- <command>

Configuration (wiki path, etc.) is loaded automatically. No setup required.

---

## AVAILABLE COMMANDS

- npm run dev -- ingest [--wiki <name>]
- npm run dev -- list-unprocessed [--wiki <name>]
- npm run dev -- ai-context <id> [--wiki <name>]
- npm run dev -- get-doc <file> [--wiki <name>]
- npm run dev -- apply <file> --json [--wiki <name>]
- npm run dev -- mark-processed <id> [--wiki <name>]
- npm run dev -- backup list <file> [--wiki <name>]
- npm run dev -- backup get <file> [version] [--wiki <name>]
- npm run dev -- backup restore <file> [version] [--wiki <name>]
- npm run dev -- tags add <tag> [--wiki <name>]
- npm run dev -- tags add <tag> --category [--wiki <name>]

---

## WORKFLOW

0. Check which wikis are registered:
   - Run: npm run dev -- wiki list --type recipe
   - If no wikis are listed, STOP and tell the user to register a recipe wiki first (run: npm run dev -- wiki add <path> --name <name>, then wiki init with --type recipe).
   - If multiple wikis are listed, ask the user which one to update. Then append `--wiki <name>` to ALL subsequent commands.
   - If only one wiki is registered, proceed automatically.
   - Run: npm run dev -- wiki config [--wiki <name>] and read the `language` field. Default to `en-US` if not set. Use this language for ALL generated content.

1. Call: npm run dev -- ingest [--wiki <name>]
   - Reads the inbox and ingests any new video links.
   - Wait for it to complete before proceeding.

2. Call: npm run dev -- list-unprocessed [--wiki <name>]
   - If the result is an empty array, STOP and inform the user there is nothing to process.

3. Select ONE item to process.

4. Call: npm run dev -- ai-context <id> [--wiki <name>]
   - Returns the raw source content AND the current wiki structure.

5. Determine the recipe name (dish name, not video title) and scan the existing docs list from ai-context for any docs covering the same dish:
   - If a doc for the same dish already exists, fetch it: npm run dev -- get-doc <file> [--wiki <name>]
   - This is used ONLY to confirm it is the same dish and to prepare cross-linking — NOT to copy content.

6. Think about folder structure (REQUIRED):
   - Review the existing docs list. Is there a natural cuisine or category folder for this recipe?
   - If a relevant subfolder doesn't exist yet, use the `suggest` action to propose it. Wait for user approval before placing the doc there.
   - If the user approves a folder, use it in the target (e.g. `Massas/Carbonara.md`).

7. Think about tags (REQUIRED):
   - Check `wikiContext` (if present) — do NOT suggest tags that merely restate the wiki's overall scope.
   - Check existing tags from the structure output.
   - If no relevant tags exist, use the `ask` action to propose new ones BEFORE writing. Wait for user approval.
   - Tags will be auto-registered when the document is applied — no need to call `tags add` manually.

8. Plan ALL actions before writing anything:
   - There is always exactly ONE `create` action per source (one video = one recipe doc).
   - If the same dish already exists, add a cross-link `update` BEFORE the `create`:
     - `update` the existing doc: add `[[New Recipe]]` to its `## Outras Versões` section (create the section before `---` if absent).
     - `create` the new doc with `[[Existing Recipe]]` in its `## Outras Versões` section.
   - Present the full plan to the user and wait for approval before proceeding.

9. Execute each approved action in sequence using a temp file:

   cat > tmp/wiki-apply.json << 'ENDJSON'
   { ...json... }
   ENDJSON
   npm run dev -- apply tmp/wiki-apply.json --json [--wiki <name>]

   Use a heredoc with a quoted delimiter (`'ENDJSON'`) so all content is treated literally — no issues with apostrophes, `$`, or special characters. NEVER use `echo '<json>'`.

   IMPORTANT — valid JSON inside the heredoc: any literal double-quote (`"`) inside `content` MUST be escaped as `\"`. Use single quotes or em-dashes in prose to avoid this.

   The `content` field MUST:
   - Follow the recipe template exactly (see template.md in this skill)
   - Include approved tags on the first line as Obsidian inline tags: `#tag1 #tag2`
   - Include `## Outras Versões` only if there are cross-links to add; omit the section entirely otherwise
   - Include `## Dicas` only if the source contains tips; omit the section entirely otherwise

   Check the returned status after each apply call:
   - status "error" → STOP, report the error to the user, do NOT mark processed
   - action "ask" → STOP, present the question to the user, do NOT mark processed, await answer
   - action "suggest" → report the suggestion to the user, then proceed
   - action "create" or "update" with status "success" → continue to next action
   - If the result includes `autoRegisteredTags`, log this to the user and continue normally.

   **If the user asks to undo or rollback a document:**
   - Call: npm run dev -- backup list <file> --json to see available versions.
   - Call: npm run dev -- backup get <file> [version] --json to read a version's content before restoring.
   - Call: npm run dev -- backup restore <file> [version] --json to restore (omit version for latest).

10. Call: npm run dev -- mark-processed <id> [--wiki <name>]
    Only after ALL actions have succeeded.

11. Report a summary (recipe created, cross-links added, tags registered, folder used) and STOP. The user will re-invoke the skill to process the next item.

---

## RULES

- **ALWAYS CREATE** — one video always produces exactly one new recipe document. Never merge two videos into one doc.
- **NEVER update** an existing recipe doc except to add cross-links in `## Outras Versões` when a new version of the same dish is being processed.
- **NEVER copy content** from existing docs into the new one. The new content comes EXCLUSIVELY from the current source (ai-context output).
- NEVER create tags, categories, or folders without explicit user approval — always ask first.
- NEVER place documents in a subfolder unless the user has explicitly approved it in this session.
- If there is any ambiguity (tags, folders, naming, dish identification), ASK the user before proceeding.
- Doc title = dish name (not the video title). Add a differentiator if needed (e.g. `Carbonara (versão rápida).md`).

---

## LANGUAGE

- All generated content MUST be written in the wiki's configured language (read from `wiki config` in step 0, default `en-US`)
- Use clear, practical language appropriate for a recipe

---

## DOCUMENT TEMPLATE

All documents must follow the structure described in template.md (in this skill).

Rules for the template:

- `## Dicas` is OPTIONAL — include only if the source contains tips or tricks
- `## Outras Versões` is OPTIONAL — include only when cross-linking to another version of the same dish
- The `## Fontes` section MUST always be the last section, after a horizontal rule (`---`)
- Every source MUST be a markdown link: `- [Title](url)`

---

## OUTPUT FORMAT

### Create or Update

```json
{
  "action": "create | update",
  "target": "Folder/Recipe Name.md",
  "content": "Full markdown content following the recipe template",
  "sources": [{ "title": "Video title", "url": "https://..." }]
}
```

### Suggestion (tag, folder)

```json
{
  "action": "suggest",
  "type": "new_tag | new_folder",
  "value": "...",
  "reason": "..."
}
```

### Ambiguity (MANDATORY when unsure)

```json
{
  "action": "ask",
  "question": "Your question to the user"
}
```

---

## OBJECTIVE

Your goal is to build a clean, well-organized recipe collection where each video becomes its own recipe document, related versions of the same dish are cross-linked, and the wiki grows consistently over time.

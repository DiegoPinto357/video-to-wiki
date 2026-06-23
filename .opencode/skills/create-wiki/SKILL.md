---
name: create-wiki
description: Creates and configures a new wiki from scratch. Use when asked to set up a new wiki, add a new knowledge base, or configure a new wiki.
---

You are an AI assistant helping the user set up a new wiki for the video-to-wiki system.

All commands are run from the app directory using:

npm run dev -- <command>

---

## WORKFLOW

1. Greet the user and explain you will guide them through setting up a new wiki.

2. Ask the user for the following information, one at a time:

   a. **Wiki name** (short identifier, no spaces — e.g. `benicio`, `trabalho`, `recipes`)
   - Must be unique across registered wikis.
   - Run `npm run dev -- wiki list` to check existing names.

   b. **Wiki path** (absolute path to the folder where the wiki files will live)
   - This should be an existing or new folder (it will be created if it doesn't exist).
   - Example: `/Users/john/Documents/MyWiki` or a Google Drive / iCloud path.
   - Confirm with the user: "Will this wiki be stored at `<path>`? (yes/no)"

   c. **Language** (the language all wiki content will be written in, defaults to `en-US`)
   - Example: `pt-BR`, `en-US`, `es`
   - If the user skips this, use `en-US`.
   - **Ask language BEFORE description and context** — all suggestions below will be written in this language.

   d. **Wiki type** — ask: "Is this a knowledge wiki or a recipe wiki?"
   - `knowledge` (default): knowledge base where multiple videos can contribute to the same document.
   - `recipe`: strict 1:1 — one video always produces one recipe document, with a fixed recipe template.
   - If the user is unsure, briefly explain the difference and ask again.

   e. **Description** (1–2 sentences describing what this wiki is about)
   - Based on the wiki name, path, language, and type, **draft a suggestion in the wiki's language** and present it to the user.
   - Present exactly these options:
     1. ✅ Accept as-is
     2. ✏️ Accept but suggest changes (ask what to change, revise, and confirm again)
     3. ✍️ Type my own
   - Use the final accepted text as the description.

   f. **Wiki context** (a more detailed description to guide the AI agent — what topics, what NOT to tag, what's the scope)
   - Based on everything collected so far, **draft a suggestion in the wiki's language** and present it to the user.
   - Present exactly these options:
     1. ✅ Accept as-is
     2. ✏️ Accept but suggest changes (ask what to change, revise, and confirm again)
     3. ✍️ Type my own
   - Use the final accepted text as the wiki context.

3. Once all information is collected, summarize it to the user:

   ```
   Wiki name:    <name>
   Path:         <path>
   Description:  <description>
   Language:     <language>
   Type:         <type>
   Context:      <wikiContext>
   ```

   Ask: "Does this look correct? (yes/no)" — wait for confirmation before proceeding.

4. Register the wiki:

   npm run dev -- wiki add "<path>" --name "<name>"

5. Initialize the wiki system files with all config in one command. For values containing special characters, write them to temp files first:

   ```
   cat > tmp/wiki-wikicontext.txt << 'EOF'
   <wikiContext>
   EOF

   npm run dev -- wiki init "<name>" \
     --description "<description>" \
     --language "<language>" \
     --type "<type>" \
     --wiki-context "$(cat tmp/wiki-wikicontext.txt)"
   ```

   This sets name, description, language, and wikiContext in a single write — avoiding race conditions on synced folders (Google Drive, iCloud, etc.).

6. Ask the user: "Would you like to set this wiki as your active default? (yes/no)"
   - If yes: npm run dev -- wiki use "<name>"
   - If no: skip.

7. Report what was done:
   - Wiki registered at `<path>`
   - System files initialized
   - Configuration saved
   - Remind the user: "Add links to `<path>/_inbox/links.md` and run the `update-wiki` skill to start ingesting content." (for knowledge wikis)
   - For recipe wikis: "Add links to `<path>/_inbox/links.md` and run the `update-recipes` skill to start ingesting recipes."

---

## RULES

- Never skip the confirmation step (step 3) before writing anything.
- Always run `wiki list` first to check for name conflicts.
- If any command returns an error, STOP and report it to the user.
- Do NOT create content documents — only the system setup.

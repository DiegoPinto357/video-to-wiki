---
name: create-wiki
description: Creates and configures a new wiki from scratch. Use when asked to set up a new wiki, add a new knowledge base, or configure a new wiki.
allowed-tools: shell
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

   c. **Description** (1–2 sentences describing what this wiki is about)
   - Example: "A personal knowledge base about cooking and recipes."

   d. **Language** (optional — the language all wiki content will be written in, defaults to `en-US`)
   - Example: `pt-BR`, `en-US`, `es`
   - If the user skips this, use `en-US`.

   e. **Wiki context** (a more detailed description to guide the AI agent — what topics, what NOT to tag, what's the scope)
   - Example: "This wiki covers family recipes passed down through generations. Avoid generic tags like 'food' or 'cooking'. Focus on specific dishes, techniques, and ingredients."

3. Once all information is collected, summarize it to the user:

   ```
   Wiki name:    <name>
   Path:         <path>
   Description:  <description>
   Language:     <language>
   Context:      <wikiContext>
   ```

   Ask: "Does this look correct? (yes/no)" — wait for confirmation before proceeding.

4. Register the wiki:

   npm run dev -- wiki add "<path>" --name "<name>"

5. Initialize the wiki system files with all config in one command. For values containing special characters, write them to temp files first:

   ```
   cat > /tmp/wiki-wikicontext.txt << 'EOF'
   <wikiContext>
   EOF

   npm run dev -- wiki init "<name>" \
     --description "<description>" \
     --language "<language>" \
     --wiki-context "$(cat /tmp/wiki-wikicontext.txt)"
   ```

   This sets name, description, language, and wikiContext in a single write — avoiding race conditions on synced folders (Google Drive, iCloud, etc.).

6. Ask the user: "Would you like to set this wiki as your active default? (yes/no)"
   - If yes: npm run dev -- wiki use "<name>"
   - If no: skip.

7. Report what was done:
   - Wiki registered at `<path>`
   - System files initialized
   - Configuration saved
   - Remind the user: "Add links to `<path>/_inbox/links.md` and run the `update-wiki` skill to start ingesting content."

---

## RULES

- Never skip the confirmation step (step 3) before writing anything.
- Always run `wiki list` first to check for name conflicts.
- If any command returns an error, STOP and report it to the user.
- Do NOT create content documents — only the system setup.

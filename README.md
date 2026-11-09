# Pre-Deployment GZW Shopping List

Manual shopping-list controls and a transparent OBS/Streamlabs overlay. The site is hosted on GitHub Pages; a separate Supabase project saves list state and custom fonts.

## Use

Open your private control link. Add names, quantities and optional notes. Use + / - to update collected counts, check an item off, reorder it or remove it. Appearance changes save automatically. Import a TTF, OTF, WOFF or WOFF2 font (maximum 2 MB).

Click **Copy OBS URL**, add a Browser Source in OBS/Streamlabs, leave Local file unchecked, paste the URL and set **600 × 1080**. The overlay checks for changes every four seconds. Long lists rotate pages every ten seconds, and the panel scales to fit the source. Internet access is required; the editor does not have to remain open.

Keep the control link private: anyone with it can edit. The OBS link grants read-only access. Link keys are in the URL fragment and are not committed to this repository. No Supabase admin key is in frontend code. The database denies direct anonymous access; the Edge Function checks a SHA-256 hash of the supplied list key before any read or write.

Use one control tab at a time. Export/import JSON for list backups; imports preserve the currently selected font. Unsynced edits are retained in the control browser and retried. Clearing browser data removes this local retry copy, not the saved cloud list.

## Hosting

Publish the repository root from `main` using GitHub Pages. This is a buildless site. The endpoint is configured in `shared.js`; the backend source lives in `backend.ts` and the schema in `schema.sql`. Provision hashed read/edit keys separately; never commit raw control links, tokens or font uploads.

Logo supplied by the project owner. Imported fonts remain in the backend, not the public repository.


# Pre-Deployment GZW Shopping List

Manual shopping-list controls and a transparent OBS/Streamlabs overlay. Everyone uses the same GitHub Pages address, with a separate save in each browser profile. No account is required.

## Use

Open https://nl256.github.io/predeployment-gzw-shopping-list/. Add names, quantities and optional notes. Use + / - to update collected counts, check an item off, reorder it or remove it. Lists and appearance changes save immediately in localStorage; imported fonts are saved locally in IndexedDB. The editor can reopen offline after its first successful load.

Set independent accent/border, background, title, item text, notes, quantity, subtitle and footer colors using swatches or hex values. Import a TTF, OTF, WOFF or WOFF2 font (maximum 2 MB).

**Connect OBS** is optional. It creates a private online copy for this browser and uploads its current list, appearance and font. Click **Copy OBS URL**, add a Browser Source in OBS/Streamlabs, leave Local file unchecked, paste the URL and set **600 × 1080**. The overlay checks for changes every four seconds. Long lists rotate pages every ten seconds, and the panel scales to fit the source. OBS needs internet access. Keep the editor open until pending changes finish syncing; OBS can then display the last synced copy while the editor is closed.

The regular website address is safe to share. Keep your personal OBS URL private: it gives read-only access to your list and font. Disconnect OBS revokes that URL and removes its online copy while retaining your local save. Network failures never replace the local list; pending updates retry while the editor is open.

Use **Export backup** before clearing browser data, using private browsing, or changing browsers/devices. Backups include the complete list, colors and custom font, without OBS access keys. **Import backup** restores them into the current browser. People sharing one browser profile share one save; separate devices and browser profiles have separate saves. The online OBS copy is not an account or a recovery service. If local browser data is cleared, reconnecting creates a new overlay URL.

Old private control links offer **Copy old list into this browser**. This copies the legacy list and font once, without altering the old shared list. Future edits use the local save. Create a new personal OBS connection after copying. Existing legacy overlay URLs continue to display the old list.

## Hosting

Publish the repository root from `main` using GitHub Pages. This is a buildless site. The endpoint is configured in `shared.js`; the backend source lives in `backend.ts`. Apply `schema.sql`, then `local-overlay-migration.sql`, and deploy the Edge Function as `shopping-list` with JWT verification disabled: it authenticates each request with its own read/edit capability key. The Edge Function needs the service-role key in its server environment; no admin key belongs in frontend code.

Connecting OBS generates separate random 256-bit read/edit keys in the browser. Only hashes are stored in the database. Edit keys stay in the local browser save; OBS receives only the read key in the URL fragment. The database denies direct anonymous access. The creation RPC is executable only by the service role and applies basic project and per-originating-address quotas. Backups and public source must never contain access keys or user font uploads.

The service worker caches the app shell only, not backend responses. Increment the cache version in `sw.js` whenever publishing changed frontend assets. The local save envelope is versioned separately and remains intact during app updates.

Logo supplied by the project owner. Imported fonts remain on the user's device, with an online copy only when OBS is connected; they are never committed to the public repository.


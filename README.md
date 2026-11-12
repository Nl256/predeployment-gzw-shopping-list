# Pre-Deployment OBS Outputs

Manual lists and transparent OBS/Streamlabs overlays, organized in tabs. Everyone uses the same GitHub Pages address, with separate saves in each browser profile. No account is required.

## Multiple outputs

Use **+ New tab** to create outputs such as **Shirts**, **Twitch drops**, or another deployment list. Each tab has its own list, title, colors, opacity, custom font and OBS connection. Add each connected tab's URL as a separate OBS Browser Source. They can all display simultaneously; selecting a different editor tab never changes another source's contents.

Existing saves automatically appear in the **Pre-deployment** tab, preserving the original OBS URL. New tabs start empty and do not connect online until you choose **Connect OBS**. Rename changes the tab label; edit **Overlay title** to change the on-stream heading. **Archive tab** hides a tab without removing its save or revoking its OBS link; restore it using the archived-tab selector. Up to 20 tabs, including archived tabs, can be saved. The backend allows up to 10 new OBS connections from one originating address per hour.

**Export this tab** includes only the selected tab's list, appearance and font. Export each tab separately. **Import into this tab** replaces only that tab's contents and keeps its existing OBS connection; Undo can restore the previous contents. To transfer another output, create a new tab first, then import its backup. Legacy single-list backups remain supported.

## Use

Open https://nl256.github.io/predeployment-gzw-shopping-list/. Add names, quantities and optional notes. Use + / - to update collected counts, check an item off, reorder it or remove it. Lists and appearance changes save immediately in localStorage; imported fonts are saved locally in IndexedDB. The editor can reopen offline after its first successful load.

Set independent accent/border, background, title, item text, notes, quantity, subtitle and footer colors using swatches or hex values. Import a TTF, OTF, WOFF or WOFF2 font (maximum 2 MB).

**Connect OBS** is optional for each tab. It creates a private online copy for that tab and uploads its list, appearance and font. Click **Copy OBS URL**, add a Browser Source in OBS/Streamlabs, leave Local file unchecked, paste the URL and set **600 × 1080**. Repeat for each output. The overlay checks for changes every four seconds. Long lists rotate pages every ten seconds, and the panel scales to fit the source. OBS needs internet access. Keep the editor open until pending changes finish syncing; background tabs also retry pending updates. OBS can then display each last synced copy while the editor is closed.

The regular website address is safe to share. Keep your personal OBS URL private: it gives read-only access to your list and font. Disconnect OBS revokes that URL and removes its online copy while retaining your local save. Network failures never replace the local list; pending updates retry while the editor is open.

Use **Export this tab** for each output before clearing browser data, using private browsing, or changing browsers/devices. Backups include the complete list, colors and custom font, without OBS access keys. People sharing one browser profile share its tabs; separate devices and browser profiles have separate saves. The online OBS copy is not an account or a recovery service. If local browser data is cleared, reconnecting creates new overlay URLs.

Old private control links offer **Copy old list into this browser**. This copies the legacy list and font once, without altering the old shared list. Future edits use the local save. Create a new personal OBS connection after copying. Existing legacy overlay URLs continue to display the old list.

## Hosting

Publish the repository root from `main` using GitHub Pages. This is a buildless site. The endpoint is configured in `shared.js`; the backend source lives in `backend.ts`. Apply `schema.sql`, then `local-overlay-migration.sql`, and deploy the Edge Function as `shopping-list` with JWT verification disabled: it authenticates each request with its own read/edit capability key. The Edge Function needs the service-role key in its server environment; no admin key belongs in frontend code.

Connecting OBS generates separate random 256-bit read/edit keys in the browser. Only hashes are stored in the database. Edit keys stay in the local browser save; OBS receives only the read key in the URL fragment. The database denies direct anonymous access. The creation RPC is executable only by the service role and applies basic project and per-originating-address quotas. Backups and public source must never contain access keys or user font uploads.

The service worker caches the app shell only, not backend responses. Increment the cache version in `sw.js` whenever publishing changed frontend assets. The local save envelope is versioned separately and remains intact during app updates.

Logo supplied by the project owner. Imported fonts remain on the user's device, with an online copy only when OBS is connected; they are never committed to the public repository.


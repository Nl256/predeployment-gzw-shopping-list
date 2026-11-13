# Pre-Deployment OBS Outputs

Shopping lists, Twitch drops, spin wheels and custom Bingo boards for OBS/Streamlabs. Everyone uses [the same website](https://nl256.github.io/predeployment-gzw-shopping-list/), with separate local saves in each browser profile. No account is required.

## Create an output

Choose **+ New tab**, give it a name and select its overlay type. Each tab has its own content, colors, custom font and optional OBS connection. Existing saves and OBS URLs are preserved. Use **Output type** to change an older tab into a drops overlay, wheel or Bingo board; renaming a tab only changes its label.

- **Shopping list:** manually enter items, quantities and notes, update collected counts, check off items and reorder them. Long lists rotate pages every ten seconds.
- **Twitch drops:** upload up to 12 PNG, JPG or WebP images (maximum 10 MB per source file) and enter an item name for each. Choose **Bottom strip**, **Reward grid**, **Side rail**, **Corner frame** or **PD supply card** from the **Layout** dropdown. **Circular orbit** remains the default for existing outputs. The orbit, strip, grid, rail and corner layouts keep every image visible and upright, with its name underneath. The four rectangular/corner layouts smoothly slide the image/name pairs between positions at the selected interval, easing into each stop and pausing for readability; the circular orbit moves continuously. **PD supply card** uses a tactical PD header, a numbered supply card and a segmented time bar. Its carousel shows one reward at a time with its name and optional watch-time text, such as “Watch 2 hours.” With two or more rewards and **Cycle rewards** enabled, its segmented bar fills over the selected **Seconds per reward**, then the next reward slides in. That bar measures the card's display time. Watch-time text is entered manually and does not track viewing progress. Set an interval from 2–30 seconds (for example, 3–5 seconds). A single reward stays still without a timed bar; turning cycling off shows the first reward. The PD logo and editable Twitch drops text line remain fixed. Optional watch times save with the output and its backups, including when another layout is selected. Images are resized to at most 512 pixels and compressed for local storage and OBS sync.
- **Spin wheel:** add 2–40 names, one per line; edit each name and slice color. The PD logo stays in the center. **Spin wheel** starts the same animation and winner in the preview and connected OBS output. **Troll spin** slows almost to a stop, accelerates again, then slows onto the final winner. Both buttons use the configured duration and equal chances; the winner is announced only after the final stop. Set a 6–15 second duration. **Remove winner after spinning** removes the winning entry from the next spin; the finished wheel remains visible until the next spin, an entry edit or **Clear winner display**. Every entry has an equal chance. Names, colors and type are locked during a spin. With reduced-motion preferences, drops stay still and the wheel reveals its result when the spin ends.

- **Bingo:** choose a 3 × 3, 4 × 4 or 5 × 5 board. Enter a custom phrase or challenge in each square (up to 120 characters), then use its mark button when it happens. Complete any row, column or diagonal to highlight Bingo. Empty squares cannot be marked. Editing a phrase clears that square’s mark. Smaller boards use the first 9 or 16 squares in reading order and preserve the remaining squares and marks for when you enlarge the board. **Reset marks** clears all marks, including hidden squares, and keeps every phrase; **Undo last change** restores a reset. The PD logo, colors, font, phrases and marks belong to this output, save locally, and update its connected OBS source.

Shirt overlays are not included yet.

## Appearance and OBS

Adjust the title, subtitle, opacity, logo size, text size and relevant colors independently for each output. Import TTF, OTF, WOFF or WOFF2 fonts up to 2 MB. Content and settings save in localStorage; imported images and fonts save in IndexedDB. The editor can reopen offline after its first successful load.

Choose **Connect OBS** for each tab you want on stream, then **Copy OBS URL**. Add a separate Browser Source in OBS/Streamlabs, leave **Local file** unchecked, paste its URL and use the suggested dimensions shown in its controls. Shopping lists, spin wheels and circular drops use **600 × 1080**; Bingo and the other drops layouts show their own dimensions as rewards and appearance settings change. Existing source sizes also scale the overlay to fit. Place the source where you want it in your scene. Every connected output can appear simultaneously. Selecting another editor tab does not change the other sources.

OBS polls ordinary output changes every four seconds and wheel events every second. A connected spin is selected once by the backend and scheduled briefly ahead so all viewers share the result. Keep the editor open while making changes and spinning; wait until it says OBS is connected and up to date. Pending changes retry after connection failures. OBS can continue displaying the last synced copy while the editor is closed. OBS needs internet access.

The regular website address is safe to share. A personal OBS URL gives read-only access to that output, including its images and font; keep it private. **Disconnect OBS** revokes that URL and removes its online copy while keeping the local save. Each new tab starts locally without an online connection.

## Backups and tabs

**Export this tab** includes the selected output's content, images, appearance and custom font, without OBS access keys or a replayable spin event. Export each tab separately before clearing browser data or changing browsers/devices. To transfer an output, create a new tab and use **Import into this tab**. Import replaces only the selected tab's contents and preserves its existing OBS connection; Undo can restore the previous contents. Legacy list backups remain supported.

People sharing one browser profile share its tabs; separate browser profiles/devices have separate saves. The online OBS copy is not an account or recovery service. Clearing local browser data requires reconnecting with new URLs. **Archive tab** hides a tab without erasing its save or revoking its OBS link; use the archived-tab selector to restore it. Up to 20 tabs, including archived tabs, can be saved. The backend allows up to 10 new connections per originating address per hour.

Old private control links offer **Copy old list into this browser**. This copies the legacy list and font once without changing the old shared list. Future edits use the local save. Create a personal OBS connection after copying. Legacy overlay URLs continue displaying the old list.

## Hosting

Publish the repository root from `main` using GitHub Pages. This is a buildless site. The endpoint is configured in `shared.js`. Apply `schema.sql`, `local-overlay-migration.sql`, then `overlay-types-migration.sql`. Deploy `backend.ts` as the `shopping-list` Edge Function entry point, with `type-model.js` alongside it and JWT verification disabled: the function authenticates each request using its own read/edit capability key. The service-role key belongs only in the function's server environment.

Connections generate random 256-bit read/edit keys in the browser. Only their hashes are stored in the database. Edit keys remain in the local save; OBS receives the read key in the URL fragment. The database denies direct anonymous access. Service-role-only creation quotas limit connection creation. Reward images and fonts are served only through an authorized output key. Backups and public repository files must never contain access keys or uploaded user assets.

The service worker caches only the app shell, never backend responses. Increment its cache version in `sw.js` when publishing changed frontend assets. Local saves persist through app updates.

Logo supplied by the project owner. Uploaded images and fonts remain on the user's device, with an online copy only when that tab is connected to OBS; they are never committed to the public repository.

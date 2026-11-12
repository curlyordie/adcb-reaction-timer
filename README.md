# ADCB · AAIHEX 2026 · 5 + 5 Challenge

A two-stage precision game for the UAE's 55th National Day. Both timers remain visible side by side. Players start and stop Round 1, then unlock a fresh Round 2. Each must land within **4.950–5.050 seconds inclusive**. A miss in either round restarts the whole challenge. Target and tolerance are configurable in Admin.

Elapsed time comes from `performance.now()`, captured and judged at the same millisecond precision displayed to the player. The two times are never added to determine qualification. Leaderboards retain one best challenge per retry sequence, ranked by the greater absolute error of the two rounds. A one-round failed attempt cannot qualify. Both times appear in Admin reports and CSV exports.

## Development

Use the existing isolated checkout; no Git worktree is needed. Node 24:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Local mode stores scores/designs in this browser. Open `/admin` for the editor. No external credentials are needed. ADCB browser storage is namespaced separately from the original FAB application.

```sh
VITE_HOSTED=true npm run build
npm test
npm run test:cloud
```

The build checks frontend/backend TypeScript, creates `dist`, and regenerates `adcb-reaction-timer.html`. The standalone file embeds the fonts, logos and complete illustration library and operates without asset network requests. It remains browser-local even after a hosted build.

Tests need Chromium at `/usr/bin/chromium`, or set `CHROMIUM_PATH`. The ADCB suites cover gameplay boundaries, independent stages, failure/retry/best score, editor drag/layout persistence, uploads/backups, responsive/offline rendering, D1/authentication/publication, hosted browser behavior, and failed-score-save recovery. Historical FAB-specific test files remain in `tests` as reference and are not the current product's test entrypoints. The immutable original project and its original tests also remain outside this checkout at `/workspace/reference/fab_reaction_timer-main` in this onboarding machine.

## Brand and artwork

ADCB master logo is extracted from the supplied ADCB Visual Style Guidelines, page 8, displayed on white with its proportions intact. Palette: red `#DA291C`, deeper red `#AB2328`, charcoal `#333F48`, white. Text uses supplied Museo Sans 100/300/500; heavier weights are synthesized from the supplied 500 face. Timer numerals use the supplied National Day Oswald variable font. Noto fonts are retained for National Day/Arabic artwork needs; DIN Next LT Arabic was not supplied.

The Eid Al Etihad lockup comes from the supplied RGB logo PDF. The downloadable packs are represented by 100 unique illustrations, 9 logos, 16 containers/frames and 24 dynamic logo extensions: 149 reusable images. The supplied 25-colour RGB palette is selectable in Event branding and text colour controls. Identical source images are reused by full SHA-256 rather than filename; the originals remain in the uploaded archives. Three latest illustration archives exceeded the 32 MiB transfer limit and remain unverified pending smaller uploads. See [the source inventory](docs/artwork-inventory.json) for source hashes, categories and pending files. Brand source PDFs are not included in the deployable site.

## Page editor

Open **Admin → Page editor**. Select a page, choose an **Artwork category**, search the **Artwork library**, and click **Add element**. Drag an illustration in the frozen preview; drag its bottom-right handle to resize. The element controls also set position, width, rotation, opacity and layer. You can replace its image, duplicate it or remove it. Layouts are independent for each page. Preview size renders a real 1920 × 1080 desktop, 1080 × 1920 event screen, or 390 × 844 mobile viewport, then scales the entire screen to fit the editor without changing its responsive layout. Existing inline text, colour, size, visibility, preview, history and publication controls remain.

Upload PNG/JPEG/WebP images up to 4 MB and 8192 × 8192 pixels. Uploads remain in the design's reusable library. **Save draft** retains private work; **Publish design** shares it with game devices. Draft/history artwork is private. Backups include uploaded images referenced by the design, elements and library. Full backup import is not implemented.

Moving or resizing an existing image sends layout JSON when saving/publishing, not another image upload. Bundled assets and published artwork use immutable URLs and long browser caching. Admin previews reuse private uploaded artwork through session-local blob URLs, including across preview reloads. New images need an initial upload/download; new devices and cleared/evicted browser caches need to download images again. Hosted score saving, settings checks and publishing still require network access. There is no zero-data guarantee for cloud updates.

## Cloudflare deployment

See [the ADCB setup guide](docs/cloudflare-setup.md). Use a **separate Pages project and separate D1 database** from FAB. Only AAIHEX 2026 is shown in the event selector. Existing legacy database rows are retained; the ADCB profile is initialized separately and made live. No production resources are created, reset or deployed by local builds or tests.

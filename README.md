# ADCB · AAIHEX 2026 · The 55 Years Challenge

A two-stage precision game for the UAE's 55th National Day. Both timers remain visible side by side. Players start and stop Round 1, then unlock a fresh Round 2. Each must land within **4.950–5.050 seconds inclusive**. A miss in either round restarts the whole challenge. Target and tolerance are configurable in Admin.

Round 01 pays tribute to the first 50 years of the Union (1971–2021); Round 02 celebrates the next 5 years (2021–2026). A winning result brings the player’s actual two times together into the official gold 55, with the caption **روح الاتحاد** and **٥٥ عاماً من الاتحاد**. Reduced-motion and frozen editor previews show the completed gold mark immediately. The equation is a symbolic tribute; qualification still depends on each independent round.

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

## Event screen readability

The published event layout uses the display's native **768 × 1024** canvas. It fits registration, all four instruction steps, both timers, winning and missed results, and leaderboard controls without reducing the entire page to fit a taller portrait design. Body copy uses 22–24 px, small labels at least 18 px, instruction numbers 24 px, timer figures 88 px, and result target/range figures 32 px. Target and range sit alongside each other; all text and buttons remain centred. The Page editor opens the matching Event LED preview by default.

A one-time versioned publication switches existing hosted and local designs to this layout. It clears the former percentage and individual font overrides, which caused long pages to shrink again, and moves the supplied illustrations into the footer. It retains the selected illustrations, custom artwork, copy, colours, timing, idle video, results, private draft copy and previous recoverable design versions. Later Admin edits are not overwritten.

## Page-wide text sizes

In **Admin → Page editor**, select a page and use **All text on this page**. The slider and A− / A+ buttons adjust every heading, label, input, button, timer number and Arabic caption together from 75% to 200%. **Apply text size to all pages** copies the current percentage to every game page. **Reset page text size** restores 100% for the selected page.

The percentage multiplies existing individual text sizes: a 64-pixel headline at 125% becomes 80 design pixels. Resetting the page multiplier keeps that individual 64-pixel setting. Artwork coordinates and logo dimensions are preserved. Above 125%, timer cards stack to keep the full numbers visible. The Event LED layout is already sized for readability at 100%; further enlargement can increase page height and cause the complete design to scale down, so check the Event LED preview before publishing.

## Idle video and data use

After 60 seconds with no pointer, keyboard, touch, input or scroll activity, the game shows the supplied AAIHEX / ADCB × MITE LED video. It loops silently, fills the display without cropping, and stops on a touch or key press. An abandoned game returns to a blank registration form. An unsaved result stays available for retrying its save.

Admin → Idle video → **Idle video sizing** selects **Fill screen** (the default, stretching the complete frame to remove player side bars) or **Keep proportions** (preserves the original aspect ratio and can leave bars). This changes playback layout using the same cached file.

The 62.4-second H.264 video is included at `public/media/adcb-aaihex-idle-950f18fa3fc3.mp4`: **2.61 MiB**, reduced from 43.5 MiB while retaining 768 × 1024 pixels and 24 fps. The audio track is omitted because idle autoplay is muted. The original download is not deployed.

Hosted mode downloads the complete video on first idle playback, saves it in browser Cache Storage, and plays a local Blob URL. Each loop and later idle session uses the local copy, including after a reload. The content-hashed URL has a one-year immutable cache header. Idle playback suspends publication polling and automatic failed-score retries; a hidden tab pauses playback. If storage is unavailable, the current page still reuses one in-memory copy. Cleared/evicted storage, another browser/device, or a changed video can require another download. Active hosted games still need small requests for registration, scores and publications.

The standalone `adcb-reaction-timer.html` also embeds the video bytes, so its idle playback needs no network connection or separate media file. A one-time versioned settings update enables the video at 60 seconds for existing hosted/local designs while preserving their layout, artwork, records and history. Admin → Idle video can change or disable the timeout; when enabled it takes precedence over the registration-only inactivity return.

To replace the supplied video, optimise an MP4 to H.264/yuv420p under Cloudflare Pages’ 25 MiB file limit, then run `node scripts/bundle-idle-video.mjs /path/to/optimised.mp4` from this checkout and rebuild. The script validates the codec, copies the file, and updates `shared/idle-video.json` with its size and SHA-256. Do not use an expiring transfer URL as the game’s video source.

## Brand and artwork

ADCB master logo is extracted from the supplied ADCB Visual Style Guidelines, page 8, displayed on white with its proportions intact. Palette: red `#DA291C`, deeper red `#AB2328`, charcoal `#333F48`, white. Text uses supplied Museo Sans 100/300/500; heavier weights are synthesized from the supplied 500 face. Timer numerals use the supplied National Day Oswald variable font. Noto fonts are retained for National Day/Arabic artwork needs; DIN Next LT Arabic was not supplied.

The Eid Al Etihad lockup comes from the supplied RGB logo PDF. The downloadable packs are represented by 100 unique illustrations, 9 logos, 16 containers/frames and 24 dynamic logo extensions: 149 reusable images. The supplied 25-colour RGB palette is selectable in Event branding and text colour controls. Identical source images are reused by full SHA-256 rather than filename; the originals remain in the uploaded archives. Three latest illustration archives exceeded the 32 MiB transfer limit and remain unverified pending smaller uploads. See [the source inventory](docs/artwork-inventory.json) for source hashes, categories and pending files. Brand source PDFs are not included in the deployable site.

## Page editor

Open **Admin → Page editor**. Select a page, choose an **Artwork category**, search the **Artwork library**, and click **Add element**. Drag an illustration in the frozen preview; drag its bottom-right handle to resize. The element controls also set position, width, rotation, opacity and layer. You can replace its image, duplicate it or remove it. Layouts are independent for each page. The shared design formats are Event LED (768 × 1024, the default), portrait (1080 × 1920) and landscape (1920 × 1080). Publish one format for all devices. Text, artwork, timers and controls use that logical canvas; device dimensions only change its proportional scale. Different screen ratios show extra background space rather than cropping or stretching the composition. Long content extends the logical page and the complete page scales to fit. Preview size simulates desktop, event-screen and mobile device viewports through the same live canvas renderer, so preview and live positions match. Artwork dragging accounts for both preview and canvas scaling. Existing inline text, colour, size, visibility, preview, history and publication controls remain.

Upload PNG/JPEG/WebP images up to 4 MB and 8192 × 8192 pixels. Uploads remain in the design's reusable library. **Save draft** retains private work; **Publish design** shares it with game devices. Draft/history artwork is private. Backups include uploaded images referenced by the design, elements and library. Full backup import is not implemented.

Moving or resizing an existing image sends layout JSON when saving/publishing, not another image upload. Bundled assets and published artwork use immutable URLs and long browser caching. Admin previews reuse private uploaded artwork through session-local blob URLs, including across preview reloads. New images need an initial upload/download; new devices and cleared/evicted browser caches need to download images again. Hosted score saving, settings checks and publishing still require network access. There is no zero-data guarantee for cloud updates.

## Cloudflare deployment

See [the ADCB setup guide](docs/cloudflare-setup.md). Use a **separate Pages project and separate D1 database** from FAB. Only AAIHEX 2026 is shown in the event selector. Existing legacy database rows are retained; the ADCB profile is initialized separately and made live. No production resources are created, reset or deployed by local builds or tests.

## Publishing across devices

Use **Publish design** (or Publish settings) to share amendments; Save draft retains private work. A newly opened game loads the published design. Connected, visible home screens check a tiny version endpoint about every three minutes and reload when a new version is available; refresh a device for immediate application. Active games and retry sequences retain their captured design until returning home, so a publication cannot change the target or difficulty mid-game. No per-device layout edits are needed.

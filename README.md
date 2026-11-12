# FAB Reaction Challenge

A FAB-styled reaction timer with a visual Admin studio and two storage modes.

- **Hosted Cloudflare mode:** D1 stores designs/history/scores and private artwork; a built-in password login protects Admin APIs. Publish remotely and connected games update at home within about three minutes while the registration screen is visible.
- **Local mode:** browser-only storage for development and the self-contained downloadable HTML. This remains the default until `VITE_HOSTED=true` is set in the Pages build.

## Set up live Admin

Follow the [step-by-step Cloudflare setup guide](docs/cloudflare-setup.md). No R2 activation or R2 billing setup is required. It includes the SQL, exact bindings/variables, password-secret configuration, fresh deployment, acceptance checks and optional browser-data transfer. No Supabase is needed.

The code does not create resources in your Cloudflare account. Hosted mode fails visibly if the backend or identity configuration is unavailable; it never silently falls back to local saves. Set `ADMIN_PASSWORD` as a Pages Production secret and use the built-in `/admin` sign-in form. No Zero Trust/Access plan is required.

## Local development and downloadable HTML

Node 24: `npm ci`, then `npm run dev`. Build with `npm run build`; deployable static assets go to `dist/` and Pages Functions live in `functions/`. Cloudflare's build output remains `dist`.

`fab-reaction-timer.html` embeds JavaScript, CSS and the supplied FS Matthew Regular font. Download it from GitHub using **Download raw file** and open it locally. It deliberately stays offline/browser-local even when built with hosted mode enabled. It does not include your remote design or shared leaderboard. File URL behavior depends on browser policy; automated standalone checks serve the identical HTML over local HTTP because the managed browser blocks file URLs.

Admin is available at `/admin` on a development server or deployed site; no link appears in the game. In local mode it has no authentication and does not sync between devices. Cloudflare Pages' default SPA fallback serves `/admin`; do not add a top-level 404.html that disables it. Uploaded local artwork uses IndexedDB; local draft/history/scores use localStorage. Existing local data is preserved when upgrading.

## Editing

See the [Admin amendments guide](docs/admin-amendments.md) for inline editing, font sizes, transparency, artwork, frozen previews, idle presentation and history. In hosted mode, publication is shared across connected devices and writes are protected by server-side revisions. Active rounds keep their captured design version. Only published settings and a top-20 leaderboard showing full names and scores are public. Contact details, full records, drafts, history, uploads and import operations require a valid administrator password session.

Private backups and published-content exports include referenced artwork. Optional migration transfers the old browser's saved design and score IDs; old history remains in its backup. Full backup import is not implemented.

## Validation

`VITE_HOSTED=true npm run build` type-checks frontend and backend and produces both web and standalone outputs. `npm run test:cloud` tests authentication, D1 and independent browsers against the hosted build. `npm test` checks standalone gameplay and editing. Tests need Chromium (`/usr/bin/chromium`, `CHROMIUM_PATH`, or Playwright's installed Chromium). Local backend tests use stable Miniflare 4; Wrangler bundles the production Functions. Credentials are not needed for local tests.

The generated FAB wordmark and colours remain provisional; the supplied brand-guidelines PDF exceeded the transfer limit. Upload approved artwork in Event branding. Only FS Matthew Regular was supplied; bold weights are browser-synthesised.

## Touchscreen registration

Tapping the full-name field opens the game's built-in on-screen keyboard, without relying on Windows or browser keyboard settings. F1 registration requires a full name and consent. Jiu jitsu registration requires a full name, a valid email address, nationality and consent before play. Email format is checked in both the form and the backend, and the email is stored with the score in private reports, daily game data and CSV exports. Only the full name and score appear on the public leaderboard; email and nationality are never published. Phone numbers are not collected. The keyboard includes Shift, symbols, Space, Backspace and Close. For jiu jitsu, Next moves from name to email; email keys include @, .com and .ae. Tapping outside or pressing Escape dismisses it; physical keyboard entry remains supported. The game requests no native mobile keyboard to avoid showing two keyboards together.

The keyboard appears only during registration, closes for idle presentation/gameplay and is disabled in frozen editor previews. It is included in both the hosted game and downloadable HTML; no new Cloudflare settings are needed.

## Display and inactivity
The countdown is white and centred on the game viewport. The running timer uses an embedded seven-segment LED stopwatch display, retaining seconds and three decimal places. Results render without flashing/popping animations, and the leaderboard sits higher in the centre of the screen.

Admin → Settings → Inactivity return controls the automatic return to registration (enabled by default, 60 seconds; configurable 15–300 seconds). Pointer, keyboard, input and scrolling activity resets the timer. Returning clears abandoned participant details, consent and the touch keyboard while retaining completed scores. Active rounds get at least target time + 10 seconds; completed scores awaiting a successful save are retained for retry. Previews do not auto-return. This is separate from the optional idle presentation. No SQL or binding changes are needed.

## Temporary public game pause

The hosted game is paused until 3 November 2026 at 08:00 Asia/Dubai (04:00 UTC). The pause expires automatically; no redeployment is needed to reopen. The pause page does not start API polling. Public gameplay APIs reject requests before accessing D1; the content endpoint returns a pause version so older home screens reload into the pause page. Admin remains accessible. This reduces game/database traffic but does not prevent all Pages Functions invocations from older clients or direct requests. The offline downloadable HTML remains local and does not use Cloudflare. The schedule is defined in `shared/game-pause.ts`.

## Gameplay and network latency

Start begins the local countdown immediately while the hosted round is registered in the background. Stop captures and displays the local stopwatch result immediately while the score saves. Result navigation stays disabled until saving succeeds; a failed save keeps the captured result and offers Retry saving score. Network timeouts never alter the captured time. Hosted registration and a successful save are still required for a shared leaderboard entry. Visible, non-idle registration screens check a tiny version response every three minutes, backing off to fifteen minutes on failures. Full settings are loaded at startup or after a version change; active gameplay and results do not poll.

## Retry sequences

After a result, RETRY immediately starts another countdown with the same registered name. The leaderboard also offers RETRY while that sequence is active. HOME ends the sequence and clears the participant fields; the existing inactivity return also clears abandoned sessions. Each new sequence contributes one leaderboard entry: its closest attempt to the target, with equal scores retaining the earlier result. Existing leaderboard records remain unchanged. Hosted sequences reuse their registered round; worse attempts skip score writes. Best-score updates are atomic in D1 and retrying a save cannot worsen the record.

Gameplay retries remain available during slow or failed saves. The current best unsaved attempt is kept in the open page, saves are serialized, and failed saves retry every ten seconds or via Retry saving score. HOME and leaderboard navigation wait for saving to succeed so the pending result is not discarded. Keep the page open during an outage; unsaved attempts are not guaranteed to survive a reload or closed tab. This reduces API traffic but does not establish or fix a Cloudflare provider/network outage.

## Switching between F1 and jiu jitsu

Hosted Admin has an **Event to manage** selector. Selecting F1 or Jiu jitsu loads that event’s draft, artwork, publication history, reports and saved scores without switching the public game. Save any draft edits before changing the selected event. **Make [event] live** switches the public game to that profile’s published settings and leaderboard. A saved but unpublished draft is not made public by the switch. Games on the registration screen update within about three minutes; active rounds and retries retain their starting event and settings.

F1 stays live after upgrading. Its published design, saved draft and history are copied into its event profile without modifying the original studio or score tables. The new jiu jitsu profile starts with a copy of F1’s published design (event name changed to Jiu jitsu), its own publication history and an empty leaderboard. Change its artwork/text using the existing editor. Settings saved or published for one profile never change the other. Both profiles use the same Pages site, D1 binding and Admin sign-in.

F1’s Admin leaderboard, reports and private backup include current records plus `records_backup_20261103` when present, deduplicated by score ID with current records taking precedence. Use **2 November 2026**, **3 November 2026**, **All saved dates**, or the Dubai date picker to filter the leaderboard CSV. The historical backup is read only; archived results are not added to the public leaderboard. All old, untagged scores belong to F1, while new scores are tagged with their event. Switches never delete or move scores. Private backup filenames identify the selected event and include all its saved records, not just the current date/search filter.

The new schema is bootstrapped additively on the first request; no manual reset or database replacement is needed. `migrations/0004_event_profiles.sql` contains the equivalent table/index additions for manual setup. Local/offline HTML remains a single browser-local game; event profiles are a hosted Admin feature.

## Jiu jitsu daily rollover

The hosted jiu jitsu public leaderboard rolls over at **00:00 Asia/Dubai (UTC+4)**. Each new day starts with the event's best three earlier score entries, then adds that day's players, ranked by absolute difference with completion time and score ID breaking ties. A returning retry sequence appears once on the public board at its best eligible score. The public board displays up to 20 entries. F1 keeps its existing leaderboard behavior.

All saved scores remain in D1. Jiu jitsu retry sequences retain a separate best score per Dubai day, so a retry after midnight cannot replace yesterday's daily history. **Admin → Jiu jitsu → Daily results** offers a date picker, **Download daily game data CSV** (all saved scores played that day) and **Download daily leaderboard CSV** (that day's public top 20, including carried leaders). Past dates show the closing board; today shows the current board. Event-wide reports and private backups include all daily saved scores, including repeated sequences on different dates.

No scheduled deletion or cron is used: the server selects the correct day on every leaderboard read, even if no device was open at midnight. Open jiu jitsu leaderboards refresh at the Dubai midnight boundary. Leaderboards also load when opened, after a successful score save while visible, or when Refresh leaderboard is pressed; there is no ten-second background polling. This runs every day throughout the 13-day event; switching to F1 does not delete or reset the jiu jitsu history. No automatic event end date is imposed. The additional schema is bootstrapped automatically; `migrations/0005_daily_scores.sql` contains its additive tables/index. Existing jiu jitsu records are copied into their completion-date history without changing the originals.

## Nationality selection

Hosted jiu jitsu registration requires a country selection. The searchable dropdown includes 249 ISO 3166-1 countries/territories plus Kosovo, with touch-keyboard search, physical-keyboard navigation and common aliases such as UAE and UK. Choose a result to register it; arbitrary typed text is not accepted. Both the form and backend enforce the requirement. F1/offline registration keeps its existing requirements; historical scores without nationality remain valid.

The selection is saved as an ISO two-letter `nationality` value in the round and score JSON, included in daily histories and private backups, and displayed as a country name in Admin reports and CSV exports. Public leaderboards still publish only name and score. No database migration is needed.

Flags are self-hosted SVG images in `public/flags`, not emoji, so their appearance does not depend on OS flag fonts or external image services. Assets are from **flag-icons 7.5.0**, copyright Panayiotis Lipiridis, distributed under the MIT license retained in `public/flags/LICENSE.txt`. Country labels use English Unicode CLDR region names.

## Low-data operation on SIM routers

Hosted Admin downloads saved scores once at startup or when selecting an event. Use **Refresh saved results** for new scores; focusing the tab or leaving it open no longer downloads the entire history every ten seconds. **Daily results** loads the selected date once and offers **Refresh daily results**. Choosing another date or explicitly downloading a backup/export still retrieves the requested data. Reports and backups retain all existing history.

The public game checks `/api/public/version` at most every three minutes while visible at registration, rather than downloading the full settings every ten seconds. This endpoint returns only event/version IDs and uses one database read without schema/bootstrap writes. Changes apply at registration; refresh the game for immediate application after publishing or switching events. The interval is retained across rounds, so frequent players do not indefinitely postpone the next due check. Hidden tabs and idle presentations do not poll.

Idle home/countdown/stopwatch/result examples render locally in one React page, using only fictional participants and no registration/score calls. There are no rotating iframe navigations or repeated settings downloads. Touch or keyboard activity returns to registration.

Hashed JavaScript/CSS assets are cached for one year, country SVG flags for thirty days, and immutable published artwork keeps its existing one-year cache. Admin HTML, private unpublished artwork and participant JSON remain uncached. Score starts and saves are still sent immediately, with existing serialized retries and pending-result protection. Actual SIM consumption also depends on artwork sizes, browser cache, device count and other router traffic; these changes do not establish the cause of a venue or provider connection outage.

# Live Admin setup — Pages + D1 + a password

You do **not** need R2, Zero Trust, Cloudflare Access, Supabase, a team domain, an email login or a paid-plan activation for this setup. It uses the existing Pages project and a D1 database, subject to Cloudflare's normal free-tier usage limits.

Your workflow is: open `/admin` → enter your password → edit → Save draft or Publish → refresh the main game. Publishing updates shared data without a GitHub push. The game also checks for updates about every three minutes using a tiny version check while at home. Active rounds retain their captured settings until they finish.

## 1. Use your existing D1 database

If you already created `fab-reaction-timer-db`, keep it. Do not delete or reset it.

Open **Storage & databases → D1 → fab-reaction-timer-db → Console**.

- **New database:** open [0001_cloud.sql](https://github.com/curlyordie/fab_reaction_timer/blob/main/migrations/0001_cloud.sql), select **Raw**, copy the SQL, paste into the Console and execute it.
- **Already ran the earlier SQL:** the simplest option is to rerun the latest `0001_cloud.sql`. It uses CREATE TABLE IF NOT EXISTS, so it safely adds any missing artwork/session tables and preserves existing settings, history and scores.
- If you prefer the small updates, run [0002_d1_artwork.sql](https://github.com/curlyordie/fab_reaction_timer/blob/main/migrations/0002_d1_artwork.sql) for artwork and [0003_admin_login.sql](https://github.com/curlyordie/fab_reaction_timer/blob/main/migrations/0003_admin_login.sql) for login. Both are safe to repeat.

If the Console only accepts one statement at a time, run each semicolon-terminated CREATE statement separately. The app also creates missing app tables and seeds the original design on its first successful content request. Startup only adds tables/indexes; it never resets an existing design or score. The SQL remains available for manual setup and checking.

## 2. Connect D1 to Pages

Open **Workers & Pages → your existing Pages project → Settings → Bindings → Production**. Some dashboards put Bindings under Functions.

Add or confirm this one binding:

| Binding type | Variable name | Select |
| --- | --- | --- |
| D1 database | `DB` | `fab-reaction-timer-db` |

Use a **D1 binding**, not a plain-text variable containing the database ID. No R2 binding or API key is needed. Use a runtime compatibility date of `2026-08-01` or later.

## 3. Set your password and enable hosted mode

Open **Pages project → Settings → Variables and Secrets → Production**.

| Name | Type | Value |
| --- | --- | --- |
| `NODE_VERSION` | Plain text | `24` |
| `VITE_HOSTED` | Plain text | `true` |
| `ADMIN_PASSWORD` | **Secret / Encrypt** | Your own strong password, 16–256 characters |

Use a password manager to generate a unique password of at least 24 characters. Enter its value only in Cloudflare's secret field. Do not send it in chat, commit it to GitHub, or name it `VITE_ADMIN_PASSWORD` (VITE_* values are public browser build settings). Keep the password in your password manager so you can sign in later.

You do not need `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` or `ADMIN_EMAIL`. Old values can be removed; the application no longer uses them.

Production is the environment to configure. Leave preview deployments in local mode, or give them a separate test D1 database and password. Do not casually connect production data to previews.

## 4. Stop the old Access setup

Do not activate a paid Zero Trust plan. If you never finished that setup, skip it and continue here.

If you enabled an old Access policy that is intercepting this site, disable/remove it for this Pages project/Admin hostname. The application now supplies its own login. Check **Pages project → Settings → General → Access policy**; if you also created a production application manually, remove its hostname/path protection in the existing Access application. This is only relevant if Cloudflare still displays its own login/setup screen instead of the new FAB password form.

## 5. Redeploy using the new settings

Confirm these Pages build settings:

| Field | Value |
| --- | --- |
| Repository | `curlyordie/fab_reaction_timer` |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Blank |

Save the binding and variables. Open **Deployments** and trigger a fresh deployment of the latest `main` commit using the latest settings/environment variables. Saving variables alone does not rebuild the browser app. Wait for a successful deployment.

Pages automatically includes the repository's `functions/` folder. No Wrangler config needs editing for this dashboard workflow. Do not upload only the downloadable HTML; that file intentionally remains offline/browser-local.

## 6. Sign in and test

1. Open your main site. The game should load normally without a password.
2. Open the same address with `/admin` appended, for example `https://YOUR-SITE.pages.dev/admin`.
3. You should see the **FAB Admin sign in** form. Enter the `ADMIN_PASSWORD` you saved in Cloudflare.
4. After sign-in, the banner should say **Cloud Admin is connected**.
5. Edit the headline, enter a publication note and click Publish.
6. Open the game on another browser or device and refresh it. The new headline should appear. Connected home screens normally apply it automatically after about three minutes; connection loss/background throttling can delay polling.
7. Upload a logo in Event branding, save the draft, preview it, then publish. Confirm it appears in the other browser after refresh.
8. Complete a fictional round. Check Admin → Leaderboard; press Refresh saved results to load new scores without repeatedly downloading the full history.
9. Click **Sign out**. `/admin` should show the password form again. Private `/api/admin/snapshot` must return a sign-in error when you are logged out.

You can now administer remotely: every signed-in browser reads/writes the same database. Save draft does not change the game; Publish does. Code changes still deploy from GitHub.

## Optional: transfer old browser data

Use the **original browser and original site address** where you made local edits. Browser storage is not shared between hostnames or devices.

In hosted **Admin → Backup**:

1. Click **Download old browser backup** and keep the JSON private.
2. Click **Transfer this browser’s design and scores**. It publishes that browser's saved draft as a new shared version and merges score IDs without duplication. Do this before other admins start editing, because it replaces the active cloud design.
3. If it reports a conflict, use Reload saved draft and retry. Check the shared game and scores afterwards.

Old design history remains in the browser backup; it is not all imported into cloud history. Full backup restore is not implemented. Do not clear old website data until you have checked the transfer.

## Password and session behavior

- The password is held as a server secret, not in the HTML or JavaScript bundle.
- Successful sign-in creates a random server session. D1 stores a hash of its token; the browser receives an HttpOnly, Secure, SameSite=Strict cookie restricted to Admin API paths.
- Sessions last eight hours. Sign out revokes the current session. Changing the password secret and redeploying invalidates sessions made with the previous password.
- If your session expires while editing, a login overlay lets you sign in again without discarding the current form edits. Retry the failed save afterwards; revision checks still protect another administrator's changes.
- Sign-in attempts are limited to five per minute per IP and 100 per minute globally. Wait a minute if locked out.
- Requests that save, publish, upload or import are checked on the server and require a same-origin request. Knowing the `/admin` URL does not grant access to private data.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Still shows Local administration demo | Set `VITE_HOSTED=true` in Production and do a fresh deployment. Downloaded HTML deliberately stays local. |
| Cloud setup incomplete | D1 must be bound as `DB`. Save and redeploy. |
| Error after submitting the correct password | Run the latest SQL, especially the `admin_sessions` table from migration 0003. |
| Asks to configure ADMIN_PASSWORD | Create a Production **Secret** named `ADMIN_PASSWORD`, at least 16 characters, then redeploy. |
| Incorrect password | Use exactly the secret you configured; it is case-sensitive. Reset it in Pages and redeploy if forgotten. |
| Too many attempts | Wait one minute before retrying. |
| Cloudflare login/payment screen appears | The old Access policy is still intercepting the hostname; disable that protection. Use the built-in FAB password form. |
| Uploaded image fails | Run the artwork migration; use PNG/JPEG/WebP up to 4 MB and 8192 × 8192 pixels. |
| Draft changed elsewhere | Reload saved draft before editing again; this discards unsaved edits. |
| Could not save score | Keep the game tab open and retry after restoring the connection. Round tokens expire after 15 minutes. |

Artwork is private until published. D1 stores 4 MB uploads as 256 KB BLOB chunks and streams them back. D1/Pages usage limits still apply. Public leaderboards omit contact details; private reports and backups contain participant information and should be handled accordingly. Browser timing is not a verified prize-award system, and no automatic retention/deletion schedule is configured for completed records.

## Developer checks

`npm ci`, then `VITE_HOSTED=true npm run build`, `npm run test:cloud`, and `npm test`.

The hosted suite uses real local D1 and independent browser profiles to verify password sessions, logout/expiry/rotation, sign-in throttling, private artwork, publication conflicts, remote updates, score idempotency and old-browser transfer. The standalone suite validates offline game/editor behavior.

`npx wrangler pages functions build --outdir /tmp/fab-functions --compatibility-date 2026-08-01` bundles the Pages backend. No account credentials are required for these local tests. They do not establish that your live bindings, password secret or deployment are configured; complete the dashboard acceptance checks above.

## Event profiles

After deploying the event-profile update, existing data stays in the same D1 database. The first request creates the additional tables/index and copies the existing studio into the F1 profile. No reset, restore or new database is needed. F1 remains live; Jiu jitsu is prepared separately with a copy of the published design and no scores.

In Admin, **Event to manage** selects which event you edit or export. It does not switch the live site. **Make [event] live** changes the live event. Existing rounds finish under their original event. F1's Admin exports include the preserved `records_backup_20261103` table as well as current F1 results, deduplicated by score ID; the public leaderboard does not include archived rows. The original backup table is never modified by event switching.

Event profiles are stored in `event_profiles`; `game_event_state` selects the live event; `event_design_versions` associates new publication versions with a profile. Existing unmapped publications and scores without an `eventId` are F1. New score JSON and round player JSON include the event ID. The legacy `studio` is retained as the original migration source; Admin now saves to the selected `event_profiles` row. `0004_event_profiles.sql` provides the equivalent additive schema statements if needed manually.

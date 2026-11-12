# ADCB Cloudflare Pages setup

Use a NEW Pages project connected to `curlyordie/adcb-reaction-timer` and a NEW D1 database. Do not deploy to the original FAB project or bind its database.

1. Workers & Pages → Create application → Pages → Connect to Git.
2. Select `curlyordie/adcb-reaction-timer`, production branch `main`.
3. Project name `adcb-reaction-timer`; framework Vite (or None); build command `npm run build`; output `dist`; root blank. Vite is free.
4. Production variables: `NODE_VERSION=24`, `VITE_HOSTED=true`.
5. Create a D1 database named `adcb-reaction-timer-db` under Storage & databases.
6. In the NEW Pages project's Production bindings, add D1 binding **DB** selecting that NEW database. This is a database binding, not a plain-text variable.
7. Add Production secret **ADMIN_PASSWORD**, 16–256 characters. Choose a unique password in a password manager; enter it securely in Cloudflare. Never use a VITE_ prefix for secrets.
8. Functions compatibility date: `2026-08-01` or later.
9. Redeploy after saving bindings, variables and secrets. Saving settings alone does not rebuild the app.
10. Open the new site and `/admin`. Sign in; the banner should say **Cloud Admin is connected**. The only event is **AAIHEX 2026**. Test both stages and refresh Admin saved results.

The backend bootstraps the schema additively. Do not reset a database to fix setup. SQL migrations remain available for inspection/manual setup. No R2, Supabase, Zero Trust, Access plan or external API key is needed. Cloudflare plan usage limits still apply.

On upgrading the original copied build, the new ADCB event is initialized independently. Historical F1 and jiu jitsu rows are kept but are not offered in the new selector. New ADCB scores store both stage times in the existing JSON record structure; no destructive migration is needed. The original source application, live database contents and custom production uploads are separate from this repository.

Drafts, uploads, backups and private participant records require an Admin password session. Published settings/artwork and a redacted leaderboard are public. Sessions use secure HttpOnly cookies, password rotation invalidates sessions, and mutations require same-origin requests. Use an independent test database/password for preview deployments.

Common issues:

- **Cloud setup incomplete:** confirm DB is a D1 binding on this project's Production environment, then redeploy.
- **Local administration demo:** set VITE_HOSTED=true and rebuild; the standalone HTML deliberately stays local.
- **Admin password error:** set a 16–256 character ADMIN_PASSWORD secret and redeploy.
- **Old appearance:** refresh the new site's main page; connected registration screens normally check for new publications every three minutes. Previously active games retain their captured settings.
- **New artwork needs data:** each device must download a new image once. Existing artwork/layout changes reuse cached files. Do not promise offline cloud score saving.

No automatic deployment or account-resource provisioning is performed by the build scripts.

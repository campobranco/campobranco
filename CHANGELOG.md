## 1.0.49 - 2026-11-27

- Internationalization (pt-BR, en, es): translated settings, admin panels, reports, registry (S-13-E), map card (S-12-E), dashboard, login, notifications, witnessing, my-maps, shared list, visit report/history modals, reference points, share setup, legal pages (terms, privacy, data usage, user commitment, open source, about, contact), no-congregation and request-congregation screens.
- Added searchable language picker (LanguagePickerModal) to the login screen, reused from Settings.
- Language files kept in 100% key parity (1395 keys), validated by `npm run i18n:check`.
- Bumped package version to `1.0.49` (Android versionCode 34).
## 1.0.14 – 1.0.48 - 2026-11-25 to 2026-11-27

> Grouped entry: patch versions in this range were not individually tagged. Summary reconstructed from commits.

- Maps: switched Leaflet tiles to CartoDB Voyager with API key fallback; CSP updated for CARTO.
- Maps: Waze/Google Maps selector, pins and popups remain interactive when the map is locked.
- Shared lists: internal share links use `router.push` instead of `window.open`; snapshot coordinates synced.
- Visits: access to visit history, last-cycle status, gender badges/icons on shared pins; gender hidden for Traditional congregations; direct click to edit address.
- i18n base (pt-BR, en, es), automatic Waze/Maps links, geocoding improvements and environment fixes.
- CI: production AAB auto-uploaded to the Google Play internal track.

## 1.0.13 - 2026-11-25

- Updated RBAC, settings, reports and Firestore rules; added k6 load test.

## 1.0.0 - 2026-11-23

First official (non-beta) release.

- Fixed Capacitor app icon/URLs and added Android App Links; release signing, AAB build and `assetlinks` configured.
- Reports: removed `new Date(0)` fallback that produced ~20781 idle days on unworked maps.
- Addresses: allow removing the DNV mark and approving without visit dependency; city map centered on congregation location; fixed address count label.
- CI: made the androguard patch dynamic for modern fdroidserver packaging.

## 0.11.23-beta – 0.11.87-beta - 2026-08-07 to 2026-11-16

- Android: APK build pipelines (canary and production) decoupled; self-hosted multi-environment F-Droid repositories with auto-deploy; dynamic application id; app version synced from `package.json`; Capacitor assets and app icon.
- CI: Node 22 and Java 21 (Capacitor 8); npm install in Playwright workflow; fixes for androguard/fdroidserver packaging; artifact names include app version; `.env.production` leak prevented.
- Security: keystores removed from Git tracking for open-source compliance; hardcoded F-Droid keystore password removed; security hardening updates.
- Maps: Leaflet migrated from CDN to NPM to fix SSR memory leaks; city map centering fix.
- Sharing: `NEXT_PUBLIC_APP_URL` used to avoid localhost links in Capacitor.
- Auth: Google sign-in fixes (native auth, fixed debug keystore); `useAppIcon` hook moved before early returns.
- Sentry organization slug updated to `campobranco`.

## 0.9.69-beta – 0.11.22-beta - 2026-07-13 to 2026-08-07

- Audit: audit log coverage with structured schema; automatic return of expired territory assignments (client-side trigger).
- Validation: strict mandatory-field checks and enums for visit statuses and user roles; removed string fallbacks; open links no longer require `assignedTo`/`assignedName`.
- Congregation type: category read directly from Firestore (`TRADITIONAL` / `SIGN_LANGUAGE`), legacy values migrated, `SIGN_LANGUAGE` resolution fixes in shared lists, preview and visit modal.
- Shared lists: deterministic snapshot IDs, deduplicated items, inactive addresses filtered out.
- Settings/header: active congregation badge in header and member management.
- UI: dark mode fixes (modals, tokens, `ThemeContext` localStorage/SSR guard); mobile-first header and S-13 registry screen; default link validity set to "Never expires".

## 0.9.44-beta – 0.9.68-beta - 2026-06-18 to 2026-07-13

- Security: multi-tenant isolation, blocked self-promotion, Next.js upgraded to mitigate vulnerabilities.
- Invites: no automatic congregation transfer, friendly block message, payloads respecting Firestore rules.
- Territories: "mark all addresses as worked" on territory return.
- Auth: unauthenticated users redirected to login in `AuthReadyGate`; Firestore rules and admin bootstrap fixes.
- Dashboard: visit history isolated per congregation for the global admin; address formatting fixes.
- Tooling: `next.config` migrated to ESM, Jest config renamed to `.cjs`, Playwright E2E against the Firebase emulator, Node 22 and JDK 21 in workflows.
## 0.9.43-beta - 2026-06-18

- Security hardening: isolated collections by `congregationId` in Firestore rules.
- Removed hardcoded admin backdoor email.
- Restricted public reads on sensitive collections.
- Added `sanitizeUrl` helper to block dangerous URL protocols.
- Updated update rule syntax for `users` collection.
- Bumped package version to `0.9.43-beta`.

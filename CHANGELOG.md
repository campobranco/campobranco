## 1.0.49 - 2026-11-27

- Internationalization (pt-BR, en, es): translated settings, admin panels, reports, registry (S-13-E), map card (S-12-E), dashboard, login, notifications, witnessing, my-maps, shared list, visit report/history modals, reference points, share setup, legal pages (terms, privacy, data usage, user commitment, open source, about, contact), no-congregation and request-congregation screens.
- Added searchable language picker (LanguagePickerModal) to the login screen, reused from Settings.
- Language files kept in 100% key parity (1395 keys), validated by `npm run i18n:check`.
- Bumped package version to `1.0.49` (Android versionCode 34).
## 0.9.43-beta - 2026-06-18

- Security hardening: isolated collections by `congregationId` in Firestore rules.
- Removed hardcoded admin backdoor email.
- Restricted public reads on sensitive collections.
- Added `sanitizeUrl` helper to block dangerous URL protocols.
- Updated update rule syntax for `users` collection.
- Bumped package version to `0.9.43-beta`.

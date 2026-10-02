# Repository Guidelines

- Generic and shared helpers live in `/src/lib/utils`, grouped by concern where useful (for example `formatting`, `media`, and `stats`).
- Feature-owned behavior lives beside its feature. Server infrastructure lives in `/src/lib/server/core`; frontend presentation and browser
  integrations live in `/src/lib/client`.
- Shared media definitions own media characteristics and allowed statuses; server definitions own persistence, ingestion, and editable-field
  policy. Keep server dependencies out of shared definitions and utilities.
- Keep tests beside their modules and use direct imports when moving code; do not leave forwarding modules at the old paths.
- Do not build the project unless explicitly asked.
- Create tests only when they are necessary.
- Avoid creating functions that are used only once when possible. First look for an existing function that already works or can be lightly
  modified to support the use case.
- Do not use overly defensive programming. Add checks where necessary; otherwise, trust the types.
- Prefer the smallest change that fixes the root cause. Do not add fallback logic when an enforced data invariant is enough.
- After creating the feature, fix, refactor, etc. give me the name of the commit using a conventional commit message.

- For troubleshooting authenticated pages with existing dev data, use the normal dev server (`bun run dev`) and open
  `/login` at the configured `VITE_BASE_URL` (default `http://localhost:3000`) in the browser you control. Sign in with
  `browser@example.invalid` / `BrowserDevPassword!`. Create this persistent, verified user once with `bun run dev:user`
  if it does not exist. This command uses the database configured in `.env`; use it only with the local dev database.
  The account has the normal `user` role, so private profiles still require permission. Changes through this server persist
  in the dev database. Prefer this workflow for troubleshooting existing users and media. Stop any dev server you started when finished.

- Automated browser tests use `bun run test:e2e`. Stop any dev server you started when finished.

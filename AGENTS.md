# Repository Guidelines

- Generic and shared helpers live in `/src/lib/utils`, grouped by concern where useful (for example `formatting`, `media`, and `stats`).
- Feature-owned behavior lives beside its feature. Server infrastructure lives in `/src/lib/server/core`; frontend presentation and browser
  integrations live in `/src/lib/client`.
- Shared media definitions own media characteristics and allowed statuses; server definitions own persistence, ingestion, and editable-field
  policy. Keep server dependencies out of shared definitions and utilities.
- Keep tests beside their modules and use direct imports when moving code; do not leave forwarding modules at the old paths.
- Do not build the project unless explicitly asked.
- Match the existing web app's readable code style in every change, including mobile code: use four-space indentation, spaces around
  operators and inside object literals/destructuring, and blank lines between logical sections and top-level declarations.
- Write expanded JSX with nested elements and their content on separate, indented lines. Put multiple or complex props on separate
  lines. Expand callbacks, conditionals, option arrays, and configuration objects when they contain multiple steps or nested structures;
  do not compress components or several statements onto one line. Use nearby web components as the reference. Running a formatter is
  not enough: inspect the result and manually split dense code until it is as readable as the web implementation.
- In mobile code, put static styles in named `StyleSheet.create` definitions and reuse existing shared styles where appropriate.
  Compose state variants with style arrays; keep inline values only when they depend on runtime data, measurements, animation, or
  caller-provided overrides. Use descriptive names for styles rather than numbered variants.
- For mobile UI changes and features, check the corresponding web app implementation first. Keep labels, colors, formatting,
  and visual conventions close to the web app, and verify mobile layouts over ADB when a phone is available.
- Treat mobile responsiveness as a requirement: virtualize long lists, keep per-keystroke JavaScript work small, and avoid unrelated
  refetches. Use device measurements before claiming frame-rate or latency improvements.
- Create tests only when they are really necessary.
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

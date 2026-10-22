# MyLists mobile

Native Android and iOS app using Expo / React Native. Web keeps its server functions; mobile owns its HTTP endpoints and React Query
options/mutations. Both clients reuse backend services. Admin and imports remain web-only.

## Implemented core

- Authenticated Profile, Lists, Search, and Settings tabs with native stack screens.
- Profile identity/background, privacy explanations, social counts/actions, media levels, last three achievements, follows feed, highlights,
  and paginated recent feed.
- Lists & collections hub with tracking presets, continue, searchable dynamic lists/collections, and paginated detail screens.
- Advanced statistics using the web domain services, loaded per media type with monthly activity, status breakdowns, and affinities.
- All six tracking lists with server-side search, status/favorite filters, sorting, pagination, and pull-to-refresh.
- Provider search (TMDB, IGDB, Google Books, manga), catalog resolution, and media details.
- Add/remove media, status, score/feeling ratings, favorites, notes, page/chapter/hour progress, TV season/episode progress,
  season ratings/rewatches, game platform, and repeat counts. Progress reductions preserve the web's explicit monthly-history correction
  flow.
- Username/privacy, active lists, score/feeling system, auto-move preference, release notification preferences, password changes, and
  sign-out.
- Expo UI controls (SwiftUI on iOS, Compose on Android): buttons, text fields, native selection menus, switches, grouped settings, and
  privacy sheets.
  MyLists media blocks and large virtualized lists stay in React Native. A single Host policy applies the dark appearance and emerald tint;
  media icons use Lucide. Registration/recovery use the website; they do not automatically sign the native client in.

This is the core implementation, not full web parity. Collections/dynamic-list editing, other-user profiles,
release calendar/inbox/native push, advanced filters and remaining statistics visualizations, profile image uploads/customization, media
tags/custom
covers, account deletion, trends, games, year recaps, and native social login remain separate feature work. There are no placeholder
buttons pretending those flows exist.

## Structure and boundaries

- `app/(tabs)/`: persistent tabs with independent stacks. Shared array routes keep details in the originating tab; sign-in lives outside the
  tabs.
- `src/components/`: thin Expo UI form adapters, the native Host appearance policy, MyLists media blocks, and loading/error states.
- `src/features/`: profile, lists, media tracking, search, settings, and authentication screens.
- `src/lib/react-query/query-options/`: mobile query keys, request definitions, and pagination.
- `src/lib/react-query/query-mutations/`: mutation hooks and cache invalidation.
- `src/lib/api-client.ts`: native session-cookie transport; response/input types inferred with type-only backend imports.
- `src/theme.ts`: native equivalents of the web dark palette, domain/status colors, and spacing.
- Backend `src/lib/server/mobile/` and `src/routes/api/mobile/`: isolated mobile response composition and routes.

The native bundle imports no web components, server functions, or database code. Root aliases and server ambient types in mobile's
TypeScript configuration support erased type-only references. Removing mobile requires deleting its app, API directories, and workspace
configuration; web profile functions require no migration. Catalog search is a shared domain operation used by both transports.

## Data loading and performance

Queries run for the focused screen, so inactive tabs retain their cache/scroll state without refetching after every edit. Lists and activity
use virtualized `FlatList` rows and 30-item server pages; search is debounced and cancellable. Expo Image uses disk/memory caching and
recycling keys. Related/community graphs are not fetched for the mobile details screen. Small profile sections load through separate
screens. Successful mutations invalidate affected caches; correction previews do not invalidate them. Writes are not automatically retried
or silently queued while offline. Query caches are cleared when the signed-in account changes.

`getItemLayout` is intentionally omitted because rows support wrapping and system font scaling. Actual scrolling/frame rate and memory
still need measurement on physical devices in a release build; development Metro timings are not production benchmarks.

Mobile endpoints derive account identity from the verified session, validate mutations with backend schemas, require JSON writes, reject
foreign browser origins, and return private/no-store responses. Internal image URLs are origin-relative for LAN development; provider
images keep their external origins. Dates exposed to native clients use ISO UTC strings.

The Better Auth endpoints remain `/api/auth/*`. Expo stores the session cookie in SecureStore, namespaced by backend URL. Native auth
ignores browser `session_data` cache cookies to prevent renewal/refetch loops while preserving session-token and OAuth cookies. Normal
requests time out after 15 seconds; provider catalog resolution allows 45 seconds.

## Prerequisites

- Bun for workspace dependency installation; run `bun install --frozen-lockfile` at the repository root.
- A Node.js version supported by Expo SDK 58 (`^22.13.0`, `^24.3.0`, or 26+). Expo commands run through Node; do not force them through Bun
  with `--bun`.
- An Android phone for device testing.
- Expo Go for the initial email/password login test. A development build is needed later for native configuration and social sign-in
  validation.

The Android SDK is **not needed for cloud builds** or for running Metro. It is needed for `bun run android` and an Android emulator. This
project installs no SDK or JDK.

## Connect your phone to the backend

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to the backend origin reachable from your phone.
   Never put secrets in `EXPO_PUBLIC_*` variables.
2. For local development, connect both devices to the same Wi-Fi and use your computer's LAN address, for example
   `http://192.168.1.10:3000`. The phone's `localhost` refers to the phone.
3. Start the backend from the repository root, listening on the LAN while keeping its canonical development URL on localhost:

   ```bash
   VITE_BASE_URL=http://localhost:3000 bun run dev --host 0.0.0.0
   ```

4. Confirm that this address opens in your phone's browser. Allow the backend and Metro ports through your local firewall if necessary.
5. Use an existing verified development account. If needed, run `bun run dev:user` once, **only against the local development database**.
   The repository's development account is `browser@example.invalid` / `BrowserDevPassword!`.

`VITE_BASE_URL` and `EXPO_PUBLIC_API_URL` serve different purposes here. Keep `VITE_BASE_URL=http://localhost:3000` for the backend's
canonical auth/MCP URLs; the MCP plugin rejects non-loopback HTTP resource URLs. The native app still connects over the LAN address in
`EXPO_PUBLIC_API_URL` and explicitly sends its session cookie. This setup supports native email/password login; test browser recovery
links on the PC, or use a shared HTTPS origin for browser/OAuth flows on the phone.

HTTP is permitted in development builds for local testing. Preview and production profiles require HTTPS. If using a tunnel, configure the
backend's `VITE_BASE_URL` and the app's `EXPO_PUBLIC_API_URL` to that HTTPS origin. Expo's Metro `--tunnel` option tunnels Metro only, not
the MyLists backend.

## Quick test with Expo Go (no build or Android SDK)

After configuring the backend address and starting the backend as above, run from the repository root:

```bash
bun run dev:mobile
```

This explicitly targets Expo Go. Scan the QR code using the scanner inside Expo Go on Android. The terminal should say `Using Expo Go`, and
the link should start with `exp://`. If an older server is already running with `Using development build`, press `s` in that terminal to
switch targets, or stop it with Ctrl+C and restart.

The phone and computer must be on the same Wi-Fi, and Expo Go must support the project's Expo SDK 58. If it reports an SDK mismatch, use a
compatible Expo Go version from <https://expo.dev/go> or a development build. Email/password login can be tested here; social callbacks and
native app configuration still need a development build. Better Auth's Expo server plugin allows Expo Go origins only when the backend runs
in development mode.

If QR scanning opens nothing, check the launch target first. If the app opens but cannot connect, confirm that the backend URL opens in the
phone's browser. `bun run dev:mobile --tunnel` can help with Metro connectivity but does not expose the backend.

## Cloud development build (no Android SDK)

Run these commands from `apps/mobile` when ready to create a native build:

```bash
bunx eas-cli login
bunx eas-cli init
bunx eas-cli build --platform android --profile development
```

Initialization links the app to your own Expo project. Before a cloud build, configure `EXPO_PUBLIC_API_URL` as a non-secret/plain-text
variable in the EAS **development** environment, using the same origin as your local mobile `.env`. Local ignored `.env` files are not a
substitute for cloud environment configuration. Review the app identifiers (`app.mylists.mobile`) before the first store submission.

Install the resulting development APK on your phone, then run from the repository root:

```bash
bun run dev:mobile:client
```

Open the development client and connect using Metro's QR code. Keep Metro and the backend running while testing. Stop both servers when
finished. A new development binary is needed when native dependencies/configuration change; ordinary screen edits use Metro's refresh.

## Local Android build (SDK required)

Install a compatible JDK and Android SDK, configure `ANDROID_HOME`, enable USB debugging, and confirm the phone appears in `adb devices`.
Then, from `apps/mobile`:

```bash
bun run android
```

Local builds without an EAS profile use development network settings. Production builds should always use the explicit EAS `production`
profile. The `preview` profile also disallows HTTP.

## Checks and device acceptance

From the repository root:

```bash
bun run typecheck
bun run typecheck:mobile
bun run test src/lib/server/mobile src/lib/server/domain/search/catalog-search.test.ts apps/mobile/src/lib/api-client.test.ts apps/mobile/src/lib/auth-fetch.test.ts src/lib/server/core/auth.test.ts
```

From `apps/mobile`, run `bunx expo install --check` and `bunx expo-doctor` to verify dependency/configuration compatibility. These commands
do not build the app.

On Android, check valid/invalid credentials, unverified email errors, password visibility/autofill, keyboard scrolling, session restoration
after force-closing, session revocation, unavailable backend/retry, and sign-out. Repeat the authentication flow on iOS before release;
Android testing does not validate iOS behavior. Check profile images over the LAN, each of the six list types, search cancellation,
pagination/filter reset, media add/edit/remove, season
ratings/rewatches, activity correction choices (including stale previews), settings persistence, keyboard handling, large text,
offline/retry,
Android back navigation, account switching/cache isolation, and password/session changes. Repeat on iOS. Native visual/device validation
and release profiling are required before calling the app release-ready.

EAS project registration, native builds, device validation, store publication, and OTA delivery are not performed by adding this scaffold.
OTA can be configured after the native development flow is validated.

## Navigation timing on your Android phone

In development, navigation via `useTabPush` prints one `[nav-timing]` JSON report to the Metro terminal after a three-second capture window.
No native rebuild or additional package is needed. To save logs for the next review, restart Metro from the repository root with:

```bash
bun run dev:mobile 2>&1 | tee /tmp/mylists-mobile-navigation.log
```

Reload Expo Go, open Profile, tap Following, and wait four seconds. Go back, repeat the
same screen three times, then try Followers and a tracking list. Keep the first-open report as well as the repeat reports. The reports are
saved in `/tmp/mylists-mobile-navigation.log`; alternatively, copy the full `[nav-timing]` lines from Metro for analysis.

The report records navigation dispatch, native-stack transition event callbacks, React commits/render duration, screen layout callbacks,
and a subsequent JavaScript animation-frame callback. Following/Followers also marks when cached or fetched data is ready. Its Profile
buttons record `press-in`; time between that and `navigation-requested` includes how long your finger was held down and is not navigation
lag. Request durations include cookie retrieval, fetch, and JSON decoding; unfinished requests have no duration/outcome yet. Query strings,
cookies, response bodies, and credentials are not logged.

These are development diagnostics: JS callbacks can be delayed, and a frame callback does not prove pixels were displayed. Compare the gap
from `navigation-requested` to the first commit/transition/layout with request timings; do not treat total transition duration as input lag.
A release build comparison is still needed before drawing conclusions about production performance. To disable logging and render profiling,
start Metro with `EXPO_PUBLIC_NAV_TIMING=0 bun run dev:mobile` from the repository root and reload the app.

## Android navigation findings and Expo UI acceptance

The first five captured Profile → Following/Followers trials showed 199–308 ms from navigation dispatch to the first destination commit.
Two trials made no API request and still took 244/308 ms. Requests in the other trials started after mount and took 59–80 ms. This rules out
waiting on the social API as the cause of the initial pause. Transition callback intervals were 477–499 ms; those are JS-delivered event
observations, not precise native animation or display measurements. The cause of the pre-mount delay is still unconfirmed. The extended
`navigation-tree-*` profiler events measure React work outside the destination's Page subtree for the next comparison.
The `screen-render:<route>:<phase>` events include outgoing screens as well as the destination, so their render durations can be compared
within the same commit. These durations overlap the navigation-tree measurement and must not be added to it. Global route subscriptions in
`useTabPush` and focus subscriptions on Profile were candidates for outgoing work.

The next four traces confirmed 90–101 ms spent rerendering the outgoing Profile during the initial navigation commit, with 149–186 ms
for the navigation tree and 200–235 ms from dispatch to destination commit. This identifies a contributor, rather than accounting for all
latency. `useTabPush` now reads the tab navigator on press without a global route subscription, and Profile/Extras keep their expensive
presentation behind memo boundaries while focus still controls their queries. Repeat the same phone tests and compare the outgoing
`screen-render:/index:update` duration and dispatch-to-commit gap. Improvement on the device has not yet been verified.

After installing dependencies, restart Metro and reload Expo Go. Expo UI is included in SDK 58 Expo Go; a custom development client built
before this dependency was added needs a new native build. Check first/repeated navigation timings, Android picker labels and dropdowns,
settings scrolling and toggle persistence, privacy-sheet dismissal/back handling, and pending/disabled/destructive buttons. For text entry,
check email autofill, password visibility, Next/Go keyboard actions, typing without cursor jumps, external clears after saving, numeric
progress,
and multiline notes. Validate these on iOS separately before release. Production performance requires a release-build comparison.


## Profile and Community navigation

The persistent bottom navigation contains Profile, Lists, Search, and Community. Settings opens from the Profile cog and remains in that
stack. Profile has scrollable section tabs above its content: Profile, Achievements, My stats, My activity, and Release
calendar. Its taller identity/follow header scrolls with the Profile overview and stays out of the other sections. Only the selected section mounts its data readers; switching sections reuses the React Query cache. The overview uses a compact level/percentage media-list grid, a Continue preview, switchable Recent feed/Follows feed tabs with shared
compact rows, and highlighted media. Achievements loads its latest three completions separately from the
catalog. The calendar is a month-by-month agenda of releases from active supported lists, with media filtering.

Connections uses top tabs for Followers, Following, Follow requests, and Sent requests. Community is currently a native navigation hub:
Trends, Platform stats, Hall of fame, Community collections, Taste matches, Moviedle, and Which came first open their existing web pages in
the system browser. These links are labeled accordingly; native implementations of those sections are future work, and browser sign-in is
separate from the mobile session.

On the phone, check every profile/connection tab, scrolling to the last tab, month changes and calendar filtering, pull-to-refresh, the
Profile cog and Android back behavior, and the persistent bottom bar while opening lists/media. Check that Community links open the
expected web pages. Restart/reload Expo Go after the route-group rename.


Activity and tracking/collection lists default to cover grids, with a list toggle. Activity covers are loaded in batches per media type;
deleted titles keep their updates with an empty cover. Both profile feeds show saved old/new payload values. Follows-feed avatars open a
native visitor profile; the shared profile authorization policy runs before any private content is loaded. The author’s rating preference
is used when formatting their updates.

Media Details displays allowlisted type-specific metadata without fetching the web app’s community/similar-media graph. Tracking has its
own tab with grouped status/rating/favorite, progress, notes, and collapsible season controls. Per-field saves only appear for edited drafts;
activity-correction previews and confirmed removals use the existing mutation flow. Check native accordions, avatar navigation/private
profiles, both grid/list modes, numeric/notes drafts, TV season edits, and correction decisions on Android and iOS.

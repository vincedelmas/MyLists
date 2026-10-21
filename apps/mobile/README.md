# MyLists mobile

Expo / React Native app for Android and iOS. The first slice supports existing-account email/password sign-in, secure session persistence,
server-verified session restoration, sign-out, and a read-only profile. The profile shows your identity, follow counts, summary statistics,
active media lists, highlighted titles, and recent activity, with pull-to-refresh and loading/retry states. Registration, password recovery, and other sign-in methods can be opened on the website;
they do not sign the native app in automatically. Social sign-in and collection screens are not implemented yet.

## Structure

- `app/`: Expo Router entry points and authenticated navigation guards.
- `src/features/auth/`: login and session loading/retry.
- `src/features/profile/`: the authenticated profile screen and native presentation.
- `src/lib/`: native Better Auth client, mobile HTTP client, and React Query provider.
- `src/lib/react-query/query-options/`: mobile query keys and request definitions.
- `src/lib/react-query/query-mutations/`: native mutation hooks, including sign-in and sign-out.
- `src/theme.ts`: shared native colors and typography.

The app calls the existing Better Auth HTTP endpoints at `/api/auth/*`. It imports no web components, server functions, or database code.
The backend trusts the `mylists://` scheme. The client uses the backend's `mylists` cookie prefix and stores cookies in SecureStore, with
storage separated by backend URL. Session restoration checks the server rather than trusting a cached user profile. Better Auth's Expo
plugin also handles app focus/network changes.

The native auth transport ignores the browser's `session_data` cache cookies. Otherwise, each server-verified read renews that cookie,
which makes the Expo client refetch the session repeatedly. Session-token rotation and OAuth cookies are preserved. Requests have a
15-second timeout that also applies when Better Auth supplies its own cancellation signal.

The mobile profile uses authenticated endpoints at `/api/mobile/v1/profile` and `/api/mobile/v1/profile/activity`. They expose only the
signed-in account's data, deriving the account ID from the verified session. The first response includes identity, follow counts, selected
summary statistics, active list summaries, and overview highlights. Activity loads independently and has its own retry state. The mobile
API does not fetch the web's achievements, followed-user feed, or continue settings.

Web keeps its server functions and its own query options. Both entry points reuse existing services and authorization capabilities;
neither client depends on the other's transport. Mobile response types are inferred through type-only imports from
`src/lib/server/mobile/profile.ts`; server modules never enter the native runtime bundle. The mobile TypeScript configuration resolves
root aliases and server ambient types for that inference. API dates are ISO UTC strings and internal image paths are origin-relative,
resolved against the native backend address for LAN development.

To remove mobile later, remove `apps/mobile`, `src/routes/api/mobile`, `src/lib/server/mobile`, and the mobile workspace/scripts. The shared
request-user helper remains generic server infrastructure, and web profile functions require no migration.

Native profile requests explicitly attach the cookie provided by the Expo auth client. React Query handles request cancellation, a
15-second timeout, one retry for temporary failures, focus refresh, and pull-to-refresh. Its cache is recreated when the signed-in account
changes, including logout. Profile editing and links into media lists, followers, or media details are later slices.

## Prerequisites

- Bun for workspace dependency installation; run `bun install --frozen-lockfile` at the repository root.
- A Node.js version supported by Expo SDK 58 (`^22.13.0`, `^24.3.0`, or 26+). Expo commands run through Node; do not force them through Bun
  with `--bun`.
- An Android phone for device testing.
- Expo Go for the initial email/password login test. A development build is needed later for native configuration and social sign-in validation.

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

This explicitly targets Expo Go. Scan the QR code using the scanner inside Expo Go on Android. The terminal should say `Using Expo Go`, and the link should start with `exp://`. If an older server is already running with `Using development build`, press `s` in that terminal to switch targets, or stop it with Ctrl+C and restart.

The phone and computer must be on the same Wi-Fi, and Expo Go must support the project's Expo SDK 58. If it reports an SDK mismatch, use a compatible Expo Go version from <https://expo.dev/go> or a development build. Email/password login can be tested here; social callbacks and native app configuration still need a development build. Better Auth's Expo server plugin allows Expo Go origins only when the backend runs in development mode.

If QR scanning opens nothing, check the launch target first. If the app opens but cannot connect, confirm that the backend URL opens in the phone's browser. `bun run dev:mobile --tunnel` can help with Metro connectivity but does not expose the backend.

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
bun run test apps/mobile/src/lib/auth-fetch.test.ts src/lib/server/core/auth.test.ts src/lib/server/mobile/profile.test.ts apps/mobile/src/lib/api-client.test.ts
```

From `apps/mobile`, run `bunx expo install --check` and `bunx expo-doctor` to verify dependency/configuration compatibility. These commands
do not build the app.

On Android, check valid/invalid credentials, unverified email errors, password visibility/autofill, keyboard scrolling, session restoration
after force-closing, session revocation, unavailable backend/retry, and sign-out. Repeat the authentication flow on iOS before release;
Android testing does not validate iOS behavior. For the profile, check avatar/background loading over the LAN, populated and empty lists,
ratings, recent activity, pull-to-refresh, unavailable backend/retry, and switching accounts without showing the previous profile.

EAS project registration, native builds, device validation, store publication, and OTA delivery are not performed by adding this scaffold.
OTA can be configured after the native development flow is validated.

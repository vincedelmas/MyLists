# Execution and verification

This is a direct rewrite plan. Each phase changes the real call path, updates its
callers, and deletes the superseded code. There is no v2 namespace, compatibility
endpoint, feature flag, shadow query, or dual write.

The phases are ordered to keep the application coherent and reviewable, not to
run two architectures at once. A phase is complete only when its old code is
gone and the affected behavior is verified.

## Phase 0: freeze behavior in contracts and tests

Before structural edits, record the invariants which the rewrite must preserve:

- access-policy tests for public headers and public/restricted/private library
  content;
- collection visibility tests independent of profile channel state;
- family progress transition, activity, history, and statistics tests;
- import idempotency and exact progress/backdating tests;
- default-book-cover atomic update tests;
- anonymous external resolution and ingestion tests;
- representative details/list contract fixtures for all five family shapes;
- manager catalog-edit authorization and validation tests.

This phase does not create an old/new comparison harness. It adds behavioral
tests around the one implementation that will be edited.

Also inventory current production activity payload JSON. Add the migration for
`old_value/new_value` to `oldValue/newValue` here if the data is understood; do
not wait until the UI adapter has been deleted.

## Phase 1: remove proven forwarding layers

Make no response-shape changes in this phase.

1. Replace `UserUpdatesService` and `ProfileUpdatesReadService` with
   `ProfileUpdatesQuery` and update callers/tests.
2. Rename the legitimate `ProfileReadService` composition to
   `ProfileOverviewQuery`.
3. Split inactive-account target/admin reads from warning/deletion commands and
   remove its forwarding service.
4. Split other mixed services only where the current method inventory proves a
   read/write mixture. Do not perform a repository-wide rename campaign.
5. Split `UserService` into account, settings, deletion, admin-account, and
   profile-view capabilities. Remove duplicate legacy social methods.
6. Expose the new capabilities from the container and delete old aliases.

Acceptance: each affected server function reaches the class that contains the
actual query or workflow in one jump.

## Phase 2: establish concrete family commands

For TV, movie, game, book, and manga:

1. merge the writer dispatch and library service rules into `XLibraryCommands`;
2. keep pure progress calculations as family functions with focused tests;
3. keep repositories limited to persistence;
4. send interactive mutations and imports through the same commands;
5. make entry/progress, history, activity, and stats one transaction;
6. make the server function or a very thin exhaustive switch dispatch by family;
7. remove `XLibraryWriter`, `XLibraryService`, and the business role of
   `LibraryCommandService` after their callers move.

Then move catalog-to-library reconciliation out of catalog repositories into
typed catalog edit/refresh commands. Confirm with a dependency search that no
repository constructs a service or command.

Acceptance: selecting one family update in a server function leads directly to
one family command, then persistence. Provider/import parsing remains upstream.

## Phase 3: make contracts explicit

1. Define shared Zod contracts for details, list pages/filters, library-entry
   commands/results, community projections, and catalog edit.
2. Add `kind` to every family result at the query that creates it.
3. Replace property-presence extraction types with discriminated unions.
4. Normalize historical activity payload JSON and remove `toLegacyUpdate`.
5. Change `Payload.tsx` and history/activity consumers to the canonical camelCase
   shape.
6. Replace the catalog `z.record(z.string(), z.any())` schema with a family
   discriminated union and typed backend commands.

This is a direct contract change: update server and client callers together. Do
not add a compatibility DTO or keep both field names.

Acceptance: incorrect family fields fail type-checking and schema validation;
no server function adds a discriminator with a cast.

## Phase 4: TV/anime vertical proof

Convert the most complex media family first:

1. `TvDetailsQuery` and the explicit `TvDetailsPage` using `DetailsLayout`;
2. `TvProgressEditor` in the shared library-entry shell;
3. `TvListView`, typed TV columns, and TV filter schema;
4. `TvCatalogEditForm` and typed TV catalog command;
5. series/anime route discrimination while sharing the TV implementation;
6. TV community activity, followed-user cards, upcoming/coming-next behavior,
   jobs, and metadata reconciliation.

Exercise season/episode transitions, partial seasons, rewatches, completion,
changed provider totals, exact imports, comments/tags/covers, and private list
access. If the shared layouts cannot express TV without casts or escape hatches,
fix the layout now; do not hide the complexity in a generic registry.

At the end of this phase the real TV/anime routes use the new structure and the
old TV entries in `media-config.ts` are deleted.

## Phase 5: convert the other families

Convert one family per coherent change, using the proven layout but retaining
its concrete behavior:

1. movies: duration, watched/completed, rewatches, and upcoming metadata;
2. games: playtime, platform, engines/compatible platforms, and game filters;
3. books: pages, authors, rereads, exact imports, and default-cover contribution;
4. manga: chapters, nullable totals, authors, and rereads.

For each family, convert details, entry editor, list/card/table/filters, catalog
edit, and related query options together. Delete that family's old config and
casts immediately. Do not wait for a final big-bang cleanup.

Acceptance per family: there is one exhaustive route branch, all family-specific
fields remain visible/editable, and no old config path can render it.

## Phase 6: finish supporting projections and container cleanup

1. Type community activity, followed entries, similar media, community
   collections, contributor/job pages, history, and compatible platforms.
2. Confirm profile overview, list headers/tabs, stats, activity, achievements,
   hall of fame, taste matches, trends, coming-next, and notifications consume
   the canonical contracts.
3. Organize React Query keys and mutation invalidation by command effects.
4. Flatten the container to product capabilities and remove duplicate aliases.
5. Remove `media-config.ts`, `MediaComponent.tsx`, obsolete extraction types,
   generic catalog field rendering, unused writers/services/repositories, and
   family-boundary casts.
6. Run Knip only after all direct conversions so it identifies real dead code.

## Feature preservation matrix

The rewrite is incomplete if any row loses behavior.

| Area | Behavior to preserve | Required verification |
| --- | --- | --- |
| Authentication | Anonymous, signed-in, manager/admin, impersonation, account lifecycle, settings/password/delete | Route tests for each required session and role |
| Settings/onboarding | General and profile settings, list activation, custom profile, walkthrough, data export, password/delete, and existing product feature availability | Form/route tests plus enabled-channel persistence and export fixture checks |
| Admin step-up | Normal admin session plus shared step-up password | Dashboard entry and expiry test; no account switching required |
| Public headers | Username/profile shell, follow relationship/count aggregates, enabled types and aggregate time where currently shown | Anonymous header test for public, restricted, and private accounts; no private member rows in response |
| Library audience | Public anonymous; restricted authenticated; private owner/accepted follower; administrator operational access | Matrix tests on list, details follow data, activity, stats, and social member endpoints |
| Disabled channels | Hide family list-derived content without deleting data | Disabled list/details-entry/stat/activity tests; collection and catalog tests remain visible |
| Collections | Public global, restricted through owner audience, private owner/manager; likes, copy, item management | Query and mutation tests independent of channel state |
| Catalog resolution | Trends/search can open absent provider media through anonymous ingestion | External-ID deduplication and anonymous details test |
| Details | Hero, synopsis, provider URL, family metadata, upcoming alert, extras, similar, viewer entry, followed users | Contract and rendered-route test per family |
| Details extras | Community activity, community collections, jobs/contributors, history, compatible game platforms | Independent query/Suspense/error tests |
| TV/anime | Season/episode, statuses, season/full rewatches, changed totals, series/anime channel separation | Transition table plus reconciliation/import tests |
| Movies | Status/watch, rewatches, duration/stat reconciliation | Command and catalog-refresh tests |
| Games | Status, playtime, platform, compatible platforms | Command, list filter, details, and stats tests |
| Books | Pages, rereads, authors, exact imports, default-cover contribution | Progress/import/edit plus atomic cover race test |
| Manga | Chapters, nullable totals, rereads, authors | Progress and catalog-reconciliation tests |
| Common entry data | Rating, comment, favorite, tags, custom cover, remove, history, backdating | Shared contract tests exercised through every family command |
| Lists | Search, current sorts, statuses, genres, tags, family filters, paging, grid/table, quick add/edit | URL round-trip and rendered list tests per family |
| List header tabs | List, stats, activity, tags, collections, achievements | Navigation/access test with active and disabled channels |
| Imports/exports | Provider parsers, mappings, exact progress, idempotency, CSV export | Existing provider fixtures plus repeated-import test |
| Discovery/social | Search, trends, hall of fame, taste matches, follows/followers, feed | Query contract and access tests |
| Notifications | Social notifications and deduplicated upcoming-media notifications | Command/deduplication/read-state tests |
| Admin/media ops | Overview, catalog/collection/user management, catalog edit/refresh/candidates, API monitoring/history/logs, scheduled tasks, inactive accounts, and achievements | Authorization and workflow tests |
| Games/features | Mediadle, Which Came First, feature votes, platform stats | Existing game/feature route tests remain green |
| Cache isolation | Viewer-sensitive details, lists, profile, activity, and social data | Query-key tests and session-change cache-clear test |

## Verification loop

Use focused checks while each phase is in progress:

1. affected unit and route tests;
2. `bun run test` with a single worker if memory pressure requires it;
3. `bun run lint`;
4. TypeScript/build checks for the affected server and client bundle;
5. `bun run knip` after dead code is expected to be gone;
6. database migration rehearsal on a disposable production copy, followed by
   `PRAGMA foreign_key_check` and activity-payload sampling.

Do no run `bun run build` or any build commands until the rewrite is complete.

Manual smoke tests should cover anonymous, ordinary authenticated, accepted
follower, owner, manager, and admin sessions. Use at least one entry from every
family, with TV/anime covering both simple and multi-season progress.

## Final removal audit

Before declaring the rewrite complete, searches should find none of the
following outside an explicitly documented low-level exception:

- repositories constructing `*Service`, `*Commands`, or another aggregate's
  workflow;
- `UserUpdatesService`, `ProfileUpdatesReadService`, family writers, or the old
  family library services;
- `MediaComponent` or component-bearing `mediaConfig`;
- family inference based on optional property presence;
- `Record<string, any>` catalog payloads or `Object.entries()`-generated catalog
  forms;
- `as any` at media list, details, filter, or editor family boundaries;
- both camelCase and snake_case activity payload fields;
- container aliases maintained solely for old callers;
- feature flags, shadow reads, dual writes, or compatibility response shapes.

Completion means the real application uses the new path, all behavior in the
matrix is verified, and the replaced path has been deleted.

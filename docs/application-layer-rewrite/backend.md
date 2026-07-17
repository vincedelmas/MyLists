# Backend rewrite

This document applies the rules in the [rewrite overview](README.md) to the
current server code. The database ownership and visibility model remain those
defined in [Media architecture](../media-architecture.md).

## Boundary rules

### Server functions

A server function owns transport work only:

1. parse and validate route/form input;
2. obtain the current session;
3. enforce authentication or manager/admin requirements;
4. resolve an account/library/collection access scope when the use case needs it;
5. invoke one query or command;
6. apply cache headers/invalidation and map expected errors.

It must not assemble family records, perform progress transitions, or patch a
missing discriminator onto an untyped response.

Authorization is intentionally not identical for every endpoint. Public profile
and list headers use the public-header policy. Library content, comments, social
member lists, and owner-scoped activity use the resolved account audience.
Collection queries use collection visibility. The policy must be selected by
the use case rather than by a global "private profile" check.

### Queries

A query returns the shape needed by one page or operation. It may compose
multiple reads and may execute Drizzle directly. Do not introduce
`SomeReadRepository` under a query if that repository would only mirror its
methods and has no other consumer.

Queries may depend on narrow reusable readers, such as catalog identity lookup,
social counts, or access-scope resolution. They may not mutate data. A page query
may run independent reads concurrently after authorization has been resolved.

### Commands

A command is the transaction and invariant boundary. It may coordinate multiple
repositories, notification writers, activity/history recording, statistics,
image storage, or provider refreshes. The command decides sequence; repositories
only perform persistence operations.

Interactive library updates and imports must call the same family command. This
preserves progress rules, stats, history, and activity regardless of entry point.
Import-specific parsing and provider ID resolution stay before the command.

### Repositories

Repositories may depend on the database client and persistence utilities. They
must not construct or call a query, command, service, provider client, or another
aggregate's workflow. A repository may compose a small reusable persistence
helper such as common library-entry CRUD, but the helper must not contain use-case
orchestration.

This specifically removes the current direction in which movie catalog admin
and ingestion repositories, and TV ingestion, create library services to
reconcile user entries.

## Concrete cleanup decisions

| Current code | Target | Reason |
| --- | --- | --- |
| `UserUpdatesService` -> `ProfileUpdatesReadService` -> `ProfileUpdatesRepository` | `ProfileUpdatesQuery` | Two layers are pure forwarding and do not protect an invariant |
| `ProfileReadService` | `ProfileOverviewQuery` | Its parallel composition of profile, social, updates, stats, highlights, and achievements is a real page use case |
| `ProfileHighlightsReadService` | `ProfileHighlightsQuery` | Keep if it owns the highlight projection; inline it only if the overview is its sole caller and the logic stays readable |
| `SocialGraphReadService` | `SocialGraphQuery` | It separates the public counts/status header from audience-protected member lists and validates the owner scope |
| `SocialGraphCommandService` | `SocialGraphCommands` | Follow, unfollow, and response workflows own cross-row invariants and notification effects |
| `InactiveAccountService` | Direct lifecycle queries plus `InactiveAccountCommands` | Most methods currently forward. Warning/deletion workflows are commands; target selection and admin overview are queries |
| `NotificationsService` | `NotificationsQuery` and `NotificationCommands` | Upcoming-media deduplication is behavior worth keeping; simple reads should not share an ambiguous service |
| `FeatureVotesService` | `FeatureVotesQuery` and `FeatureVoteCommands` | The current class contains real vote/status/notification rules, but mixes reads and writes |
| `UserService` | Account/admin/settings/view capabilities | It currently combines unrelated account settings, admin users, deletion, profile views, last-seen, search, and legacy social methods |
| `XLibraryWriter` + `XLibraryService` | `XLibraryCommands` | The writer dispatch and service rules form one mutation boundary |
| `LibraryCommandService` | Thin typed family dispatch, or explicit endpoint switch | It should not be another business layer. Shared cover-file preparation can remain a helper at the command boundary |
| `XDetailsReadService` | `XDetailsQuery` | Keep the details-page composition, but remove unrelated pass-through operations from the class |
| `CatalogManagerEditService` | Typed family catalog commands | `Record<string, unknown>` parsing hides family rules and permits invalid combinations |

These changes are not a quota to rename every class. `AchievementsService`,
games, WCF, feature votes, notifications, stats, and discovery must be classified
by their actual methods. A mixed class is split; a real orchestrator stays; a
forwarder disappears.

## Library commands by family

Each family command owns add, update, remove, import, custom cover, and tag
operations that are valid for that family. Common mechanics can be extracted as
plain helpers or a narrow `LibraryEntryRepository`, but progress remains
concrete.

### TV and anime

`TvLibraryCommands` receives `SERIES` or `ANIME` as a discriminant and owns:

- season and episode progression;
- status transitions derived from progress;
- season rewatches and full rewatches;
- handling changed episode/season totals after provider refresh;
- history/activity/stat changes in the same transaction;
- exact import values and backdated activity.

This is the first frontend/backend integration slice because it exercises the
hardest progress model. It is not a base class for the other families.

### Movies

`MovieLibraryCommands` owns watched/completed transitions, rewatches, duration
effects on statistics, and catalog-duration reconciliation.

### Games

`GameLibraryCommands` owns playtime, platform, status, and playtime-derived
statistics. It must not pretend game progress is a generic numeric counter.

### Books

`BookLibraryCommands` owns pages, rereads, exact imports, and total-page
reconciliation. Global default-cover contribution stays a separate
`BookCoverContributionCommand`, because it changes catalog data rather than the
user's library entry.

### Manga

`MangaLibraryCommands` owns chapter progress, rereads, and the valid absence of
a total chapter count. It must not inherit the book page model.

All families preserve rating, comment, favorite, custom cover, tags, deletion,
history, backdating, activity, and statistics. Common fields do not imply common
progress behavior.

## Catalog edit, ingestion, and reconciliation

Catalog persistence and user-library reconciliation are two aggregates. The
workflow belongs above both repositories:

```text
CatalogRefreshCommands / XCatalogEditCommands
  1. validate typed family input and authorization
  2. snapshot the values needed to compute library deltas
  3. persist catalog metadata through XCatalogRepository
  4. invoke XLibraryCommands.reconcileCatalogMetadata(...)
  5. commit the catalog, library, stats, and history effects atomically where possible
```

Provider clients and transformers continue producing canonical ingestion data.
An `XCatalogIngestionRepository` may upsert catalog rows, but it cannot instantiate
`XLibraryService`. The catalog refresh command coordinates the upsert and
reconciliation.

Manager editing uses a discriminated input schema. Family commands receive a
typed payload and repositories receive already validated values. Image-cover
storage can be a shared command helper. Structured metadata such as authors,
genres, jobs, platforms, engines, episode totals, pages, and chapters stays
family-owned.

Anonymous `resolveExternalMedia` remains allowed to invoke ingestion when a
provider item is absent. That command must still validate the media family,
deduplicate provider identity, and return the canonical catalog ID.

## Read models

### Details

`TvDetailsQuery`, `MovieDetailsQuery`, `GameDetailsQuery`, `BookDetailsQuery`, and
`MangaDetailsQuery` return the final discriminated details model. Each query may
compose:

- catalog details and provider link;
- the viewer's library entry;
- accepted-follow data visible to the viewer;
- similar media.

The `kind` is included by the query contract. The server function can use an
explicit exhaustive switch. Repeating five clear calls is preferable to a
registry with an unsafe common return type.

Community activity, community collections, contributor/job pages, library
history, and game-compatible-platform reads remain separate queries because the
current details page loads some of them independently through prefetch/Suspense.
Do not make the initial details query a giant payload merely to make it look
unified.

### Lists

Each family list query accepts common paging/sorting/status/search input plus its
own validated filters and returns a discriminated list page. The access scope is
resolved before list rows, comments, or tags are queried. The public list header
remains a separate query and remains available when the content is not.

List queries may return a frontend-oriented projection. That is not a leak from
the repository layer; producing a stable page model is their purpose.

### Profile updates and activity payloads

Choose camelCase as the canonical application contract:

```ts
type LibraryChangePayload = {
    oldValue: unknown;
    newValue: unknown;
};
```

Run a one-time data migration for historical JSON containing `old_value` and
`new_value`, then remove `toLegacyUpdate` and update `Payload.tsx` to consume the
typed canonical shape. If production data prevents an immediate migration, one
mapper may temporarily live inside `ProfileUpdatesQuery`; it must have a named
removal migration and must not be wrapped in another service.

## Account and profile decomposition

Replace the current `UserService` surface with use-case capabilities:

- `AccountQuery`: current account data, username availability, and account-facing
  reads;
- `AccountSettingsCommands`: username/profile/settings/password-related writes;
- `AccountDeletionCommands`: the complete self-deletion workflow;
- `AdminAccountsQuery` and `AdminAccountCommands`: admin listing, overview,
  update, and deletion;
- `ProfileViewCommands`: record/deduplicate profile views if this remains a
  distinct mutation;
- `ProfileOverviewQuery`: private/audience-aware overview composition;
- `PublicProfileHeaderQuery`: intentionally public header data.

Delete old follow/unfollow/respond methods from `UserService` and its repository
once all callers use the social graph commands. There must be one social
implementation, including the database self-follow constraint.

## Container

The container constructs dependencies but should expose product capabilities,
not implementation taxonomy. A target shape is:

```ts
app.profile.overview
app.profile.updates
app.social.queries
app.social.commands
app.library.commands[MediaType]
app.media.details[MediaType]
app.media.lists[MediaType]
app.media.community[MediaType]
app.catalog.edit[MediaType]
app.catalog.refresh
app.collections.queries
app.collections.commands
app.providers.registry
app.imports.registry
```

This is illustrative, not a requirement to create a nested facade for every
line. If a stateless query has no dependencies, importing it directly is
acceptable. The container must not publish the same instance through
`services`, `features`, and another alias, and it must not exist to preserve old
call-site names.

## Transactions and side effects

- A library command transaction covers the entry/progress mutation and its
  history, activity, and statistics deltas.
- Follow commands cover both relation state and notification changes.
- Catalog metadata reconciliation covers catalog and affected library/stat
  changes where the database permits one transaction.
- File storage cannot be rolled back by SQLite. Prepare/validate the image before
  the transaction and delete orphaned files on failure where practical.
- Notifications and email jobs which are intentionally eventual should be
  recorded transactionally as work, then delivered outside the transaction.
- Repositories do not start hidden nested workflows.

## Backend completion criteria

- No public class exists solely to forward the same method name and arguments.
- No repository imports or constructs a command/service.
- Every media write reaches one concrete family command from both interactive
  and import entry points.
- Details and list results have an explicit `kind` without server-function casts.
- Catalog edit payloads are family schemas, not `Record<string, any>`.
- Authorization is selected by use case and enforced before private rows load.
- Historical activity JSON has one documented shape and no legacy adapter.
- Container call sites name the capability they use.

# Media architecture

The follow-up application-layer and frontend work is specified in
[Application-layer and media UI rewrite](application-layer-rewrite/README.md).

The application uses one direct media implementation. There is no v1/v2 runtime
switch, dual write, shadow read, or feature flag. Database migration `0055`
backfills the canonical model and cuts the application over; migration `0056`
removes the old media, list, activity, settings, statistics, and collection
tables.

## Product boundaries

The media domain is split by responsibility rather than by a generic base media
service:

- `domain/media/<family>` is the vertical slice for a media family. It owns that
  family's catalog, library, imports, provider normalization, achievements,
  activity projection, module composition, and optional product capabilities.
- `domain/media/shared` contains mechanisms reused by multiple families without
  choosing media-specific policy.
- `domain/collections` owns editorial collections independently from personal
  list channels.
- `domain/imports` maps provider records and delegates writes to the same concrete
  library rules used by interactive mutations.
- API clients and provider transformers form the external-data boundary.
  Transformers normalize raw provider responses into a canonical snapshot for
  one media family; that family's ingestion repository persists the snapshot.
  Import matching and CSV row schemas are composed by the same media module.
  Resolving external media may intentionally ingest a missing catalog item for
  an anonymous details request.

TV and anime share catalog and progress mechanics where their behavior is truly
the same, while remaining distinct media channels. The other families keep
concrete progress and metadata rules. New behavior should be added to the
concrete capability that owns it; do not introduce a lowest-common-denominator
media abstraction.

## Media module composition

The container assembles one concrete capability module for each `MediaType` and
publishes them through a single immutable, type-indexed registry. A module owns
its catalog queries and commands, library queries and commands, external
provider and ingestion pipeline, import matcher and schema, achievement policy,
activity projection, and any optional product capabilities. Repositories remain
private to the module composition unless an operational capability must be
exposed.

The family setup functions and registry live under `domain/media`. The core
container remains the application composition root and supplies each family
only the external API clients it requires.

Common capabilities with the same contract, such as library history, may be
dispatched directly through `registry.get(mediaType)`. Family-specific payloads,
such as progress updates and list query arguments, remain discriminated and use
exhaustive narrowing. The registry is composition, not a replacement base media
service.

### Capability ownership

The module object is the capability matrix. Required capabilities can be called
directly:

```ts
registry.get(mediaType).library.read.getUserMediaHistory(userId, mediaId);
```

Optional capabilities exist only on participating modules and are discovered
from registry values. There is no second list that must be kept in sync.

| Capability | Owning modules |
| --- | --- |
| Catalog edit, ingestion, refresh identity, maintenance | All |
| Library commands, reads, CSV, stats, tags, covers | All |
| Imports, achievements, activity | All |
| Coming next | Series, anime, movies, games |
| Upcoming notifications | Series, anime, movies |
| Which Came First | Series, anime, movies, games, manga |
| Mediadle | Movies |

A media module owns decisions such as editable fields, popularity thresholds,
refresh permission, notification deduplication, CSV columns, stat contribution,
and achievement definitions. Shared code may provide a reusable mechanism—for
example cover storage, the stats rebuild engine, or a bound catalog projection—
but receives the media-owned policy or data source through composition.

Cross-media services and scheduled tasks orchestrate capabilities obtained from
the registry; they do not inspect family tables or select a family repository.
An exhaustive switch is still appropriate at a transport boundary when a
discriminated request contains genuinely different family payloads.

### Vertical layout

Each family uses the same navigational vocabulary where applicable:

```text
domain/media/<family>/
├── <family>-media.module.ts
├── catalog/
├── library/
├── imports/
├── external/
├── achievements/
├── activity/
└── features/
```

Provider transformers emit the snapshot type owned by that family's catalog.
CSV and list-import schemas are owned by the corresponding `imports` slice.
The global import domain retains job orchestration, parsing, generic matching,
and reusable validation primitives such as `import-list-validation.ts`.

## Canonical persistence

`catalog_item` is the global identity for every media item. Provider IDs are
attributes of that identity, not IDs accepted by library or collection writes.
Family-specific catalog tables hold only their additional metadata.

`library_entry` is the identity for a user's relationship to a catalog item.
Concrete progress tables, tags, history, and `library_activity` attach to that
entry or catalog identity. `profile_media_channel` controls whether a personal
list family is active without deleting its data.

`editorial_collection`, `editorial_collection_item`, and
`editorial_collection_like` are a separate aggregate. Disabling a personal list
channel does not hide or invalidate collections.

## Visibility rules

Profile and list headers are intentionally public. They expose the identity and
aggregate information needed by the header UI, but not list entries, comments,
followers, or follows.

Personal library data uses the account audience:

| Account audience | Who may read library data |
| --- | --- |
| Public | Everyone |
| Restricted | Authenticated users |
| Private | The owner and accepted followers |

Administrators retain operational access. A disabled `profile_media_channel` hides
list-derived content for that media family. Access decisions are resolved before
repositories return private library rows; callers do not fetch broad results and
filter them afterward.

Collections use their own visibility:

| Collection visibility | Who may read it |
| --- | --- |
| Public | Everyone, regardless of owner account privacy or list channels |
| Restricted/profile-only | The audience allowed by the owner's account |
| Private | The owner; managers may access it for moderation |

## Commands and catalog contribution

All interactive and import mutations write only the canonical tables and record
canonical activity/history. Family command services validate their concrete
progress invariants—for example TV season positions and rewatches, game platform
and playtime, and book/manga progress totals.

Authenticated users may replace a book's global catalog cover only while it is
still the default cover. The database update uses that condition atomically, so
two contributors cannot overwrite each other. Managers retain unrestricted
catalog editing.

The admin dashboard continues to use the shared administrator step-up password
on top of the administrator's normal signed-in account.

## Frontend contract

Routes and mutations use canonical catalog IDs. Audience-dependent React Query
keys include the current viewer identity, and session changes clear the cache so
data from one audience cannot be reused by another. The UI consumes the direct
backend contracts; there is no compatibility request path or frontend rollout
flag.

## Migration and verification

- `0055_direct_catalog_cutover.sql` completes canonical backfill and constraints.
- `0056_remove_v1_media_tables.sql` drops the obsolete persistence model
  child-first to preserve SQLite foreign-key safety.
- Rehearse these migrations on a disposable copy of production data and require
  an empty `PRAGMA foreign_key_check` before deployment.
- Verification uses TypeScript, ESLint, the single-worker Vitest suite, and Knip.
  The production database file must never be used as the migration rehearsal
  target.

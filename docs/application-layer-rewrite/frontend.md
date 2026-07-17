# Frontend rewrite

The frontend should keep generic URLs and shared visual composition while making
the media family explicit in data and behavior. The goal is not five copied
applications and not one universal media component. It is one route shell that
branches once into concrete, type-safe family features.

## Current problem

`src/lib/client/components/media/media-config.ts` currently couples four
different axes:

- details title, metadata, upcoming, and extra-section components;
- the current user's library-entry editor and followed-user card;
- community labels;
- list cards, columns, and filters.

`MediaComponent.tsx` then selects a React component by string. Family extraction
types infer a kind from the presence of fields such as `gameEngine`, `playtime`,
`currentSeason`, `pages`, or `chapters`. The list and filter layers use `as any`
where that inference no longer proves the relationship.

This is compile-time evidence that the abstraction boundary is wrong. The fix
is an explicit contract and an explicit family branch, not a smarter generic
registry.

## Shared contracts

Create a shared contract area, for example `src/lib/contracts/media/`, containing
Zod schemas and their inferred TypeScript types. Do not derive the public UI
contract from `ReturnType<typeof someServerFunction>` and do not infer a family
from optional properties.

The top-level details result is a discriminated union:

```ts
type MediaDetailsPage =
    | TvDetailsPage
    | MovieDetailsPage
    | GameDetailsPage
    | BookDetailsPage
    | MangaDetailsPage;

type TvDetailsPage = {
    kind: MediaType.SERIES | MediaType.ANIME;
    media: TvDetails;
    userMedia: TvLibraryEntry | null;
    followsData: TvFollowEntry[];
    similarMedia: MediaSummary[];
};
```

Lists, library-entry mutations, community projections, and catalog edit requests
follow the same rule. The discriminator is required and agrees with the route
parameter and catalog item. Parse it at the network boundary in development and
where untrusted payloads enter.

Use an exhaustive switch with `assertNever` at the family boundary. A typed map
is acceptable only for homogeneous static capabilities such as labels, icons,
or common status text. React components, forms, arbitrary filters, and family
data types do not belong in one global metadata object.

## Details page

Keep the route `/details/$mediaType/$mediaId`. Its job is loading, access-neutral
page orchestration, prefetch, and selecting the concrete view:

```tsx
switch (details.kind) {
    case MediaType.SERIES:
    case MediaType.ANIME:
        return <TvDetailsPage details={details} />;
    case MediaType.MOVIES:
        return <MovieDetailsPage details={details} />;
    // games, books, manga
    default:
        return assertNever(details);
}
```

The family page composes a shared `DetailsLayout` with typed slots rather than
asking `MediaComponent` to look up strings. Useful shared primitives include:

- hero/cover and page title;
- main/sidebar layout;
- synopsis;
- provider link;
- similar-media section;
- collections controls and community collections;
- followed-user section;
- community activity shell;
- add-to-list, disabled-channel, and anonymous locked states;
- manager refresh/edit affordance.

The family owns its over-title, under-title, information cells, upcoming alert,
extra sections, and the typed progress editor. For example, the TV page knows
about seasons, episodes, air dates, networks, and contributor jobs; the game page
knows about platforms, engines, playtime, and compatible platforms.

Keep community activity and community collections as separately prefetched
queries/Suspense sections. They do not need to be forced into the initial details
payload. Preserve contributor/job pages and external-provider resolution routes.

## Library-entry editor

The current `UserMediaDetails` family dispatch should become a shared shell plus
a typed family progress component. The shell owns behavior that is genuinely
common:

- status and rating;
- favorite;
- comment;
- tags;
- custom cover;
- update history and backdating;
- remove from list;
- pending/error/optimistic mutation state.

It receives one of these progress slots:

- `TvProgressEditor`: season, episode, rewatches, and TV transitions;
- `MovieProgressEditor`: watched state and rewatches;
- `GameProgressEditor`: playtime and platform;
- `BookProgressEditor`: current page and rereads;
- `MangaProgressEditor`: current chapter, nullable total, and rereads.

The same typed feature is reused from the details sidebar and the list
edit/modal path. Do not create separate mutation rules in those screens. The
server command remains authoritative; client transition helpers are presentation
and immediate validation only.

## Lists

Keep one generic list route and one route-search controller for:

- public header versus protected content;
- URL parsing;
- paging;
- grid/table selection;
- common search, status, sort, and ownership state;
- header tabs for list, stats, activity, tags, collections, and achievements.

After the list result is loaded, branch to `TvListView`, `MovieListView`,
`GameListView`, `BookListView`, or `MangaListView`. Each view owns its item card,
typed table columns, and family filters. It may reuse `ListLayout`,
`TypedTable<T>`, pagination, applied-filter chips, and grid primitives.

Separate common filters from family filters in the schemas:

```text
common: page, perPage, search, status, sort, genres, tags
TV:     language/network/TV-specific metadata
movie:  movie-specific date/runtime metadata
game:   platforms/engines/developers or other existing game filters
book:   authors/language/page-related metadata
manga:  authors/chapter/publication metadata
```

The exact set remains the set currently supported by each family query; this is
an ownership split, not permission to remove filters. A family schema must not
contain irrelevant optional fields just to satisfy a universal type.

`MediaTable` becomes `TypedTable<T>` after the family branch, so its
`ColumnDef<T>[]` and rows have the same `T`. The completion criterion is removal
of `columns as any` and filter-record casts, not merely relocating them.

Preserve quick add, own-entry editing, comments, ratings, tags, custom covers,
grid/table modes, every current sort, pagination, and the disabled-channel
notice. The public list header must still render when private/restricted/channel
rules hide the content.

## Catalog editing

Replace the generic `Object.entries(apiData.fields)` form with a discriminated
catalog-edit contract and concrete forms:

- `TvCatalogEditForm`;
- `MovieCatalogEditForm`;
- `GameCatalogEditForm`;
- `BookCatalogEditForm`;
- `MangaCatalogEditForm`.

They may share typed controls for cover URL/upload, name, synopsis, date,
nullable number, lock state, and structured relation pickers. Each family owns
field order, labels, help text, coercion, and structured arrays. Boolean and
number conversion happens in the Zod schema, not in an ad hoc submit handler.

One route and one endpoint can remain. They switch on `kind` and submit the exact
family payload. Manager authorization remains at the server boundary. The
authenticated default-book-cover contribution is a separate UI/action and must
not be confused with manager editing.

## Query and cache ownership

React Query option factories should be organized by product use case and accept
the discriminated inputs directly. Audience-dependent keys include viewer
identity or the resolved audience token as they do today, and session changes
continue clearing audience-sensitive cache entries.

Mutation success updates or invalidates all projections affected by the command:

- details viewer entry;
- list pages and header aggregates;
- profile activity and stats;
- history;
- coming-next/upcoming notifications when applicable;
- collections only when a collection command changed them.

Do not create a universal "invalidate everything media" helper. Each command
should export or document its affected query keys. Broad invalidation is allowed
as a temporary correctness measure during one direct conversion, then narrowed
before that conversion is complete.

## Suggested frontend shape

This is a navigation guide, not a mandatory empty-folder scaffold:

```text
src/lib/contracts/media/
  details.ts
  lists.ts
  library.ts
  catalog-edit.ts

src/lib/client/features/media-details/
  DetailsLayout.tsx
  MediaDetailsPage.tsx
  tv/TvDetailsPage.tsx
  movies/MovieDetailsPage.tsx
  games/GameDetailsPage.tsx
  books/BookDetailsPage.tsx
  manga/MangaDetailsPage.tsx

src/lib/client/features/library-entry/
  LibraryEntryPanel.tsx
  tv/TvProgressEditor.tsx
  movies/MovieProgressEditor.tsx
  games/GameProgressEditor.tsx
  books/BookProgressEditor.tsx
  manga/MangaProgressEditor.tsx

src/lib/client/features/media-list/
  ListLayout.tsx
  TypedTable.tsx
  tv/TvListView.tsx
  movies/MovieListView.tsx
  games/GameListView.tsx
  books/BookListView.tsx
  manga/MangaListView.tsx

src/lib/client/features/catalog-edit/
  CatalogEditPage.tsx
  tv/TvCatalogEditForm.tsx
  movies/MovieCatalogEditForm.tsx
  games/GameCatalogEditForm.tsx
  books/BookCatalogEditForm.tsx
  manga/MangaCatalogEditForm.tsx
```

Do not move a file just to match this tree. Move it when its owner and contract
are established, update all callers, and delete the old dispatch in the same
change.

## Frontend completion criteria

- Every server-client media page model has a required `kind`.
- Details, lists, entry editing, and catalog editing branch exhaustively by
  family at one visible boundary.
- `media-config.ts` no longer stores React components, columns, filters, and
  editors together; `MediaComponent.tsx` is removed.
- Property-presence family inference is removed.
- There is no `any` or unsafe assertion at a family boundary, table column/row
  relationship, filter schema, or catalog-edit field.
- Shared components describe layout or common behavior and accept typed slots;
  they do not dynamically locate family behavior.
- Series/anime prove the architecture supports the most complex family before
  the simpler families are converted.
- All current details, list, progress, community, collection, provider, and
  manager-edit capabilities remain reachable.

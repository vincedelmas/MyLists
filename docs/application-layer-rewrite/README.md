# Application-layer and media UI rewrite

Status: architecture decision and execution specification. This document does
not describe a second runtime implementation and does not authorize a v1/v2
compatibility layer.

The canonical database and domain rewrite in [Media architecture](../media-architecture.md)
is the foundation. The next rewrite should simplify the code between that model
and the UI, then give each media family an explicit frontend boundary. Provider
clients, transformers, provider registries, external resolution, and import
parsers remain in place unless a concrete defect is found while moving a caller.

## Outcome

The finished application should have three easy-to-follow paths:

```text
read:  server function -> query -> database
write: server function -> command -> repository -> database
UI:    route -> discriminated page model -> family page/view/editor
```

A query may use Drizzle directly. It does not need a repository whose only job
would be forwarding the same arguments to one query. A repository exists when
there is a meaningful persistence boundary or reusable data access primitive.

The intended result is not fewer files at any cost. It is fewer places to look
to understand one behavior, one owner for each invariant, and frontend types
which prove which media family is being rendered.

## Verified diagnosis

This proposal was checked against the current server functions, container
modules, domain classes, media details route, list route and components, catalog
editor, schemas, imports, and application scripts.

| Current behavior | Finding | Decision |
| --- | --- | --- |
| Profile updates | `UserUpdatesService` delegates to `ProfileUpdatesReadService`, which delegates to `ProfileUpdatesRepository` | Collapse to one `ProfileUpdatesQuery`; keep a separate deletion command only if it contains a real workflow |
| Profile overview | `ProfileReadService` coordinates profile, social header, updates, stats, highlights, and achievements | Keep the composition and rename it `ProfileOverviewQuery` |
| Library writes | `LibraryCommandService` dispatches to a family writer, which calls a family service, which calls a repository | Merge each writer and service into one concrete family command |
| Catalog reconciliation | Movie catalog admin/ingestion and TV ingestion repositories construct library services | Move the cross-aggregate workflow to catalog commands; repositories must not invoke services |
| Details reads | Each family details service composes catalog data, viewer entry, followed-user entries, and similar media | Keep that useful composition as a family details query; split unrelated pass-through methods |
| Frontend dispatch | `media-config.ts` is simultaneously a details renderer, list renderer, editor registry, filter registry, and type system | Remove component dispatch from the global registry and branch explicitly at a typed family boundary |
| Frontend types | Family types are inferred from property presence and repaired with casts such as `columns as any` | Introduce shared discriminated contracts with a required `kind` |
| Catalog editing | The request is `Record<string, any>` and the UI renders `Object.entries()` as generic inputs | Use an explicit schema and explicit form for every family |
| Activity payloads | New writes use `oldValue/newValue`, while reads adapt to `old_value/new_value` | Normalize stored JSON once, expose one typed shape, and remove the legacy adapter |
| Container | Dependencies are exposed through broad `services`, `features`, `repositories`, and `library` buckets | Expose capabilities by use case so callers do not need to know the implementation layer |

The problem is therefore not that every service is invalid. A service-like class
is useful when it owns orchestration or a business rule. It is noise when its
public API is a one-to-one copy of another object's API.

## Decisions that must not change during this rewrite

- Profile and list headers remain intentionally public. They expose the public
  identity and aggregate shell required by the header UI, not private list
  entries, comments, followers, or follows.
- Personal library data follows the account audience: public for everyone,
  restricted for authenticated users, and private for the owner and accepted
  followers. Administrators retain operational access.
- A disabled media channel hides list-derived surfaces for that family. It does
  not hide catalog media or collections.
- Collections keep their independent visibility rules. A public collection is
  public regardless of owner privacy or disabled list channels.
- Anonymous details resolution may ingest a missing provider item. This is an
  intentional product trade-off, not an authorization hole to remove here.
- A signed-in user may replace a book's global cover only while the current
  cover is the default. The database condition remains atomic; managers retain
  full catalog editing.
- The shared administrator step-up password remains on top of the normal
  administrator session.
- Series and anime share TV behavior where it is genuinely identical, while
  remaining distinct media channels.
- The rewrite is a direct cutover. There will be no shadow reads, dual writes,
  feature flags, parallel frontend, or compatibility API.

## Vocabulary

Use these names consistently:

- **Query**: authorizes an already-resolved scope when necessary, reads data,
  composes it, and returns a use-case-specific read model.
- **Command**: validates a mutation, owns its business invariants and transaction,
  coordinates side effects, and returns the canonical result needed by its caller.
- **Repository**: persists or retrieves an aggregate/data primitive. It does not
  call commands, services, providers, or frontend code.
- **Policy**: decides access from explicit facts and returns an access scope. It
  does not fetch broad private data and filter it afterward.
- **Contract**: a shared schema/type crossing the server-client boundary. Media
  contracts are discriminated by `kind`.
- **Provider/transformer/import parser**: the existing external-data boundary.
  These are not folded into application commands.

The old suffix `Service` should not be replaced mechanically. First identify
the behavior: a real read becomes a query, a real write becomes a command, a
pure forwarding class disappears, and an unrelated utility remains a utility.

## Abstraction test

Before adding a shared media abstraction, all of the following must be true:

1. The consumers have the same invariant, not merely similarly named fields.
2. The shared code removes duplicated behavior without hiding a family branch.
3. The caller remains fully typed without `any`, property-presence inference, or
   unsafe assertions.
4. Adding a family-specific field does not require changing unrelated families.
5. A developer can locate the concrete TV, movie, game, book, or manga behavior
   from the route or command in one jump.

Shared visual layout, pagination, table mechanics, cover handling, and common
library fields pass this test. A universal progress model, a base media class,
or a registry containing arbitrary React components does not.

## Documents

- [Backend rewrite](backend.md) defines the application boundaries, concrete
  class changes, transactions, and container shape.
- [Frontend rewrite](frontend.md) defines contracts and the details, lists,
  library-entry, and catalog-editing UI.
- [Execution and verification](execution-plan.md) gives the direct sequence,
  preservation matrix, and completion criteria.

These documents are deliberately specific about the current application. They
are a plan for this codebase, not a reusable media-framework design.

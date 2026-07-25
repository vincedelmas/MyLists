# Authorization rules

This document is the short authorization contract for MyLists. `Actor` always means the current visitor, and an accepted follower relationship is directional:
if B follows private A, B may see A; A gains no access to B.

Roles are hierarchical: `USER < MANAGER < ADMIN`. Ownership and accepted-follow relationships are evaluated separately from roles.

## Profiles

Profile headers are public for every existing account. They contain only what is needed to render the header, including follow counts and active-list levels. Actual
follows/followers, lists, updates, statistics, achievements, the profile collection index, and other profile content use this matrix:

<!-- contract:profile-access -->

| profile    | anonymous | user  | accepted-follower | manager | admin | owner |
|------------|-----------|-------|-------------------|---------|-------|-------|
| public     | allow     | allow | allow             | allow   | allow | allow |
| restricted | deny      | allow | allow             | allow   | allow | allow |
| private    | deny      | deny  | allow             | deny    | allow | allow |

- Restricted means any authenticated user.
- Managers have no private-profile bypass.
- Admins can inspect every profile.
- Follow/follower counts are public; the actual lists use profile access.

## Activated media lists

Activation is a publication boundary, not deletion. Inactive list data remains available to owner-only history and management flows, but it must not be returned or used by
profile/list and derived public features. Normal list endpoints do not give admins an activation bypass.

<!-- contract:active-list-endpoints -->

| server function           | required middleware                    |
|---------------------------|----------------------------------------|
| getUserListHeaderSF       | activeMediaListPreviewMiddleware       |
| getMediaListSF            | activeMediaListAuthorizationMiddleware |
| getTagsViewFn             | activeMediaListAuthorizationMiddleware |
| getMediaListFilters       | activeMediaListAuthorizationMiddleware |
| getMediaListSearchFilters | activeMediaListAuthorizationMiddleware |

Consequences of `active = false`:

- Header, list, tags, filters, and filter suggestions return not found.
- Updates, statistics, achievements, monthly activity, community activity, and highlighted media exclude the inactive type.
- Published profile settings redact its retained time spent.
- Taste matching excludes its ratings, totals, and shared favorites.

## Collections

The owner always has full access. Direct access for ordinary viewers is:

<!-- contract:collection-read -->

| collection | owner-profile | anonymous | user  | accepted-follower |
|------------|---------------|-----------|-------|-------------------|
| public     | any           | allow     | allow | allow             |
| restricted | public        | allow     | allow | allow             |
| restricted | restricted    | deny      | allow | allow             |
| restricted | private       | deny      | deny  | allow             |
| private    | any           | deny      | deny  | deny              |

Public collections bypass the owner profile's privacy. Restricted collections inherit it. Private collections are owner-only for ordinary viewers.

Moderation access is:

<!-- contract:collection-moderation -->

| collection | manager-read | manager-edit | manager-delete | admin-read | admin-edit | admin-delete |
|------------|--------------|--------------|----------------|------------|------------|--------------|
| public     | allow        | allow        | allow          | allow      | allow      | allow        |
| restricted | allow        | allow        | allow          | allow      | allow      | allow        |
| private    | deny         | deny         | deny           | allow      | allow      | allow        |

- Managers cannot discover, inspect, edit, or delete private collections.
- Admins can inspect and moderate every collection.
- Dedicated quick add/remove actions remain owner-only. A full edit may replace items when the actor is otherwise allowed to edit the collection.
- Like and copy require authentication plus ordinary viewer access; moderation does not bypass interaction visibility.
- Copies are private and owned by the copier.
- Profile collection indexes show private collections only to the owner/admin.

## Activity, feeds, and taste matching

Community media activity applies the profile matrix to each activity owner. Rows and aggregate statistics use the same filter, and inactive lists never contribute. Thus accepted
followers see private activity, admins see all active activity, and managers receive no private bypass.

The follows feed embedded on profile A contains updates by accounts A follows, but each update author is checked against the visitor:

- A sees private authors A follows.
- Another visitor sees a private author only when that visitor follows them.
- An admin sees every author followed by A.

Taste matching is also directional and uses the profile matrix for each candidate:

- B can match with private A when B is an accepted follower of A.
- A cannot match with private B unless A is an accepted follower of B.
- Both users see each other only when each direction is accepted.
- Admins can match with all eligible candidates; managers get no private bypass.
- Only active media types on both sides contribute to matching.

## Social and role-gated features

- Following public/restricted accounts is accepted immediately.
- Following private accounts creates a request.
- Follow, vote, settings, notifications, imports, and personal list mutations require authentication and operate as the current user.

<!-- contract:global-capabilities -->

| capability            | anonymous | user | manager | admin |
|-----------------------|-----------|------|---------|-------|
| editCatalog           | deny      | deny | allow   | allow |
| enterAdminDashboard   | deny      | deny | deny    | allow |
| manageFeatureRequests | deny      | deny | deny    | allow |

Most admin operations additionally require the admin-password step-up cookie. Feature-request status/delete operations require the admin role only.

Metadata refresh is authenticated: normal users have a cooldown and cannot refresh books; managers/admins bypass those restrictions. Updating the default book cover requires
authentication. External-media resolution is currently public.

## Intentional visibility exceptions and defaults

- User search returns basic header data for every account privacy.
- A public collection owned by a private account is directly public even when the owner's profile collection index is inaccessible.
- The default profile privacy is restricted.
- The default collection privacy is private.

## Keeping this document correct

`README.test.ts` parses the contract tables above and evaluates the real profile, collection, and global-capability policies. It also verifies that every documented list function
uses its documented activation middleware. Contextual SQL behavior is covered by `scopes/visibility.scope.test.ts`,
`community-activity-visibility.test.ts`, and
`disabled-media-visibility.test.ts`.

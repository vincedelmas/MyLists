# Books, works and editions

Google Books remains the source for edition metadata. `books.id` identifies a work; `book_editions` maps each Google volume ID to that work. The work page owns the title, authors, synopsis, cover and first publication date. `books.apiId` is a representative source link, not the edition lookup key.

Each reading-list entry references a work and optionally an edition. Its page count, language, publisher and edition title are snapshots. Provider refreshes do not rewrite those snapshots or the reader's progress. Readers can change the edition and correct their copy's page count. Credited reread page counts stay recorded when the edition changes. There is still one list entry per user and work, not a full reading-session history.

The details page presents the reader's selected edition title and available synopsis. Covers use the reader's custom cover, then the edition cover, then the work cover. Without a selected edition, the curated work presentation is used. A search result's edition is previewed before adding it to the list. Lists, favorites and list search use the selected edition title; community activity, ratings and first publication remain attached to the shared work.

## Migration

Apply `0052_book_works_editions.sql` through the normal migration runner, after backing up the database. It creates one edition per existing book, keeps the existing work IDs and list entries, and copies edition metadata into their reading snapshots. Ratings, notes, progress and recorded totals are retained. It does not merge existing works automatically.

Existing publication dates move to the editions. Apply `0053_book_publication_dates.sql` as well: it fills unknown work dates from the oldest attached edition and preserves previously supplied work dates. Historical game rounds remain intact; books with dates become eligible when the “Which came first?” pool is refreshed.

An edition-derived first publication date is provisional. Imports, provider refreshes, merges and splits recalculate it from the attached editions. A work date supplied by Open Library takes precedence, and changing the date in **Edit work** marks it as a manual correction that future refreshes preserve. Saving other work fields without changing the date leaves it provisional. Undated editions do not contribute a date.

`0054_book_review_and_reader_editions.sql` adds edition synopses and the persistent review queue. It backfills descriptions for representative editions and copies the current work cover into empty custom-cover fields **only for user IDs 9 and 166**, before any merges. Existing custom covers and placeholder covers are left alone. The existing image file is reused.

## Matching

New volumes attach automatically only when compatible author and identifier evidence points to exactly one existing work. ISBN-10 and ISBN-13 are normalized and checksum-validated. Matching ISBNs also require matching normalized edition titles. Title and author alone produce review suggestions. Derivative publications and conflicting numbered parts are excluded from automatic matching.

Optional Open Library enrichment uses ISBNs to look up a work ID and first publication year. Enable `OPEN_LIBRARY_BOOK_MATCHING=true`; optionally set `OPEN_LIBRARY_CONTACT_EMAIL` for the identifying user agent. Lookups are cached for 30 days, limited to one request per second, and skipped during bulk imports. Missing, ambiguous or unavailable results leave Google Books ingestion working normally. A compatible Open Library work ID can join translations whose titles differ.

Signed-in readers can choose **Find edition by ISBN** in the edition picker. Stored editions are reused without network requests; otherwise Google Books is queried and matching ISBN results are previewed before confirmation. A reader-confirmed new edition can attach to the requested work when title and author match, or compatible identifier evidence exists. Uncertain results create a provisional work and, when authors and volume information are compatible, a review suggestion. Existing editions remain on their current work until an administrator reviews them. Looking up or attaching an edition does not change the reader's saved progress; they still save their edition selection and can correct its page count.

## Catalogue management

Administrators can open **Books & editions** below **Admin Panel** in the account menu, or from a book's controls at `/books/manage`. Both the route and management endpoints require the ADMIN role. The catalogue and comparison sit side by side with independent scrolling and visible merge controls. Search local titles, authors or identifiers; sort by readers, title or publication date. Select up to 50 works individually or a page at a time; the selection stays across searches and pages. The work with the most readers is preselected as the survivor, and administrators can choose another to retain its title, cover and work information. A successful bulk merge clears the comparison and selected-work URL while retaining catalogue search and sort.

Use the inspection button to open editions, suggested matches and grouping history in a side panel. From there, add suggested matches to the selection, refresh individual editions, move an edition to another selected work, or split an edition into a new work. **Keep separate** excludes every pair in the current selection from future suggestions. Refresh existing editions to obtain ISBN evidence that was not stored before the work/edition migration.

The **Review queue** supports **Scan books** and **Review next**. The `review-book-works` maintenance task runs the same scan using only stored data, with no provider requests. Daily maintenance runs it before orphan cleanup. Matching uses normalized titles, compatible author names, ISBNs, stored Open Library work IDs, page counts and publishers. Confidence is a ranking heuristic, not a probability. High-confidence groups come first, then readership; possible matches remain available in a separate filter. Groups require evidence between every pair, so a chain of weak similarities cannot become one large proposed merge. Reader requests and keep-separate decisions persist across scans. Pending suggestions protect their works from orphan cleanup.

Merge previews list overlapping readers across the entire selection. For each overlap, select one active entry (including its rating and note) and choose whether to combine all distinct readings or retain only the selected duplicate's totals. The counting rule can be applied to all overlaps at once. Original entries and affected history are retained in the database audit; the management UI exposes only audit summaries, not private notes. The whole batch merges in one transaction and rejects stale previews. The audit is a recovery record, not an automatic undo button. Splitting moves readers currently using that edition; it does not reconstruct previous overlapping entries.

Full merges transfer collections, tags, activity, notifications, import references and game references to the surviving work. Removed work IDs have no redirects. Grouped and manually reviewed works are retained by orphan cleanup.

CSV exports now use format version 3 and include edition identity, reading snapshots and reread lengths. Older exports must be regenerated. Importing another edition of an already listed work is reported as skipped for review instead of overwriting the existing reading.

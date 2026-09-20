# Books, works and editions

Google Books remains the source for edition metadata. `books.id` identifies a work; `book_editions` maps each Google volume ID to that work. The work page owns the title, authors, synopsis, cover and first publication date. `books.apiId` is a representative source link, not the edition lookup key.

Each reading-list entry references a work and optionally an edition. Its page count, language, publisher and edition title are snapshots. Provider refreshes do not rewrite those snapshots or the reader's progress. Readers can change the edition and correct their copy's page count. Credited reread page counts stay recorded when the edition changes. There is still one list entry per user and work, not a full reading-session history.

## Migration

Apply `0052_book_works_editions.sql` through the normal migration runner, after backing up the database. It creates one edition per existing book, keeps the existing work IDs and list entries, and copies edition metadata into their reading snapshots. Ratings, notes, progress and recorded totals are retained. It does not merge existing works automatically.

Existing publication dates move to the editions; work publication dates start unknown because a volume date does not establish first publication. Books leave the “Which came first?” candidate pool until a work publication date is known and the pool is refreshed. Historical game rounds remain intact.

## Matching

New volumes attach automatically only when compatible author and identifier evidence points to exactly one existing work. ISBN-10 and ISBN-13 are normalized and checksum-validated. Matching ISBNs also require matching normalized edition titles. Title and author alone produce review suggestions. Derivative publications and conflicting numbered parts are excluded from automatic matching.

Optional Open Library enrichment uses ISBNs to look up a work ID and first publication year. Enable `OPEN_LIBRARY_BOOK_MATCHING=true`; optionally set `OPEN_LIBRARY_CONTACT_EMAIL` for the identifying user agent. Lookups are cached for 30 days, limited to one request per second, and skipped during bulk imports. Missing, ambiguous or unavailable results leave Google Books ingestion working normally. A compatible Open Library work ID can join translations whose titles differ.

## Catalogue management

Managers can open **Books & editions** from a book's controls at `/books/manage`. They can search local works, review suggested matches, refresh individual editions, merge works, move an edition, split an edition into a new work, or mark two works as separate. Refresh existing editions to obtain ISBN evidence that was not stored before this migration.

Merge previews list overlapping readers. For each overlap, select the active entry (including its rating and note) and choose whether to combine distinct readings or retain only the selected duplicate's totals. Original entries and affected history are retained in the database audit; the management UI exposes only audit summaries, not private notes. Merges run in one transaction and reject stale previews. The audit is a recovery record, not an automatic undo button. Splitting moves readers currently using that edition; it does not reconstruct previous overlapping entries.

Full merges transfer collections, tags, activity, notifications, import references and game references to the surviving work. Removed work IDs have no redirects. Grouped and manually reviewed works are retained by orphan cleanup.

CSV exports now use format version 3 and include edition identity, reading snapshots and reread lengths. Older exports must be regenerated. Importing another edition of an already listed work is reported as skipped for review instead of overwriting the existing reading.

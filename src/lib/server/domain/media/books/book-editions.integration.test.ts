import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportSource, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";

const context = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveImageFromUrl: vi.fn(), saveUploadedImage: vi.fn() }));
const { createBooksRepository } = await import("./books.repository");
const { createBooksService } = await import("./books.service");
const { getBookWork, keepBookWorksSeparate, mergeBookWorks, previewBookMerge, searchBookWorks, splitBookEdition } = await import("./book-works.service");
const { withTransaction } = await import("@/lib/server/database/async-storage");
const { MediaMaintenanceRepository } = await import("@/lib/server/domain/maintenance/media-maintenance.repository");

describe("Book editions and work grouping", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let repository: ReturnType<typeof createBooksRepository>;
    let service: ReturnType<typeof createBooksService>;
    const details = (apiId: string, name = "A Book", pages = 300) => ({
        mediaData: { apiId, name, imageCover: "work.jpg", releaseDate: null, synopsis: "Work description" },
        authorsData: [{ name: "An Author" }],
        editionData: { apiId, name, pages, language: "en", publishers: "Publisher", imageCover: "edition.jpg", authors: ["An Author"], isbns: [] as string[] },
    });
    const addWork = (apiId: string, name = "A Book", pages = 300) => withTransaction(() => repository.storeMediaWithDetails(details(apiId, name, pages)));
    const addReader = (mediaId: number, userId: number, total: number, comment?: string) => {
        const edition = repository.getEditions(mediaId)[0];
        return db.insert(schema.booksList).values({ userId, mediaId, ...repository.getEditionSnapshot(mediaId, edition.id),
            status: Status.COMPLETED, actualPage: total, total, rating: userId + 6, comment,
        }).returning().get();
    };

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        context.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.exec("PRAGMA foreign_keys=ON");
        db.insert(schema.user).values([1, 2, 3].map(id => ({ id, name: `reader-${id}`, email: `reader-${id}@example.com`, emailVerified: true, createdAt: "2025-01-01", updatedAt: "2025-01-01" }))).run();
        db.insert(schema.userMediaSettings).values([1, 2, 3].map(userId => ({ userId, mediaType: MediaType.BOOKS, active: true }))).run();
        repository = createBooksRepository(); service = createBooksService(repository);
    });
    afterEach(() => { sqlite.close(); context.db = undefined; });

    it("maps multiple volumes with compatible ISBN evidence to one work, but keeps title-only matches separate", async () => {
        const first = details("one"); first.editionData.isbns = ["9780140328721"];
        const id = withTransaction(() => repository.storeMediaWithDetails(first));
        const second = details("two"); second.editionData.isbns = ["9780140328721"];
        expect(withTransaction(() => repository.storeMediaWithDetails(second))).toBe(id);
        expect(addWork("three")).not.toBe(id);
        expect(await repository.findByApiIds(["one", "two"])).toMatchObject([{ id, apiId: "one" }, { id, apiId: "two" }]);
        expect(repository.getEditions(id)).toHaveLength(2);
        expect(withTransaction(() => repository.storeMediaWithDetails(second))).toBe(id);
        expect(repository.getEditions(id)).toHaveLength(2);
    });

    it("groups translations using compatible work evidence and searches their edition titles", async () => {
        const original = details("english", "The Book"); original.editionData = { ...original.editionData, openLibraryWorkId: "/works/OL123W" } as typeof original.editionData;
        const id = withTransaction(() => repository.storeMediaWithDetails(original));
        const translated = details("french", "Le Livre", 420);
        Object.assign(translated.editionData, { openLibraryWorkId: "/works/OL123W", language: "fr" });
        expect(withTransaction(() => repository.storeMediaWithDetails(translated))).toBe(id);
        expect(await repository.searchByName("Livre")).toMatchObject([{ mediaId: id, name: "The Book" }]);
    });

    it("reports catalogue counts for work IDs that differ from list and edition IDs", () => {
        db.insert(schema.books).values({id: 100, apiId: "catalogue", name: "Catalogue title", imageCover: "book.jpg"}).run();
        db.insert(schema.bookEditions).values({...details("catalogue").editionData, id: 500, mediaId: 100}).run();
        db.insert(schema.booksAuthors).values({id: 10, mediaId: 100, name: "An Author"}).run();
        addReader(100, 1, 300);
        expect(searchBookWorks("Catalogue").items).toMatchObject([{id: 100, editions: 1, readers: 1, authors: "An Author"}]);
    });

    it("leaves conflicting identifier matches for manual review", () => {
        const first = addWork("one"); const second = addWork("two");
        db.update(schema.bookEditions).set({isbns: ["9780140328721"]}).run();
        keepBookWorksSeparate(3, first, second);
        const volume = details("ambiguous"); volume.editionData.isbns = ["9780140328721"];
        const result = withTransaction(() => repository.storeMediaWithDetails(volume));
        expect([first, second]).not.toContain(result);
        expect(repository.getEditions(first)).toHaveLength(1);
        expect(repository.getEditions(second)).toHaveLength(1);
    });

    it("refreshes edition metadata without replacing curated work fields or reader snapshots", () => {
        const id = addWork("one");
        const row = addReader(id, 1, 300);
        withTransaction(() => repository.updateMediaWithDetails({ mediaData: { apiId: "one", name: "Curated title", releaseDate: "1900-01-01" } }));
        withTransaction(() => repository.updateMediaWithDetails(details("one", "Provider title", 420)));
        expect(repository.findById(id)).toMatchObject({ name: "Curated title", releaseDate: "1900-01-01" });
        expect(repository.getEditions(id)[0]).toMatchObject({ pages: 420, name: "Provider title" });
        expect(db.select().from(schema.booksList).where(eq(schema.booksList.id, row.id)).get()).toMatchObject({ pages: 300, total: 300 });
    });

    it("keeps credited reread lengths after changing editions and rejects an edition from a different work", () => {
        const id = addWork("one"); const other = addWork("other");
        const initial = addReader(id, 1, 300);
        const [reread] = service.updateRedoHandler(initial, { redo: 1 }, repository.findById(id)!);
        const [changed] = service.updateEditionHandler(reread, { edition: { editionId: initial.editionId, pages: 420 } });
        expect(changed).toMatchObject({ pages: 420, total: 720, rereadPages: [300], actualPage: 420 });
        expect(service.updateRedoHandler(changed, { redo: 2 }, repository.findById(id)!)[0]).toMatchObject({ total: 1140, rereadPages: [300, 420] });
        expect(service.updateRedoHandler(changed, { redo: 0 }, repository.findById(id)!)[0]).toMatchObject({ total: 420, rereadPages: [] });
        expect(() => service.updateEditionHandler(initial, { edition: { editionId: repository.getEditions(other)[0].id, pages: 300 } })).toThrow("does not belong");
    });

    it("requires explicit collision choices and combines readings, monthly buckets and statistics atomically", () => {
        const sourceId = addWork("one"); const targetId = addWork("two", "A Book", 420);
        addReader(sourceId, 1, 300, "Source note"); addReader(targetId, 1, 420, "Target note");
        addReader(sourceId, 2, 300);
        db.insert(schema.userMediaMonthlyActivity).values([sourceId, targetId].map(mediaId => ({ mediaId, userId: 1, mediaType: MediaType.BOOKS,
            monthBucket: "2026-01", progressGained: mediaId === sourceId ? 300 : 420, hadCompletion: true,
        }))).run();
        db.insert(schema.booksTags).values([{ userId: 1, mediaId: sourceId, name: "Favourite" }, { userId: 1, mediaId: targetId, name: "Favourite" }]).run();
        const preview = previewBookMerge(sourceId, targetId);
        expect(preview.conflicts).toHaveLength(1);
        const input = { sourceId, targetId, version: preview.version, metadata: "target" as const, resolutions: [] };
        expect(() => mergeBookWorks(3, input)).toThrow("Resolve every");
        expect(db.select().from(schema.booksList).all()).toHaveLength(3);
        mergeBookWorks(3, { ...input, resolutions: [{ userId: 1, keep: "target", reading: "combine" }] });
        expect(repository.findById(sourceId)).toBeUndefined();
        expect(repository.getEditions(targetId)).toHaveLength(2);
        expect(db.select().from(schema.booksList).where(eq(schema.booksList.userId, 1)).get()).toMatchObject({ mediaId: targetId, total: 720, redo: 1, pages: 420, comment: "Target note" });
        expect(db.select().from(schema.userMediaMonthlyActivity).all()).toMatchObject([{ mediaId: targetId, progressGained: 720 }]);
        expect(db.select().from(schema.booksTags).all()).toHaveLength(1);
        expect(db.select().from(schema.userMediaSettings).where(eq(schema.userMediaSettings.userId, 1)).get()).toMatchObject({ totalEntries: 1, totalSpecific: 720, totalRedo: 1 });
        const audit = db.select().from(schema.bookWorkAudit).get()!;
        expect(audit.snapshot.sourceLists).toEqual(expect.arrayContaining([expect.objectContaining({ comment: "Source note" })]));
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("keeps selected duplicate totals and archives the other reading", () => {
        const sourceId = addWork("one"); const targetId = addWork("two");
        addReader(sourceId, 1, 300, "Keep source"); addReader(targetId, 1, 100, "Duplicate");
        for (const [mediaId, progressGained] of [[sourceId, 300], [targetId, 100]]) db.insert(schema.userMediaMonthlyActivity).values({
            mediaId, progressGained, userId: 1, mediaType: MediaType.BOOKS, monthBucket: "2026-02",
        }).run();
        const preview = previewBookMerge(sourceId, targetId);
        mergeBookWorks(3, { sourceId, targetId, version: preview.version, metadata: "source", resolutions: [{ userId: 1, keep: "source", reading: "duplicate" }] });
        expect(db.select().from(schema.booksList).get()).toMatchObject({ mediaId: targetId, total: 300, comment: "Keep source" });
        expect(db.select().from(schema.userMediaMonthlyActivity).get()).toMatchObject({ mediaId: targetId, progressGained: 300 });
    });

    it("moves shared references and protects reviewed catalogue entries and archived covers from cleanup", async () => {
        const sourceId = addWork("source"); const targetId = addWork("target");
        db.update(schema.books).set({releaseDate: "1900-01-01"}).where(eq(schema.books.id, targetId)).run();
        db.insert(schema.collections).values({id: 1, ownerId: 1, title: "Reading", mediaType: MediaType.BOOKS}).run();
        db.insert(schema.collectionItems).values([sourceId, targetId].map((mediaId, orderIndex) => ({collectionId: 1, mediaId, mediaType: MediaType.BOOKS, orderIndex}))).run();
        db.insert(schema.mediaNotifications).values({userId: 1, mediaId: sourceId, mediaType: MediaType.BOOKS, name: "Book"}).run();
        db.insert(schema.userMediaUpdate).values({userId: 1, mediaId: sourceId, mediaType: MediaType.BOOKS, mediaName: "Book", updateType: UpdateType.PAGE, payload: {old_value: 0, new_value: 100}}).run();
        db.insert(schema.userMediaStatsHistory).values({userId: 1, mediaId: sourceId, mediaType: MediaType.BOOKS, active: true}).run();
        const job = db.insert(schema.importJobs).values({userId: 1, source: ImportSource.MYLISTS}).returning().get();
        db.insert(schema.importItems).values({jobId: job.id, rowNumber: 1, mediaType: MediaType.BOOKS, matchedMediaId: sourceId, payload: {}}).run();
        db.insert(schema.dailyMediadle).values({mediaId: sourceId, mediaType: MediaType.BOOKS, date: "2099-01-01"}).run();
        db.insert(schema.whichCameFirstMedia).values([sourceId, targetId].map(mediaId => ({mediaId, mediaType: MediaType.BOOKS, releaseDate: "1900-01-01"}))).run();
        const run = db.insert(schema.whichCameFirstRuns).values({userId: 1, selectedMediaTypes: [MediaType.BOOKS]}).returning().get();
        db.insert(schema.whichCameFirstRounds).values({runId: run.id, roundNumber: 1, leftMediaId: sourceId, rightMediaId: targetId,
            leftMediaType: MediaType.BOOKS, rightMediaType: MediaType.BOOKS, leftReleaseDate: "1900-01-01", rightReleaseDate: "1950-01-01"}).run();
        const preview = previewBookMerge(sourceId, targetId);
        mergeBookWorks(3, {sourceId, targetId, version: preview.version, metadata: "target", resolutions: []});
        expect(db.select().from(schema.collectionItems).all()).toMatchObject([{mediaId: targetId}]);
        for (const table of [schema.mediaNotifications, schema.userMediaUpdate, schema.userMediaStatsHistory, schema.dailyMediadle, schema.whichCameFirstMedia]) {
            expect(db.select().from(table).all()).toMatchObject([{mediaId: targetId}]);
        }
        expect(db.select().from(schema.importItems).get()).toMatchObject({matchedMediaId: targetId});
        expect(db.select().from(schema.whichCameFirstRounds).get()).toMatchObject({leftMediaId: targetId, rightMediaId: targetId, leftReleaseDate: "1900-01-01", rightReleaseDate: "1950-01-01"});
        db.delete(schema.collectionItems).run(); db.delete(schema.dailyMediadle).run();
        expect(MediaMaintenanceRepository.getOrphanedMediaIds(MediaType.BOOKS)).not.toContain(targetId);
        expect(await MediaMaintenanceRepository.getCoverFilenames(MediaType.BOOKS)).toEqual(expect.arrayContaining(["work.jpg", "edition.jpg"]));
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("rejects stale comparisons and rolls back the entire merge if a later reference update fails", () => {
        const sourceId = addWork("one"); const targetId = addWork("two"); addReader(sourceId, 1, 300);
        const preview = previewBookMerge(sourceId, targetId);
        db.update(schema.booksList).set({ comment: "Changed while reviewing" }).run();
        expect(() => mergeBookWorks(3, { sourceId, targetId, version: preview.version, metadata: "target", resolutions: [] })).toThrow("changed");
        const current = previewBookMerge(sourceId, targetId);
        sqlite.exec("CREATE TRIGGER fail_book_merge BEFORE DELETE ON books BEGIN SELECT RAISE(ABORT, 'merge failure'); END");
        expect(() => mergeBookWorks(3, { sourceId, targetId, version: current.version, metadata: "target", resolutions: [] })).toThrow();
        expect(repository.getEditions(sourceId)).toHaveLength(1);
        expect(db.select().from(schema.booksList).get()!.mediaId).toBe(sourceId);
        expect(db.select().from(schema.bookWorkAudit).all()).toHaveLength(0);
    });

    it("remembers rejected suggestions and can split a misgrouped edition together with its readers", () => {
        const sourceId = addWork("one"); const targetId = addWork("two");
        expect(getBookWork(sourceId).suggestions).toHaveLength(1);
        keepBookWorksSeparate(3, sourceId, targetId);
        expect(getBookWork(sourceId).suggestions).toHaveLength(0);
        const second = details("third");
        db.insert(schema.bookEditions).values({ ...second.editionData, mediaId: sourceId }).run();
        const edition = repository.findEditionByApiId("third")!;
        repository.addMediaToUserList(1, repository.findById(sourceId)!, Status.COMPLETED, edition.id);
        const result = splitBookEdition(3, edition.id, "A different work");
        expect(repository.findEditionByApiId("third")).toMatchObject({ mediaId: result.mediaId, matchLocked: true });
        expect(db.select().from(schema.booksList).get()).toMatchObject({ mediaId: result.mediaId, total: 300, editionId: edition.id });
        expect(repository.getEditions(sourceId)).toHaveLength(1);
        withTransaction(() => repository.updateMediaWithDetails(second));
        expect(repository.findEditionByApiId("third")!.mediaId).toBe(result.mediaId);
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });
});

import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportSource, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import type {InsertBooksWithDetails} from "./books.types";
import {bookGroupMergeSchema, bookGroupPreviewSchema} from "@/lib/schemas/book-editions.schema";

const context = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveImageFromUrl: vi.fn(), saveUploadedImage: vi.fn() }));
const { createBooksRepository } = await import("./books.repository");
const { createBooksService } = await import("./books.service");
const { getBookWork, keepBookWorksSeparate, mergeBookWorkGroup, mergeBookWorks, previewBookMerge, previewBookWorkGroup, searchBookWorks, splitBookEdition } = await import("./book-works.service");
const { withTransaction } = await import("@/lib/server/database/async-storage");
const { MediaMaintenanceRepository } = await import("@/lib/server/domain/maintenance/media-maintenance.repository");

describe("Book editions and work grouping", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let repository: ReturnType<typeof createBooksRepository>;
    let service: ReturnType<typeof createBooksService>;
    const details = (apiId: string, name = "A Book", pages = 300): InsertBooksWithDetails => ({
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

    it("searches by author and sorts the catalogue by readers, title or oldest publication", () => {
        const older = details("older", "A title"); older.editionData.releaseDate = "1900-01-01";
        const first = withTransaction(() => repository.storeMediaWithDetails(older));
        const second = addWork("popular", "Z title");
        addReader(first, 1, 300); addReader(second, 1, 300); addReader(second, 2, 300);
        expect(searchBookWorks("An Author").items.map(work => work.id)).toEqual([second, first]);
        expect(searchBookWorks("", 1, "title").items.map(work => work.id)).toEqual([first, second]);
        expect(searchBookWorks("", 1, "oldest").items.map(work => work.id)).toEqual([first, second]);
        expect(searchBookWorks("unrelated").total).toBe(0);
    });

    it("uses the oldest edition provisionally and recalculates it when a provider corrects an edition", () => {
        const first = details("newer"); Object.assign(first.editionData, {releaseDate: "2000-06-01", isbns: ["9780140328721"]});
        const id = withTransaction(() => repository.storeMediaWithDetails(first));
        expect(repository.findById(id)).toMatchObject({releaseDate: "2000-06-01", releaseDateSource: "edition"});
        const older = details("older"); Object.assign(older.editionData, {releaseDate: "1990-03-01", isbns: ["9780140328721"]});
        expect(withTransaction(() => repository.storeMediaWithDetails(older))).toBe(id);
        expect(repository.findById(id)!.releaseDate).toBe("1990-03-01");
        db.insert(schema.whichCameFirstMedia).values({mediaId: id, mediaType: MediaType.BOOKS, releaseDate: "1990-03-01"}).run();
        older.editionData.releaseDate = "2010-01-01";
        withTransaction(() => repository.updateMediaWithDetails(older));
        expect(repository.findById(id)!.releaseDate).toBe("2000-06-01");
        expect(db.select().from(schema.whichCameFirstMedia).get()!.releaseDate).toBe("2000-06-01");
        // Saving unrelated work fields must not freeze a provisional date.
        withTransaction(() => repository.updateMediaWithDetails({mediaData: {apiId: "newer", name: "Curated", releaseDate: "2000-06-01"}}));
        expect(repository.findById(id)!.releaseDateSource).toBe("edition");
        first.editionData.releaseDate = null; older.editionData.releaseDate = null;
        withTransaction(() => {repository.updateMediaWithDetails(first); repository.updateMediaWithDetails(older);});
        expect(repository.findById(id)!.releaseDate).toBeNull();
        expect(db.select().from(schema.whichCameFirstMedia).all()).toHaveLength(0);
    });

    it("lets a work provider improve an edition date and protects manual corrections from refreshes", () => {
        const volume = details("one"); volume.editionData.releaseDate = "2000-01-01";
        const id = withTransaction(() => repository.storeMediaWithDetails(volume));
        volume.mediaData.releaseDate = "1950-01-01"; volume.mediaData.releaseDateSource = "openLibrary";
        withTransaction(() => repository.updateMediaWithDetails(volume));
        expect(repository.findById(id)).toMatchObject({releaseDate: "1950-01-01", releaseDateSource: "openLibrary"});
        withTransaction(() => repository.updateMediaWithDetails(details("one")));
        expect(repository.findById(id)!.releaseDate).toBe("1950-01-01");
        withTransaction(() => repository.updateMediaWithDetails({mediaData: {apiId: "one", releaseDate: "1948-03-01"}}));
        withTransaction(() => repository.updateMediaWithDetails(volume));
        expect(repository.findById(id)).toMatchObject({releaseDate: "1948-03-01", releaseDateSource: "manual"});
    });

    it("recalculates both work dates when an older edition is split off", () => {
        const volume = details("newer"); volume.editionData.releaseDate = "2000-01-01";
        const sourceId = withTransaction(() => repository.storeMediaWithDetails(volume));
        const edition = db.insert(schema.bookEditions).values({...details("older").editionData, mediaId: sourceId, releaseDate: "1900-01-01"}).returning().get();
        const result = splitBookEdition(3, edition.id, "Separate work");
        expect(repository.findById(sourceId)!.releaseDate).toBe("2000-01-01");
        expect(repository.findById(result.mediaId)).toMatchObject({releaseDate: "1900-01-01", releaseDateSource: "edition"});
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
        db.update(schema.books).set({releaseDate: "1900-01-01", releaseDateSource: "manual"}).where(eq(schema.books.id, targetId)).run();
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

    it("preselects the work with the most readers and merges a whole group with one overlap decision per reader", () => {
        const first = addWork("one", "Original"); const target = addWork("two", "Most popular", 420); const third = addWork("three", "Translation", 200);
        const workIds = [first, target, third];
        for (const [mediaId, total] of [[first, 300], [target, 420], [third, 200]]) addReader(mediaId, 1, total, `Note ${mediaId}`);
        addReader(target, 2, 420);
        db.update(schema.bookEditions).set({releaseDate: "1850-01-01"}).where(eq(schema.bookEditions.mediaId, first)).run();
        db.update(schema.bookEditions).set({releaseDate: "2000-01-01"}).where(eq(schema.bookEditions.mediaId, target)).run();
        const preview = previewBookWorkGroup(workIds);
        expect(preview).toMatchObject({recommendedTargetId: target, readers: 2, editionCount: 3});
        expect(preview.conflicts).toHaveLength(1);
        expect(preview.conflicts[0].entries).toHaveLength(3);
        expect(preview.conflicts[0].entries[0]).not.toHaveProperty("comment");
        const input = {workIds, targetId: target, version: preview.version, resolutions: []};
        expect(() => mergeBookWorkGroup(3, input)).toThrow("Resolve every");
        // Choose the entry in the last work merged, after earlier readings have already been accumulated.
        expect(mergeBookWorkGroup(3, {...input, resolutions: [{userId: 1, keepWorkId: third, reading: "combine"}]})).toMatchObject({mediaId: target, affectedUsers: [1, 2]});
        expect(db.select().from(schema.books).all()).toMatchObject([{id: target, name: "Most popular", releaseDate: "1850-01-01"}]);
        expect(repository.getEditions(target)).toHaveLength(3);
        expect(db.select().from(schema.booksList).where(eq(schema.booksList.userId, 1)).get()).toMatchObject({mediaId: target, total: 920, redo: 2, pages: 200, comment: `Note ${third}`, rereadPages: [300, 420]});
        expect(db.select().from(schema.userMediaSettings).where(eq(schema.userMediaSettings.userId, 1)).get()).toMatchObject({totalEntries: 1, totalSpecific: 920, totalRedo: 2});
        expect(db.select().from(schema.bookWorkAudit).all()).toHaveLength(2);
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("preserves selected duplicate totals even when overlaps exist only between source works", () => {
        const first = addWork("one"); const target = addWork("two"); const third = addWork("three");
        addReader(first, 1, 300, "Keep earliest merged"); addReader(third, 1, 200, "Discard");
        addReader(first, 2, 300, "Discard"); addReader(third, 2, 200, "Keep last merged");
        const workIds = [first, target, third];
        const preview = previewBookWorkGroup(workIds);
        expect(preview.recommendedTargetId).toBe(first);
        const result = mergeBookWorkGroup(3, {workIds, targetId: target, version: preview.version,
            resolutions: [{userId: 1, keepWorkId: first, reading: "duplicate"}, {userId: 2, keepWorkId: third, reading: "duplicate"}]});
        expect(result.mediaId).toBe(target);
        expect(db.select().from(schema.booksList).all()).toEqual(expect.arrayContaining([
            expect.objectContaining({userId: 1, mediaId: target, total: 300, redo: 0, comment: "Keep earliest merged"}),
            expect.objectContaining({userId: 2, mediaId: target, total: 200, redo: 0, comment: "Keep last merged"}),
        ]));
    });

    it("rejects stale group previews and rolls back earlier merges if a later merge fails", () => {
        const first = addWork("one"); const target = addWork("two"); const third = addWork("three");
        addReader(first, 1, 300); addReader(third, 2, 300);
        const workIds = [first, target, third];
        const preview = previewBookWorkGroup(workIds);
        db.update(schema.booksList).set({comment: "Changed during review"}).where(eq(schema.booksList.mediaId, third)).run();
        const input = {workIds, targetId: target, version: preview.version, resolutions: []};
        expect(() => mergeBookWorkGroup(3, input)).toThrow("changed");
        sqlite.exec(`CREATE TRIGGER fail_late_merge BEFORE DELETE ON books WHEN OLD.id = ${third} BEGIN SELECT RAISE(ABORT, 'later merge failure'); END`);
        expect(() => mergeBookWorkGroup(3, {...input, version: previewBookWorkGroup(workIds).version})).toThrow();
        expect(db.select().from(schema.books).all()).toHaveLength(3);
        expect(repository.getEditions(first)).toHaveLength(1);
        expect(repository.getEditions(target)).toHaveLength(1);
        expect(db.select().from(schema.booksList).all().map(row => row.mediaId)).toEqual([first, third]);
        expect(db.select().from(schema.bookWorkAudit).all()).toHaveLength(0);
    });

    it("bounds bulk selections and requires the surviving work to be selected", () => {
        expect(bookGroupPreviewSchema.safeParse({workIds: []}).success).toBe(false);
        expect(bookGroupPreviewSchema.safeParse({workIds: [1, 1]}).success).toBe(false);
        expect(bookGroupPreviewSchema.safeParse({workIds: Array.from({length: 51}, (_, i) => i + 1)}).success).toBe(false);
        const input = {workIds: [1, 2], targetId: 3, version: "a".repeat(64)};
        expect(bookGroupMergeSchema.safeParse(input).success).toBe(false);
        expect(bookGroupMergeSchema.safeParse({...input, targetId: 2}).success).toBe(true);
    });
});

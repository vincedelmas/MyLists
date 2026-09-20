import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {BooksService} from "@/lib/server/domain/media/books/books.service";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {booksFinalListInsertSchema, booksImportPayloadSchema} from "@/lib/server/domain/media/books/books.types";


export class BooksImportListWriter implements ImportListWriter {
    constructor(private booksService: BooksService) {}

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];
        const outcomes: ImportItemOutcome[] = [];
        // Insert individually so two editions of one work never silently overwrite or discard a reading.
        for (const { item, mediaId, editionApiId } of matches) {
            const payload = booksImportPayloadSchema.parse(item.payload);
            const apiId = payload.editionApiId === undefined ? editionApiId ?? item.externalApiId : payload.editionApiId;
            const edition = apiId ? this.booksService.findEditionByApiId(apiId) : undefined;
            const snapshot = this.booksService.getEditionSnapshot(mediaId, payload.editionApiId === null ? null : edition?.id);
            const pages = payload.pages === undefined ? snapshot.pages : payload.pages;
            const redo = payload.redo ?? 0;
            if (pages === null && ((redo > 0 && payload.rereadPages === undefined) || (payload.status === Status.COMPLETED && payload.actualPage == null))) {
                outcomes.push({ itemId: item.id, matchedMediaId: null, status: ImportItemStatus.SKIPPED,
                    statusReason: "Edition page count is unknown. Choose an edition or enter a page count before importing this reading." });
                continue;
            }
            const rereadPages = payload.rereadPages ?? Array.from({ length: redo }, () => pages!);
            if (rereadPages.length !== redo) throw new Error("Reread page snapshots do not match the reread count.");
            const actualPage = payload.actualPage === undefined ? (payload.status === Status.COMPLETED ? pages : 0) : payload.actualPage;
            const total = payload.total ?? (actualPage ?? 0) + rereadPages.reduce((sum, count) => sum + count, 0);
            const row = booksFinalListInsertSchema.parse({
                userId, mediaId, ...snapshot, ...payload, pages, redo, actualPage, total, rereadPages,
            });
            const inserted = await this.booksService.bulkInsertUserMedia([row]);
            outcomes.push(inserted.length
                ? { itemId: item.id, matchedMediaId: mediaId, status: ImportItemStatus.COMPLETED }
                : { itemId: item.id, matchedMediaId: null, status: ImportItemStatus.SKIPPED,
                    statusReason: "An edition of this work is already in your list. Review this reading separately." });
        }
        return outcomes;
    }
}

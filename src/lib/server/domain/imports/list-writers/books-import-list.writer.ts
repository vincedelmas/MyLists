import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {booksFinalListInsertSchema, BooksImportPayload, booksImportPayloadSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {BookLibraryWriter} from "@/lib/server/domain/library/books/book-library.writer";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";


export class BooksImportListWriter implements ImportListWriter {
    constructor(private catalog: BookCatalogIngestionRepository, private libraryWriter: BookLibraryWriter) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userBooks = [];

        for (const { item, mediaId } of matches) {
            const payload = booksImportPayloadSchema.parse(item.payload);
            const media = await this.catalog.findForImport(mediaId);
            if (!media) throw new Error(`Matched book media ${mediaId} does not exist`);

            const fullPayload = this._materializeBookListPayload(payload, media);
            userBooks.push(booksFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload }));
        }

        await this.libraryWriter.importRows(userBooks);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeBookListPayload(payload: BooksImportPayload, media: { pages: number }) {
        const redo = payload.redo ?? 0;
        const actualPage = payload.actualPage ?? this._defaultActualPage(payload.status, media);
        const total = payload.total ?? this._calculateTotal(payload.status, actualPage, redo, media);

        return {
            ...payload,
            redo,
            total,
            actualPage,
        };
    }

    private _defaultActualPage(status: Status, media: { pages: number }) {
        if (status === Status.COMPLETED) return media.pages;
        if (status === Status.PLAN_TO_READ) return 0;
        return 0;
    }

    private _calculateTotal(status: Status, actualPage: number | null, redo: number, media: { pages: number }) {
        if (status === Status.COMPLETED) return media.pages + (redo * media.pages);
        if (status === Status.PLAN_TO_READ) return 0;
        return (actualPage ?? 0) + (redo * media.pages);
    }
}

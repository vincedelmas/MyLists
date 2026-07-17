import {describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {MatchedImportItem} from "@/lib/types/imports.types";
import {BooksImportListWriter} from "@/lib/server/domain/media/books/imports/books-import-list.writer";


describe("BooksImportListWriter", () => {
    it("materializes completed book defaults from matched media pages", async () => {
        const booksCatalog = {
            findForImport: vi.fn().mockResolvedValue({ pages: 412 }),
        };
        const libraryWriter = { importRows: vi.fn().mockResolvedValue(undefined) };
        const writer = new BooksImportListWriter(booksCatalog as any, libraryWriter as any);

        const matches: MatchedImportItem[] = [{
            mediaId: 100,
            item: {
                id: 1,
                jobId: 10,
                rowNumber: 2,
                name: "Dune",
                releaseDate: "1965",
                statusReason: null,
                externalApiId: "book-123",
                matchedMediaId: null,
                externalApiSource: ApiProviderType.BOOKS,
                mediaType: MediaType.BOOKS,
                createdAt: "2024-01-01 00:00:00",
                updatedAt: "2024-01-01 00:00:00",
                status: ImportItemStatus.PROCESSING,
                payload: { status: Status.COMPLETED },
            },
        }];

        await writer.addMatchedItems(42, matches);

        expect(libraryWriter.importRows).toHaveBeenCalledWith([{
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
            redo: 0,
            total: 412,
            actualPage: 412,
        }]);
    });
});

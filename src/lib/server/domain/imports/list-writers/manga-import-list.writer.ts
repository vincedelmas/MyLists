import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {mangaFinalListInsertSchema, MangaImportPayload, mangaImportPayloadSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {MangaLibraryWriter} from "@/lib/server/domain/library/manga/manga-library.writer";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";


export class MangaImportListWriter implements ImportListWriter {
    constructor(private catalog: MangaCatalogIngestionRepository, private libraryWriter: MangaLibraryWriter) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userManga = [];

        for (const { item, mediaId } of matches) {
            const payload = mangaImportPayloadSchema.parse(item.payload);
            const media = await this.catalog.findForImport(mediaId);
            if (!media) throw new Error(`Matched manga media ${mediaId} does not exist`);

            const fullPayload = this._materializeMangaListPayload(payload, media);
            userManga.push(mangaFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload }));
        }

        await this.libraryWriter.importRows(userManga);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeMangaListPayload(payload: MangaImportPayload, media: { chapters: number | null }) {
        const redo = payload.redo ?? 0;
        const currentChapter = payload.currentChapter ?? this._defaultCurrentChapter(payload.status, media);
        const total = payload.total ?? this._calculateTotal(payload.status, currentChapter, redo, media);

        return {
            ...payload,
            redo,
            total,
            currentChapter,
        };
    }

    private _defaultCurrentChapter(status: Status, media: { chapters: number | null }) {
        if (status === Status.COMPLETED) {
            if (!media.chapters) throw new Error("Cannot complete a manga without chapters");
            return media.chapters;
        }

        if (status === Status.PLAN_TO_READ) return 0;

        return 0;
    }

    private _calculateTotal(status: Status, currentChapter: number, redo: number, media: { chapters: number | null }) {
        if (status === Status.COMPLETED) {
            if (!media.chapters) throw new Error("Cannot complete a manga without chapters");
            return media.chapters + (redo * media.chapters);
        }

        if (status === Status.PLAN_TO_READ) return 0;

        return currentChapter + (redo * (media.chapters ?? 0));
    }
}

import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {Manga, mangaFinalListInsertSchema, MangaImportPayload, mangaImportPayloadSchema} from "@/lib/server/domain/media/manga/manga.types";


export class MangaImportListWriter {
    constructor(private mangaService: MangaService) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userManga = [];

        for (const { item, mediaId } of matches) {
            const payload = mangaImportPayloadSchema.parse(item.payload);
            const media = await this.mangaService.findById(mediaId);
            if (!media) throw new Error(`Matched manga media ${mediaId} does not exist`);

            const fullPayload = this._materializeMangaListPayload(payload, media);
            userManga.push(mangaFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload }));
        }

        await this.mangaService.bulkInsertUserMedia(userManga);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeMangaListPayload(payload: MangaImportPayload, media: Manga) {
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

    private _defaultCurrentChapter(status: Status, media: Manga) {
        if (status === Status.COMPLETED) {
            if (!media.chapters) throw new Error("Cannot complete a manga without chapters");
            return media.chapters;
        }

        if (status === Status.PLAN_TO_READ) return 0;

        return 0;
    }

    private _calculateTotal(status: Status, currentChapter: number, redo: number, media: Manga) {
        if (status === Status.COMPLETED) {
            if (!media.chapters) throw new Error("Cannot complete a manga without chapters");
            return media.chapters + (redo * media.chapters);
        }

        if (status === Status.PLAN_TO_READ) return 0;

        return currentChapter + (redo * (media.chapters ?? 0));
    }
}

import {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";
import type {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {createImportListWriter, createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";
import {internalApiIdMatcher, internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-matchers";
import {type UpsertMangaWithDetails, mangaFinalListInsertSchema, mangaImportPayloadSchema} from "@/lib/server/domain/media/manga/manga.types";


export const createMangaMatcher = (
    mangaService: MangaService,
    mangaProvider: ExternalMediaProvider<UpsertMangaWithDetails>,
    mangaIngestion: MediaIngestionService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.MANGA, mangaService),
        internalNameDateMatcher(mangaService, ApiProviderType.MANGA),
    ],
    externalMatchers: [{
        match: (items) => matchExternalItems({
            items,
            mediaLabel: "Manga",
            resultBatchSize: 50,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.MANGA && item.externalApiId) {
                    return { mediaId: await mangaIngestion.storeFromExternal(item.externalApiId, false) };
                }

                if (!item.name) return { statusReason: "Manga API match not found" };

                const searchResults = await mangaProvider.search(item.name);
                const candidates = filterImportCandidates(searchResults.data, MediaType.MANGA, item.releaseDate, item.name);

                if (candidates.length === 0) return { statusReason: "Manga API match not found" };
                if (candidates.length > 1) return { statusReason: "Manga API match is ambiguous" };

                return { mediaId: await mangaIngestion.storeFromExternal(candidates[0].id, false) };
            },
        }),
    }],
    listWriter: createImportListWriter({
        insertRows: mangaService.bulkInsertUserMedia,
        toRow: (userId, { item, mediaId }) => {
            const payload = mangaImportPayloadSchema.parse(item.payload);

            const media = mangaService.findById(mediaId);
            if (!media) throw new Error(`Matched manga media ${mediaId} does not exist`);

            let total = payload.total;
            const redo = payload.redo ?? 0;
            const currentChapter = payload.currentChapter ?? (payload.status === Status.COMPLETED ? media.chapters ?? 0 : 0);

            if (total === undefined) {
                if (payload.status === Status.COMPLETED) total = (media.chapters ?? currentChapter) * (1 + redo);
                else if (payload.status === Status.PLANNED) total = 0;
                else total = currentChapter + redo * (media.chapters ?? 0);
            }

            return mangaFinalListInsertSchema.parse({ userId, mediaId, ...payload, redo, total, currentChapter });
        },
    }),
});

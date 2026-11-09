import {ApiProviderType, TvMediaType} from "@/lib/utils/enums";
import type {TvService} from "@/lib/server/domain/media/tv/tv.service";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {attachTvSeasonEpisodes, getTvSeasonPosition, getTvSeasonTotals} from "@/lib/utils/media/tv-seasons";
import {createImportListWriter, createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";
import {type UpsertTvWithDetails, tvFinalListInsertSchema, tvImportPayloadSchema} from "@/lib/server/domain/media/tv/tv.types";
import {internalApiIdMatcher, internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-matchers";


export const createTvMatcher = (
    mediaType: TvMediaType,
    tvService: TvService,
    tvProvider: ExternalMediaProvider<UpsertTvWithDetails>,
    tvIngestion: MediaIngestionService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, tvService),
        internalNameDateMatcher(tvService, ApiProviderType.TMDB),
    ],
    externalMatchers: [{
        match: (items) => matchExternalItems({
            items,
            mediaLabel: "TV",
            resultBatchSize: 50,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.TMDB && item.externalApiId) {
                    return { mediaId: await tvIngestion.storeFromExternal(item.externalApiId, false, true) };
                }

                if (!item.name) return { statusReason: "TV API match not found" };

                const searchResults = await tvProvider.search(item.name);
                const candidates = filterImportCandidates(searchResults.data, mediaType, item.releaseDate, item.name);

                if (candidates.length === 0) return { statusReason: "TV API match not found" };
                if (candidates.length > 1) return { statusReason: "TV API match is ambiguous" };

                return { mediaId: await tvIngestion.storeFromExternal(candidates[0].id, false, true) };
            },
        }),
    }],
    listWriter: createTvImportListWriter(tvService),
});


export const createTvImportListWriter = (tvService: TvService) => createImportListWriter({
    insertRows: tvService.bulkInsertUserMedia,
    toRow: (userId, { item, mediaId }) => {
        const payload = tvImportPayloadSchema.parse(item.payload);
        const { firstWatchProgress, ...listData } = payload;

        const seasons = tvService.getMediaEpsPerSeason(mediaId);
        const existing = new Set(payload.seasons.map(s => s.season));

        const completeStates = [
            ...payload.seasons,
            ...seasons.filter(s => !existing.has(s.season)).map(s => ({ season: s.season, redo: 0, rating: null })),
        ];

        const position = getTvSeasonPosition(firstWatchProgress, seasons);
        const totals = getTvSeasonTotals(attachTvSeasonEpisodes(completeStates, seasons));

        return tvFinalListInsertSchema.parse({
            userId,
            mediaId,
            ...listData,
            redo: totals.redo,
            rating: totals.rating,
            seasons: completeStates,
            currentSeason: position.season,
            currentEpisode: position.episode,
            total: firstWatchProgress + totals.redoEpisodes,
        });
    },
});

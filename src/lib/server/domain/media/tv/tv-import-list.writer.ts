import {ImportItemStatus} from "@/lib/utils/enums";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {attachTvSeasonEpisodes, getTvSeasonPosition, getTvSeasonTotals} from "@/lib/utils/media/tv-seasons";
import {tvFinalListInsertSchema, TvImportPayload, tvImportPayloadSchema} from "@/lib/server/domain/media/tv/tv.types";


export class TvImportListWriter implements ImportListWriter {
    constructor(private tvService: TvService) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userTvRows = [];

        for (const { item, mediaId } of matches) {
            const payload = tvImportPayloadSchema.parse(item.payload);
            const fullPayload = this._materializeTvListPayload(mediaId, payload);
            userTvRows.push(tvFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload }));
        }

        await this.tvService.bulkInsertUserMedia(userTvRows);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private _materializeTvListPayload(mediaId: number, payload: TvImportPayload) {
        const { firstWatchProgress, ...listData } = payload;

        const seasons = this.tvService.getMediaEpsPerSeason(mediaId);
        const existing = new Set(payload.seasons.map(s => s.season));

        const completeStates = [
            ...payload.seasons,
            ...seasons.filter(s => !existing.has(s.season)).map(s => ({ season: s.season, redo: 0, rating: null })),
        ];

        const position = getTvSeasonPosition(firstWatchProgress, seasons);
        const totals = getTvSeasonTotals(attachTvSeasonEpisodes(completeStates, seasons));

        return {
            ...listData,
            redo: totals.redo,
            rating: totals.rating,
            seasons: completeStates,
            currentSeason: position.season,
            currentEpisode: position.episode,
            total: firstWatchProgress + totals.redoEpisodes,
        };
    }
}

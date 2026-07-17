import {ImportItemStatus, Status} from "@/lib/utils/enums";
import {ImportItemOutcome, MatchedImportItem} from "@/lib/types/imports.types";
import {ImportListWriter} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {tvFinalListInsertSchema, TvFinalListInsert, TvImportPayload, tvImportPayloadSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";


type SeasonEpisodes = {
    season: number;
    episodes: number;
};


const SPECIAL_STATUSES: Status[] = [Status.RANDOM, Status.PLAN_TO_WATCH];


export class TvImportListWriter implements ImportListWriter {
    constructor(
        private catalog: TvCatalogIngestionRepository,
        private mediaType: TvMediaType,
        private libraryCommands: TvLibraryCommands,
    ) {
    }

    async addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]> {
        if (matches.length === 0) return [];

        const userTvRows: TvFinalListInsert[] = [];

        for (const { item, mediaId } of matches) {
            const payload = tvImportPayloadSchema.parse(item.payload);
            const fullPayload = await this._materializeTvListPayload(mediaId, payload);
            userTvRows.push(tvFinalListInsertSchema.parse({ userId, mediaId, ...fullPayload }));
        }

        await this.libraryCommands.importRows(this.mediaType, userTvRows);

        return matches.map(({ item, mediaId }) => ({
            itemId: item.id,
            matchedMediaId: mediaId,
            status: ImportItemStatus.COMPLETED,
        }));
    }

    private async _materializeTvListPayload(mediaId: number, payload: TvImportPayload) {
        const seasons = await this.catalog.getEpisodesPerSeason(mediaId);

        const redo2 = this._checkRedo2(payload.redo2, seasons.length);
        const currentSeason = payload.currentSeason ?? this._defaultCurrentSeason(payload.status, seasons);
        const currentEpisode = payload.currentEpisode ?? this._defaultCurrentEpisode(payload.status, currentSeason, seasons);
        const redo = payload.redo ?? redo2.reduce((sum, count) => sum + count, 0);
        const total = payload.total ?? this._calculateTotal(payload.status, currentSeason, currentEpisode, redo2, seasons);

        return {
            ...payload,
            redo,
            redo2,
            total,
            currentSeason,
            currentEpisode,
        };
    }

    private _checkRedo2(redo2: number[] | undefined, seasonCount: number): number[] {
        if (!redo2) return Array(seasonCount).fill(0);
        return Array.from({ length: seasonCount }, (_, idx) => redo2[idx] ?? 0);
    }

    private _defaultCurrentSeason(status: Status, seasons: SeasonEpisodes[]) {
        if (status === Status.COMPLETED) return seasons.at(-1)!.season;
        return 1;
    }

    private _defaultCurrentEpisode(status: Status, currentSeason: number, seasons: SeasonEpisodes[]) {
        if (status === Status.COMPLETED) {
            return seasons.find(s => s.season === currentSeason)?.episodes ?? seasons.at(-1)!.episodes;
        }

        if (SPECIAL_STATUSES.includes(status)) return 0;

        return 1;
    }

    private _calculateTotal(status: Status, currentSeason: number, currentEpisode: number, redo2: number[], seasons: SeasonEpisodes[]) {
        const redoTotal = redo2.reduce((sum, redoCount, idx) => sum + redoCount * (seasons[idx]?.episodes ?? 0), 0);

        if (status === Status.COMPLETED) {
            return seasons.reduce((sum, season) => sum + season.episodes, 0) + redoTotal;
        }

        if (SPECIAL_STATUSES.includes(status)) {
            return 0;
        }

        const previousSeasonsTotal = seasons
            .filter((s) => s.season < currentSeason)
            .reduce((sum, s) => sum + s.episodes, 0);

        return previousSeasonsTotal + currentEpisode + redoTotal;
    }
}

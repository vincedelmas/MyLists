import * as z from "zod";
import {Status, UpdateType} from "@/lib/utils/enums";
import type {EpsPerSeasonType} from "@/lib/types/media-list.types";
import {mediaFilterNamesSchema} from "@/lib/media-definitions/base/media-filters";
import type {ContinueDefinition} from "@/lib/media-definitions/base/continue.definition";
import {commonEditableFields, metadataUrlSchema, metadataTextSchema, metadataDateSchema, metadataIntegerSchema} from "@/lib/media-definitions/base/media-metadata";


export const tvMetadataSchema = z.strictObject({
    ...commonEditableFields,
    homepage: metadataUrlSchema,
    createdBy: metadataTextSchema,
    prodStatus: metadataTextSchema,
    lastAirDate: metadataDateSchema,
    originalName: metadataTextSchema,
    originCountry: metadataTextSchema,
    duration: metadataIntegerSchema.optional(),
});


export const tvMetadataFilters = {
    langs: mediaFilterNamesSchema,
    actors: mediaFilterNamesSchema,
    creators: mediaFilterNamesSchema,
    networks: mediaFilterNamesSchema,
};


export const tvContinueDefinition: ContinueDefinition<{
    currentSeason: number;
    currentEpisode: number;
    epsPerSeason: EpsPerSeasonType[];
}> = {
    getUpdate: (state) => {
        const seasons = [...state.epsPerSeason].sort((a, b) => a.season - b.season);
        const current = seasons.find(season => season.season === state.currentSeason)!;

        if (state.currentEpisode < current.episodes) {
            return { type: UpdateType.TV, currentEpisode: state.currentEpisode + 1 };
        }

        const nextSeason = seasons.find(season => season.season > state.currentSeason && season.episodes > 0);
        if (nextSeason) {
            return { type: UpdateType.TV, currentSeason: nextSeason.season, currentEpisode: 1 };
        }

        return state.currentSeason === seasons.at(-1)!.season
        && state.currentEpisode === current.episodes && current.episodes > 0
            ? { type: UpdateType.STATUS, status: Status.COMPLETED }
            : null;
    },
};

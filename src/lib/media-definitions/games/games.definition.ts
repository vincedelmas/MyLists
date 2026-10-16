import * as z from "zod";
import {commonMediaFilters, MAX_MEDIA_FILTER_VALUES, mediaFilterNamesSchema} from "@/lib/media-definitions/base/media-filters";
import {PLAYTIME_MAX_MINUTES} from "@/lib/utils/constants";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {ApiProviderType, GamesPlatformsEnum, JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";


export const gamesDefinition = defineMediaDefinition({
    filters: {
        common: commonMediaFilters,
        metadata: {
            companies: mediaFilterNamesSchema,
            platforms: z.array(z.enum(GamesPlatformsEnum)).max(MAX_MEDIA_FILTER_VALUES),
        },
    },
    continue: {
        status: Status.PLAYING,
        getUpdate: (state: ContinueStateByType[typeof MediaType.GAMES]) => {
            const value = state.playtime ?? 0;
            const nextPlaytime = Math.min(value + 60, PLAYTIME_MAX_MINUTES);
            return nextPlaytime > value ? { type: UpdateType.PLAYTIME, playtime: nextPlaytime } : null;
        },
    },
    statuses: [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY],
    sorting: {
        default: "playtime_highest",
        options: [
            "title_asc", "title_desc", "release_newest", "release_oldest",
            "provider_rating_highest", "provider_rating_lowest", "added_newest", "added_oldest",
            "modified_newest", "modified_oldest", "rating_highest", "rating_lowest", "playtime_highest",
            "playtime_lowest",
        ],
        labels: {
            provider_rating_lowest: "IGDB Rating -",
            provider_rating_highest: "IGDB Rating +",
        },
    },
    identity: {
        mediaType: MediaType.GAMES,
    },
    externalSearch: {
        provider: ApiProviderType.IGDB,
    },
    terminology: {
        entry: {
            plural: "games",
            singular: "game",
        },
    },
    progress: {
        inputStep: 0.25,
        unit: {
            short: "h.",
            plural: "hours",
            singular: "hour",
            long: "Hours Played",
        },
        timing: {
            kind: "stored-minutes",
            minutesPerInputUnit: 60,
        },
    },
    statistics: {
        affinities: [
            { key: "developersStats", label: "Developers", job: JobType.CREATOR },
            { key: "platformsStats", label: "Platforms" },
            { key: "genresStats", label: "Genres" },
            { key: "publishersStats", label: "Publishers" },
            { key: "enginesStats", label: "Engines" },
            { key: "perspectivesStats", label: "Perspectives" },
        ],
        repeat: {
            label: "Replays",
            rateLabel: "Replay rate",
        },
        timeComparison: {
            referenceHours: 32,
            secondaryHours: 8,
            secondaryLabel: "full eight-hour gaming sessions",
            referenceLabel: "playthroughs of GTA V’s main story",
        },
        durationDistribution: {
            unit: "h",
            rangeMode: "integer",
            label: "Playthrough Duration Distribution",
        },
    },
});

import {ApiProviderType, JobType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const gamesDefinition = defineMediaDefinition({
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

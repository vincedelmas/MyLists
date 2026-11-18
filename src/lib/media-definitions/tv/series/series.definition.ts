import {commonMediaFilters} from "@/lib/media-definitions/base/media-filters";
import {ApiProviderType, MediaCategory, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {tvContinueDefinition, tvMetadataFilters, tvMetadataSchema} from "@/lib/media-definitions/tv/tv.definition";


export const SERIES_FALLBACK_DURATION = 40;


export const seriesDefinition = defineMediaDefinition({
    releaseNotifications: true,
    continue: tvContinueDefinition,
    metadataSchema: tvMetadataSchema,
    statuses: [Status.IN_PROGRESS, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLANNED],
    filters: {
        common: commonMediaFilters,
        metadata: tvMetadataFilters,
    },
    sorting: {
        default: "title_asc",
        options: [
            "title_asc", "title_desc", "release_newest", "release_oldest",
            "provider_rating_highest", "provider_rating_lowest", "added_newest", "added_oldest",
            "modified_newest", "modified_oldest", "rating_highest", "rating_lowest", "redo_highest",
        ],
        labels: {
            redo_highest: "Re-watched",
            provider_rating_lowest: "TMDB Rating -",
            provider_rating_highest: "TMDB Rating +",
        },
    },
    identity: {
        mediaType: MediaType.SERIES,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "series",
            singular: "series",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "eps",
            long: "Episodes",
            plural: "episodes",
            singular: "episode",
        },
        timing: {
            kind: "media-duration",
            fallbackMinutes: SERIES_FALLBACK_DURATION,
        },
    },
    statistics: {
        repeat: {
            label: "Rewatches",
            rateLabel: "Rewatch rate",
        },
        affinities: [
            { key: "genresStats", label: "Genres", category: MediaCategory.GENRE },
            { key: "countriesStats", label: "Countries", category: MediaCategory.COUNTRY },
            { key: "actorsStats", label: "Actors", category: MediaCategory.ACTOR },
            { key: "networksStats", label: "Networks", category: MediaCategory.PLATFORM },
        ],
        timeComparison: {
            referenceHours: 49,
            secondaryHours: 0.75,
            referenceLabel: "complete watches of Breaking Bad",
            secondaryLabel: "45-minute ‘just one more’ episodes",
        },
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            rangeMode: "integer",
            label: "Series Duration Distribution",
        },
    },
});

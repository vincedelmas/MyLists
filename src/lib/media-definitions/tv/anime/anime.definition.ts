import {commonMediaFilters} from "@/lib/media-definitions/base/media-filters";
import {ApiProviderType, MediaCategory, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {tvContinueDefinition, tvMetadataFilters, tvMetadataSchema} from "@/lib/media-definitions/tv/tv.definition";


export const ANIME_FALLBACK_DURATION = 24;


export const animeDefinition = defineMediaDefinition({
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
            "title_asc",
            "title_desc",
            "release_newest",
            "release_oldest",
            "provider_rating_highest",
            "provider_rating_lowest",
            "added_newest",
            "added_oldest",
            "modified_newest",
            "modified_oldest",
            "rating_highest",
            "rating_lowest",
            "redo_highest",
        ],
        labels: {
            redo_highest: "Re-watched",
            provider_rating_lowest: "TMDB Rating -",
            provider_rating_highest: "TMDB Rating +",
        },
    },
    identity: {
        mediaType: MediaType.ANIME,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "anime",
            singular: "anime",
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
            fallbackMinutes: ANIME_FALLBACK_DURATION,
        },
    },
    statistics: {
        affinities: [
            { key: "networksStats", label: "Networks", category: MediaCategory.PLATFORM },
            { key: "genresStats", label: "Genres", category: MediaCategory.GENRE },
            { key: "actorsStats", label: "Actors", category: MediaCategory.ACTOR },
            { key: "countriesStats", label: "Countries", category: MediaCategory.COUNTRY },
        ],
        repeat: {
            label: "Rewatches",
            rateLabel: "Rewatch rate",
        },
        timeComparison: {
            referenceHours: 37.5,
            secondaryHours: 1.5 / 60,
            secondaryLabel: "90-second anime opening sequences",
            referenceLabel: "complete watches of Attack on Titan",
        },
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            rangeMode: "integer",
            label: "Anime Duration Distribution",
        },
    },
});

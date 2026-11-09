import * as z from "zod";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {commonMediaFilters, mediaFilterNamesSchema} from "@/lib/media-definitions/base/media-filters";
import {commonEditableFields, metadataTextSchema, metadataUrlSchema, nullableMetadataNumberSchema, metadataIntegerSchema} from "@/lib/media-definitions/base/media-metadata";


export const MOVIES_FALLBACK_DURATION = 100;


const movieMetadataSchema = z.strictObject({
    ...commonEditableFields,
    tagline: metadataTextSchema,
    homepage: metadataUrlSchema,
    originalName: metadataTextSchema,
    directorName: metadataTextSchema,
    budget: nullableMetadataNumberSchema,
    originalLanguage: metadataTextSchema,
    revenue: nullableMetadataNumberSchema,
    duration: metadataIntegerSchema.optional(),
});


export const moviesDefinition = defineMediaDefinition({
    continue: null,
    releaseNotifications: true,
    metadataSchema: movieMetadataSchema,
    statuses: [Status.COMPLETED, Status.PLANNED],
    filters: {
        common: commonMediaFilters,
        metadata: {
            actors: mediaFilterNamesSchema,
            directors: mediaFilterNamesSchema,
            langs: mediaFilterNamesSchema,
        },
    },
    sorting: {
        default: "title_asc",
        options: [
            "title_asc",
            "title_desc",
            "rating_highest",
            "rating_lowest",
            "provider_rating_highest",
            "provider_rating_lowest",
            "release_newest",
            "release_oldest",
            "added_newest",
            "added_oldest",
            "modified_newest",
            "modified_oldest",
            "redo_highest",
        ],
        labels: {
            redo_highest: "Re-Watched",
            provider_rating_lowest: "TMDB Rating -",
            provider_rating_highest: "TMDB Rating +",
        },
    },
    identity: {
        mediaType: MediaType.MOVIES,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "movies",
            singular: "movie",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "views",
            plural: "viewings",
            singular: "viewing",
            long: "Times Watched",
        },
        timing: {
            kind: "media-duration",
            fallbackMinutes: MOVIES_FALLBACK_DURATION,
        },
    },
    statistics: {
        affinities: [
            { key: "directorsStats", label: "Directors", job: JobType.CREATOR },
            { key: "actorsStats", label: "Actors", job: JobType.ACTOR },
            { key: "genresStats", label: "Genres" },
            { key: "langsStats", label: "Languages" },
        ],
        repeat: {
            label: "Rewatches",
            rateLabel: "Rewatch rate",
        },
        timeComparison: {
            secondaryHours: 2,
            referenceHours: 169 / 60,
            referenceLabel: "full watches of Interstellar",
            secondaryLabel: "cinema-sized popcorns, at one per two-hour film",
        },
        progress: {
            redoLabel: "movies re-watched",
            totalSpecificLabel: "Total Movies Watched",
        },
        durationDistribution: {
            unit: "m.",
            rangeMode: "integer",
            label: "Movies Duration Distribution",
        },
    },
});

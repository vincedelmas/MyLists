import {MediaType} from "@/lib/utils/enums";
import {JikanApi} from "@/lib/server/api-providers/api";
import {FormattedError} from "@/lib/utils/error-classes";
import {ExternalMediaProvider, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {MangaCatalogSnapshot} from "@/lib/server/domain/media/manga/catalog/manga-catalog-snapshot";
import {jikanTransformer} from "@/lib/server/domain/media/manga/external/jikan.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createJikanMangaProvider = (jikan: JikanApi): ExternalMediaProvider<MangaCatalogSnapshot> => {
    return {
        source: "jikan",
        mediaType: MediaType.MANGA,

        search: {
            async search(query, page = 1) {
                const raw = await jikan.search(query, page);
                return jikanTransformer.transformSearchResults(raw);
            },
        },

        details: {
            async getDetails(apiId) {
                const raw = await jikan.getMangaDetails(Number(apiId));
                return jikanTransformer.transformDetailsResults(raw);
            },
        },
    };
};


export const createMangaIngestionService = (
    catalog: CatalogIngestionCommands<MangaCatalogSnapshot>,
    provider: ExternalMediaProvider<MangaCatalogSnapshot>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        catalog,
        refreshCandidates,
        refreshPolicy: {
            shouldAbortBulkRefresh: (reason) => {
                if (!(reason instanceof FormattedError)) return false;
                const statusCode = reason?.args?.statusCode ?? 200;
                return statusCode >= 500 && statusCode < 600;
            },
        },
    });
};

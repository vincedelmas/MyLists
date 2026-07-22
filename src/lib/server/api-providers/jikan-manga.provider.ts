import {JikanApi} from "@/lib/server/api-providers/api";
import {FormattedError} from "@/lib/utils/error-classes";
import {MangaRepository} from "@/lib/server/domain/media/manga";
import {mangaDefinition} from "@/lib/server/domain/media/manga/manga.definition";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {jikanTransformer} from "@/lib/server/api-providers/transformers/jikan.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createJikanMangaProvider = (jikan: JikanApi): ExternalMediaProvider<UpsertMangaWithDetails> => {
    const transformOptions = {
        ...mangaDefinition.identity,
        maxAuthors: mangaDefinition.ingestion.limits.authors,
    };

    return {
        source: "jikan",
        mediaType: mangaDefinition.identity.mediaType,

        search: {
            async search(query, page = 1) {
                const raw = await jikan.search(query, page);
                return jikanTransformer.transformSearchResults(raw, transformOptions);
            },
        },

        details: {
            async getDetails(apiId) {
                const raw = await jikan.getMangaDetails(Number(apiId));
                return jikanTransformer.transformDetailsResults(raw, transformOptions);
            },
        },
    };
};


export const createMangaIngestionService = (repository: MangaRepository, provider: ExternalMediaProvider<UpsertMangaWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates: {
            getCandidateApiIds: () => {
                return repository.getMediaIdsToBeRefreshed();
            },
        },
        refreshPolicy: {
            shouldAbortBulkRefresh: (reason) => {
                if (!(reason instanceof FormattedError)) return false;
                const statusCode = reason?.args?.statusCode ?? 200;
                return statusCode >= 500 && statusCode < 600;
            },
        },
    });
};

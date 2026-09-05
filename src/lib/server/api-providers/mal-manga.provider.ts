import {MalApi} from "@/lib/server/api-providers/api";
import {FormattedError} from "@/lib/utils/error-classes";
import type {MangaRepository} from "@/lib/server/domain/media/manga";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {malTransformer} from "@/lib/server/api-providers/transformers/mal.transformer";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createMalMangaProvider = (mal: MalApi): ExternalMediaProvider<UpsertMangaWithDetails> => {
    const transformOptions = {
        ...mangaServerDefinition.identity,
        maxAuthors: mangaServerDefinition.ingestion.limits.authors,
    };

    return {
        async search(query, page = 1) {
            const raw = await mal.searchManga(query, page);
            return malTransformer.transformSearchResults(raw, transformOptions);
        },
        
        async getDetails(apiId) {
            const raw = await mal.getMangaDetails(Number(apiId));
            return malTransformer.transformDetailsResults(raw, transformOptions);
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
                return statusCode === 401 || statusCode === 403 || statusCode === 429 || (statusCode >= 500 && statusCode < 600);
            },
        },
    });
};

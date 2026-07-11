import {MediaType} from "@/lib/utils/enums";
import {JikanApi} from "@/lib/server/api-providers/api";
import {MangaRepository} from "@/lib/server/domain/media/manga";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {jikanTransformer} from "@/lib/server/api-providers/transformers/jikan.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createJikanMangaProvider = (jikan: JikanApi): ExternalMediaProvider<UpsertMangaWithDetails> => {
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


export const createMangaIngestionService = (repository: MangaRepository, provider: ExternalMediaProvider<UpsertMangaWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates: {
            getCandidateApiIds: () => {
                return repository.getMediaIdsToBeRefreshed();
            },
        },
    });
};

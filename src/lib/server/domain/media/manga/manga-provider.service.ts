import {JikanDetails, ProviderSearchResults} from "@/lib/types/provider.types";
import {JikanApi} from "@/lib/server/api-providers/api/jikan.api";
import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {BaseProviderService} from "@/lib/server/domain/media/base/provider.service";
import {jikanTransformer} from "@/lib/server/api-providers/transformers/jikan.transformer";


export class MangaProviderService extends BaseProviderService<MangaRepository, JikanDetails, UpsertMangaWithDetails> {
    constructor(private client: JikanApi, repository: MangaRepository) {
        super(repository);
    }

    async search(query: string, page = 1): Promise<ProviderSearchResults> {
        const searchData = await this.client.search(query, page);
        return jikanTransformer.transformSearchResults(searchData);
    }

    protected _fetchRawDetails(apiId: number) {
        return this.client.getMangaDetails(apiId);
    }

    protected _transformDetails(rawData: JikanDetails) {
        return jikanTransformer.transformDetailsResults(rawData);
    }

    protected _getMediaIdsForBulkRefresh() {
        return this.repository.getMediaIdsToBeRefreshed();
    }
}

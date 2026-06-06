import z from "zod";
import {GBooksDetails} from "@/lib/types/provider.types";
import {GbooksApi, LlmApi} from "@/lib/server/api-providers/api";
import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {BaseProviderService} from "@/lib/server/domain/media/base/provider.service";
import {gbooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";


export class BooksProviderService extends BaseProviderService<BooksRepository, GBooksDetails, UpsertBooksWithDetails> {
    constructor(private client: GbooksApi, private llmClient: LlmApi, repository: BooksRepository) {
        super(repository);
    }

    protected _fetchRawDetails(apiId: string) {
        return this.client.getBooksDetails(apiId);
    }

    protected _transformDetails(rawData: GBooksDetails) {
        return gbooksTransformer.transformDetailsResults(rawData);
    }

    protected _getMediaIdsForBulkRefresh() {
        return Promise.resolve([]);
    }

    async llmResponse(content: string, schema: z.ZodSchema) {
        return await this.llmClient.llmBookGenresCall(content, schema);
    }
}

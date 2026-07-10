import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {BooksService} from "@/lib/server/domain/media/books/books.service";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {BooksProviderService} from "@/lib/server/domain/media/books/books-provider.service";
import {ExternalGoogleBooksMatcher} from "@/lib/server/domain/imports/matchers/external-books.matcher";
import {BooksImportListWriter} from "@/lib/server/domain/imports/list-writers/books-import-list.writer";
import {externalMediaMatcherPipeline, internalMediaMatcherPipeline} from "@/lib/server/domain/imports/matchers/media-pipeline.matcher";
import {ExternalMatcherPipeline, InternalMatcherPipeline, MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const MATCH_NOT_FOUND_REASON = "No book match found";


export class BooksMatcher implements MediaMatcher {
    constructor(
        private internalMatcherPipeline: InternalMatcherPipeline,
        private externalMatcherPipeline: ExternalMatcherPipeline,
        private listWriter: BooksImportListWriter,
    ) {
    }

    static create(booksService: BooksService, booksProviderService: BooksProviderService) {
        return new BooksMatcher(
            internalMediaMatcherPipeline([
                internalApiIdMatcher(ApiProviderType.BOOKS, booksService),
                internalNameDateMatcher(booksService),
            ]),
            externalMediaMatcherPipeline([
                new ExternalGoogleBooksMatcher(booksProviderService),
            ]),
            new BooksImportListWriter(booksService),
        );
    }

    async* match(context: MediaMatcherContext, items: ImportItemsSelect[]) {
        if (items.length === 0) return;

        const { matched, unresolved } = await this.internalMatcherPipeline.run(items);
        const completedOutcomes = await this.listWriter.addMatchedItems(context.userId, matched);
        if (completedOutcomes.length > 0) {
            yield completedOutcomes;
        }

        for await (const externalResult of this.externalMatcherPipeline.run(unresolved)) {
            const externalCompletedOutcomes = await this.listWriter.addMatchedItems(context.userId, externalResult.matched);
            if (externalCompletedOutcomes.length > 0) {
                yield externalCompletedOutcomes;
            }

            if (externalResult.skipped.length > 0) {
                yield externalResult.skipped;
            }

            if (externalResult.failed.length > 0) {
                yield externalResult.failed;
            }

            if (externalResult.unresolved.length > 0) {
                yield externalResult.unresolved.map((item) => ({
                    itemId: item.id,
                    matchedMediaId: null,
                    status: ImportItemStatus.SKIPPED,
                    statusReason: MATCH_NOT_FOUND_REASON,
                }));
            }
        }
    }
}

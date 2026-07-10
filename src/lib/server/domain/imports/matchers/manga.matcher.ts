import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {MangaProviderService} from "@/lib/server/domain/media/manga/manga-provider.service";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {ExternalJikanMangaMatcher} from "@/lib/server/domain/imports/matchers/external-manga.matcher";
import {MangaImportListWriter} from "@/lib/server/domain/imports/list-writers/manga-import-list.writer";
import {externalMediaMatcherPipeline, internalMediaMatcherPipeline} from "@/lib/server/domain/imports/matchers/media-pipeline.matcher";
import {ExternalMatcherPipeline, InternalMatcherPipeline, MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const MATCH_NOT_FOUND_REASON = "No manga match found";


export class MangaMatcher implements MediaMatcher {
    constructor(
        private internalMatcherPipeline: InternalMatcherPipeline,
        private externalMatcherPipeline: ExternalMatcherPipeline,
        private listWriter: MangaImportListWriter,
    ) {
    }

    static create(mangaService: MangaService, mangaProviderService: MangaProviderService) {
        return new MangaMatcher(
            internalMediaMatcherPipeline([
                internalApiIdMatcher(ApiProviderType.MANGA, mangaService),
                internalNameDateMatcher(mangaService),
            ]),
            externalMediaMatcherPipeline([
                new ExternalJikanMangaMatcher(mangaProviderService),
            ]),
            new MangaImportListWriter(mangaService),
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

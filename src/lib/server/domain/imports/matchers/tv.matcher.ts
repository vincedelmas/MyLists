import {ImportItemsSelect} from "@/lib/types/imports.types";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {ApiProviderType, ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {TvProviderService} from "@/lib/server/domain/media/tv/tv.provider.service";
import {ExternalTMDBTvMatcher} from "@/lib/server/domain/imports/matchers/external-tv.matcher";
import {TvImportListWriter} from "@/lib/server/domain/imports/list-writers/tv-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {externalMediaMatcherPipeline, internalMediaMatcherPipeline} from "@/lib/server/domain/imports/matchers/media-pipeline.matcher";
import {ExternalMatcherPipeline, InternalMatcherPipeline, MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const matchNotFoundReason = (mediaType: TvMediaType) => {
    return mediaType === MediaType.ANIME ? "No anime match found" : "No series match found";
};


export class TvMatcher implements MediaMatcher {
    constructor(
        private mediaType: TvMediaType,
        private internalMatcherPipeline: InternalMatcherPipeline,
        private externalMatcherPipeline: ExternalMatcherPipeline,
        private listWriter: TvImportListWriter,
    ) {
    }

    static create(mediaType: TvMediaType, tvService: TvService, tvProviderService: TvProviderService) {
        return new TvMatcher(
            mediaType,
            internalMediaMatcherPipeline([
                internalApiIdMatcher(ApiProviderType.TMDB, tvService),
                internalNameDateMatcher(tvService),
            ]),
            externalMediaMatcherPipeline([
                new ExternalTMDBTvMatcher(mediaType, tvProviderService),
            ]),
            new TvImportListWriter(tvService),
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
                    statusReason: matchNotFoundReason(this.mediaType),
                }));
            }
        }
    }
}

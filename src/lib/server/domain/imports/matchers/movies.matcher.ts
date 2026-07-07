import {ImportMatcherItem} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {InternalMediaMatcher} from "@/lib/server/domain/imports/matchers/internal-media.matcher";
import {MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/imports/list-writers/movies-import-list.writer";


const INTERNAL_MATCH_NOT_FOUND_REASON = "No internal movie match found";


export class MoviesMatcher implements MediaMatcher {
    constructor(
        private internalMatcher: InternalMediaMatcher,
        private listWriter: MoviesImportListWriter,
    ) {
    }

    static create(moviesService: MoviesService) {
        return new MoviesMatcher(
            new InternalMediaMatcher(ApiProviderType.TMDB, moviesService),
            new MoviesImportListWriter(moviesService),
        );
    }

    async* match(context: MediaMatcherContext, items: ImportMatcherItem[]) {
        if (items.length === 0) return;

        const { matched, unresolved } = await this.internalMatcher.match(items);
        const completedOutcomes = await this.listWriter.addMatchedItems(context.userId, matched);
        if (completedOutcomes.length > 0) {
            yield completedOutcomes;
        }

        if (unresolved.length > 0) {
            yield unresolved.map((item) => ({
                itemId: item.id,
                matchedMediaId: null,
                status: ImportItemStatus.SKIPPED,
                statusReason: INTERNAL_MATCH_NOT_FOUND_REASON,
            }));
        }
    }
}

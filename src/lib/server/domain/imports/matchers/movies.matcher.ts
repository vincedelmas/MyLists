import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {MoviesProviderService} from "@/lib/server/domain/media/movies/movies-provider.service";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {internalMediaMatcherPipeline} from "@/lib/server/domain/imports/matchers/internal-media.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/imports/list-writers/movies-import-list.writer";
import {MediaMatcher, MediaMatcherContext} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {MovieExternalImportResolver, TmdbMovieExternalImportResolver} from "@/lib/server/domain/imports/matchers/movie-external-import.resolver";


const MATCH_NOT_FOUND_REASON = "No movie match found";


export class MoviesMatcher implements MediaMatcher {
    constructor(
        private internalMatcherPipeline: ReturnType<typeof internalMediaMatcherPipeline>,
        private listWriter: MoviesImportListWriter,
        private externalResolver: MovieExternalImportResolver,
    ) {
    }

    static create(moviesService: MoviesService, moviesProviderService: MoviesProviderService) {
        return new MoviesMatcher(
            internalMediaMatcherPipeline([
                internalApiIdMatcher(ApiProviderType.TMDB, moviesService),
                internalNameDateMatcher(moviesService),
            ]),
            new MoviesImportListWriter(moviesService),
            new TmdbMovieExternalImportResolver(moviesService, moviesProviderService),
        );
    }

    async* match(context: MediaMatcherContext, items: ImportItemsSelect[]) {
        if (items.length === 0) return;

        const { matched, unresolved } = await this.internalMatcherPipeline.run(items);
        const completedOutcomes = await this.listWriter.addMatchedItems(context.userId, matched);
        if (completedOutcomes.length > 0) {
            yield completedOutcomes;
        }

        for await (const externalResult of this.externalResolver.resolve(unresolved)) {
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

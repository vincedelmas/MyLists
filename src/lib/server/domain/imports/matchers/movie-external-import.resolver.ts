import {ProviderSearchResult} from "@/lib/types/provider.types";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {ApiProviderType, ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";
import {MoviesProviderService} from "@/lib/server/domain/media/movies/movies-provider.service";


const MOVIE_API_MATCH_NOT_FOUND_REASON = "Movie API match not found";
const MOVIE_API_MATCH_AMBIGUOUS_REASON = "Movie API match is ambiguous";
const MOVIE_API_RESOLUTION_FAILED_PREFIX = "Movie API resolution failed";


export interface MovieExternalImportResolver {
    resolve(items: ImportItemsSelect[]): AsyncIterable<ExternalResolverResult>;
}


export class TmdbMovieExternalImportResolver implements MovieExternalImportResolver {
    constructor(
        private moviesService: MoviesService,
        private moviesProviderService: MoviesProviderService,
        private resultBatchSize = 50,
    ) {
    }

    async* resolve(items: ImportItemsSelect[]) {
        let batch = this._createEmptyBatch();

        for (const item of items) {
            try {
                if (this._hasTmdbExternalId(item)) {
                    const mediaId = await this.moviesService.resolveExternalMedia(item.externalApiId, this.moviesProviderService);
                    batch.matched.push({ item, mediaId });
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                if (!item.name) {
                    batch.skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const searchResults = await this.moviesProviderService.search(item.name);
                const candidates = this._filterCandidates(searchResults.data, item.releaseDate);

                if (candidates.length === 0) {
                    batch.skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                if (candidates.length > 1) {
                    batch.skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_AMBIGUOUS_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const [candidate] = candidates;
                const mediaId = await this.moviesService.resolveExternalMedia(candidate.id, this.moviesProviderService);
                batch.matched.push({ item, mediaId });
            }
            catch (error) {
                batch.failed.push(this._createFailedOutcome(item, error));
            }

            if (this._shouldFlush(batch)) {
                yield batch;
                batch = this._createEmptyBatch();
            }
        }

        if (this._hasResults(batch)) {
            yield batch;
        }
    }

    private _createEmptyBatch(): ExternalResolverResult {
        return {
            failed: [],
            matched: [],
            skipped: [],
            unresolved: [],
        };
    }

    private _shouldFlush(batch: ExternalResolverResult) {
        return batch.matched.length + batch.failed.length + batch.skipped.length + batch.unresolved.length >= this.resultBatchSize;
    }

    private _hasResults(batch: ExternalResolverResult) {
        return batch.matched.length > 0 || batch.failed.length > 0 || batch.skipped.length > 0 || batch.unresolved.length > 0;
    }

    private _hasTmdbExternalId(item: ImportItemsSelect): item is ImportItemsSelect & { externalApiId: string } {
        return item.externalApiSource === ApiProviderType.TMDB && !!item.externalApiId;
    }

    private _filterCandidates(candidates: ProviderSearchResult[], releaseDate: string | null) {
        const movieCandidates = candidates.filter((candidate) => candidate.itemType === MediaType.MOVIES);
        if (!releaseDate) return movieCandidates;

        return movieCandidates.filter((candidate) => {
            if (!candidate.date) return false;
            return String(candidate.date).startsWith(releaseDate);
        });
    }

    private _createSkippedOutcome(item: ImportItemsSelect, statusReason: string) {
        return {
            statusReason,
            itemId: item.id,
            matchedMediaId: null,
            status: ImportItemStatus.SKIPPED,
        };
    }

    private _createFailedOutcome(item: ImportItemsSelect, error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
            itemId: item.id,
            matchedMediaId: null,
            status: ImportItemStatus.FAILED,
            statusReason: `${MOVIE_API_RESOLUTION_FAILED_PREFIX}: ${errorMessage}`,
        };
    }
}

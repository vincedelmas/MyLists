import {logger} from "@/lib/server/core/logger";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {ApiProviderType, ImportItemStatus, MediaType} from "@/lib/utils/enums";
import {MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import {TmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const MOVIE_API_RES_FAILED_REASON = "API failed for this media";
const MOVIE_API_MATCH_NOT_FOUND_REASON = "Movie API match not found";
const MOVIE_API_MATCH_AMBIGUOUS_REASON = "Movie API match is ambiguous";


export class ExternalTMDBMovieMatcher implements ExternalMediaMatcher {
    constructor(
        private moviesProvider: TmdbMoviesProvider,
        private moviesIngestion: MediaIngestionService<UpsertMovieWithDetails>,
        private resultBatchSize = 50,
    ) {
    }

    async* match(items: ImportItemsSelect[]) {
        let batch = this._createEmptyBatch();

        for (const item of items) {
            try {
                if (this._hasTmdbExternalId(item)) {
                    const mediaId = await this.moviesIngestion.storeFromExternal(item.externalApiId, false);
                    batch.matched.push({ item, mediaId });
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const imdbId: string | undefined = item.payload.imdbId;
                if (!imdbId && !item.name) {
                    batch.skipped.push(this._createSkippedOutcome(item, MOVIE_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const candidateIds = imdbId
                    ? await this.moviesProvider.findMovieIdsByImdbId(imdbId)
                    : this._filterCandidates((await this.moviesProvider.search(item.name!)).data, item.name!, item.releaseDate)
                        .map(candidate => candidate.id);

                if (candidateIds.length === 0) {
                    batch.skipped.push(this._createSkippedOutcome(item, imdbId
                        ? `No TMDB movie found for IMDb ID ${imdbId}`
                        : MOVIE_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                if (candidateIds.length > 1) {
                    batch.skipped.push(this._createSkippedOutcome(item, imdbId
                        ? `Multiple TMDB movies found for IMDb ID ${imdbId}`
                        : MOVIE_API_MATCH_AMBIGUOUS_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const mediaId = await this.moviesIngestion.storeFromExternal(candidateIds[0], !!imdbId);
                batch.matched.push({ item, mediaId });
            }
            catch (error) {
                if (error instanceof ProviderRequestError && error.details.kind !== "item") {
                    if (this._hasResults(batch)) yield batch;
                    throw error;
                }
                this._logResolutionError(item, error);
                batch.failed.push(this._createFailedOutcome(item));
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

    private _filterCandidates(candidates: ProviderSearchResult[], name: string, releaseDate: string | null) {
        const title = name.trim().toLowerCase();
        const movieCandidates = candidates.filter(c => c.itemType === MediaType.MOVIES && c.name.trim().toLowerCase() === title);
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

    private _createFailedOutcome(item: ImportItemsSelect) {
        return {
            itemId: item.id,
            matchedMediaId: null,
            status: ImportItemStatus.FAILED,
            statusReason: MOVIE_API_RES_FAILED_REASON,
        };
    }

    private _logResolutionError(item: ImportItemsSelect, error: unknown) {
        logger.warn({
            err: error,
            itemId: item.id,
            name: item.name,
            jobId: item.jobId,
            imdbId: item.payload.imdbId,
            releaseDate: item.releaseDate,
            externalApiId: item.externalApiId,
            externalApiSource: item.externalApiSource,
        }, "Movie import API resolution failed");
    }
}

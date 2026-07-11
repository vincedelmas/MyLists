import {ProviderSearchResult} from "@/lib/types/provider.types";
import {TvMediaType, UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const TV_API_RES_FAILED_REASON = "API failed for this media";
const TV_API_MATCH_NOT_FOUND_REASON = "TV API match not found";
const TV_API_MATCH_AMBIGUOUS_REASON = "TV API match is ambiguous";


export class ExternalTMDBTvMatcher implements ExternalMediaMatcher {
    constructor(
        private mediaType: TvMediaType,
        private tvProvider: ExternalMediaProvider<UpsertTvWithDetails>,
        private tvIngestion: MediaIngestionService<UpsertTvWithDetails>,
        private resultBatchSize = 50,
    ) {
    }

    async* match(items: ImportItemsSelect[]) {
        let batch = this._createEmptyBatch();

        for (const item of items) {
            try {
                if (this._hasTmdbExternalId(item)) {
                    const mediaId = await this.tvIngestion.storeFromExternal(item.externalApiId, false);
                    batch.matched.push({ item, mediaId });
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                if (!item.name) {
                    batch.skipped.push(this._createSkippedOutcome(item, TV_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const searchResults = await this.tvProvider.search.search(item.name);
                const candidates = this._filterCandidates(searchResults.data, item.releaseDate);

                if (candidates.length === 0) {
                    batch.skipped.push(this._createSkippedOutcome(item, TV_API_MATCH_NOT_FOUND_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                if (candidates.length > 1) {
                    batch.skipped.push(this._createSkippedOutcome(item, TV_API_MATCH_AMBIGUOUS_REASON));
                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                    continue;
                }

                const mediaId = await this.tvIngestion.storeFromExternal(candidates[0].id, false);
                batch.matched.push({ item, mediaId });
            }
            catch (error) {
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

    private _filterCandidates(candidates: ProviderSearchResult[], releaseDate: string | null) {
        const tvCandidates = candidates.filter((candidate) => candidate.itemType === this.mediaType);
        if (!releaseDate) return tvCandidates;

        return tvCandidates.filter((candidate) => {
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
            statusReason: TV_API_RES_FAILED_REASON,
        };
    }

    private _logResolutionError(item: ImportItemsSelect, error: unknown) {
        console.warn("TV import API resolution failed", {
            error,
            itemId: item.id,
            name: item.name,
            jobId: item.jobId,
            mediaType: item.mediaType,
            releaseDate: item.releaseDate,
            externalApiId: item.externalApiId,
            externalApiSource: item.externalApiSource,
        });
    }
}

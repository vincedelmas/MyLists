import {ApiProviderType, ImportItemStatus} from "@/lib/utils/enums";
import {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";
import {GamesProviderService} from "@/lib/server/domain/media/games/games-provider.service";
import {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";


const PROVIDER_BATCH_SIZE = 500;
const GAME_API_RES_FAILED_REASON = "API failed for this media";


export class ExternalIGDBGamesMatcher implements ExternalMediaMatcher {
    constructor(
        private gamesProviderService: GamesProviderService,
        private resultBatchSize = 50,
    ) {
    }

    async* match(items: ImportItemsSelect[]) {
        let batch = this._createEmptyBatch();

        const igdbItems = items.filter((item): item is ImportItemsSelect & { externalApiId: string } => this._hasIgdbExternalId(item));
        const igdbItemIds = new Set(igdbItems.map((item) => item.id));
        for (const item of items) {
            if (!igdbItemIds.has(item.id)) {
                batch.unresolved.push(item);
                if (this._shouldFlush(batch)) {
                    yield batch;
                    batch = this._createEmptyBatch();
                }
            }
        }

        for (let offset = 0; offset < igdbItems.length; offset += PROVIDER_BATCH_SIZE) {
            const chunk = igdbItems.slice(offset, offset + PROVIDER_BATCH_SIZE);
            const chunkedApiIds = chunk.map((item) => item.externalApiId);

            try {
                const mediaIdByApiId = await this.gamesProviderService.resolveExternalMediaBatch(chunkedApiIds);
                for (const item of chunk) {
                    const mediaId = mediaIdByApiId.get(item.externalApiId);
                    if (mediaId) batch.matched.push({ item, mediaId });
                    else batch.unresolved.push(item);

                    if (this._shouldFlush(batch)) {
                        yield batch;
                        batch = this._createEmptyBatch();
                    }
                }
            }
            catch (error) {
                chunk.forEach((item) => {
                    this._logResolutionError(item, error);
                    batch.failed.push(this._createFailedOutcome(item));
                });
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

    private _hasIgdbExternalId(item: ImportItemsSelect): item is ImportItemsSelect & { externalApiId: string } {
        return item.externalApiSource === ApiProviderType.IGDB && !!item.externalApiId;
    }

    private _createFailedOutcome(item: ImportItemsSelect) {
        return {
            itemId: item.id,
            matchedMediaId: null,
            status: ImportItemStatus.FAILED,
            statusReason: GAME_API_RES_FAILED_REASON,
        };
    }

    private _logResolutionError(item: ImportItemsSelect, error: unknown) {
        console.warn("Game import API resolution failed", {
            error,
            itemId: item.id,
            name: item.name,
            jobId: item.jobId,
            releaseDate: item.releaseDate,
            externalApiId: item.externalApiId,
            externalApiSource: item.externalApiSource,
        });
    }
}

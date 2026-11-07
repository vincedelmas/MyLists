import {logger} from "@/lib/server/core/logger";
import {ImportItemStatus, MediaType} from "@/lib/utils/enums";
import type {ProviderSearchResult} from "@/lib/types/provider.types";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import type {ExternalResolverResult, ImportItemsSelect} from "@/lib/types/imports.types";


type ExternalMatch = { mediaId: number } | { statusReason: string };


interface MatchItemsProps {
    mediaLabel: string;
    resultBatchSize: number;
    items: ImportItemsSelect[];
    resolveItem: (item: ImportItemsSelect) => Promise<ExternalMatch>;
}


export async function* matchExternalItems({ items, resolveItem, mediaLabel, resultBatchSize }: MatchItemsProps): AsyncIterable<ExternalResolverResult> {
    let batchSize = 0;
    let batch: ExternalResolverResult = { failed: [], matched: [], skipped: [], unresolved: [] };

    for (const item of items) {
        try {
            const result = await resolveItem(item);
            if ("mediaId" in result) {
                batch.matched.push({ item, mediaId: result.mediaId });
            }
            else {
                batch.skipped.push({ itemId: item.id, matchedMediaId: null, status: ImportItemStatus.SKIPPED, ...result });
            }
        }
        catch (error) {
            if (error instanceof ProviderRequestError && error.details.kind !== "item") {
                if (batchSize > 0) yield batch;
                throw error;
            }

            logger.warn({
                err: error,
                itemId: item.id,
                name: item.name,
                jobId: item.jobId,
                mediaType: item.mediaType,
                imdbId: item.payload.imdbId,
                releaseDate: item.releaseDate,
                externalApiId: item.externalApiId,
                externalApiSource: item.externalApiSource,
            }, `${mediaLabel} import API resolution failed`);
            batch.failed.push({
                itemId: item.id,
                matchedMediaId: null,
                status: ImportItemStatus.FAILED,
                statusReason: "API failed for this media",
            });
        }

        batchSize++;

        if (batchSize >= resultBatchSize) {
            yield batch;
            batch = { failed: [], matched: [], skipped: [], unresolved: [] };
            batchSize = 0;
        }
    }

    if (batchSize > 0) yield batch;
}


export const filterImportCandidates = (candidates: ProviderSearchResult[], mediaType: MediaType, releaseDate: string | null, name?: string) => {
    const title = name?.trim().toLowerCase();

    return candidates.filter(candidate => candidate.itemType === mediaType
        && (title === undefined || candidate.name.trim().toLowerCase() === title)
        && (!releaseDate || !!candidate.date && String(candidate.date).startsWith(releaseDate)));
};

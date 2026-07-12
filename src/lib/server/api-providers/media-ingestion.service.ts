import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {
    ExternalMediaProvider,
    IngestionContext,
    MediaDetailsEnricher,
    MediaIngestionService,
    RefreshCandidateSource,
    RefreshPolicy
} from "@/lib/server/api-providers/interfaces.types";


export function createMediaIngestionService<TDetails>(params: {
    repository: BaseRepository<any>;
    provider: ExternalMediaProvider<TDetails>;
    refreshCandidates?: RefreshCandidateSource;
    enrichers?: MediaDetailsEnricher<TDetails>[];
    refreshPolicy?: RefreshPolicy;
}): MediaIngestionService<TDetails> {
    const { repository, provider, refreshCandidates, refreshPolicy, enrichers = [] } = params;

    async function applyEnrichers(details: TDetails, context: IngestionContext) {
        let enriched = details;

        for (const enricher of enrichers) {
            enriched = await enricher(enriched, context);
        }

        return enriched;
    }

    async function fetchAndPrepareDetails(apiId: number | string, context: IngestionContext) {
        const details = await provider.details.getDetails(apiId);
        return applyEnrichers(details, context);
    }

    async function storePreparedDetails(apiId: number | string, details: TDetails, context: IngestionContext) {
        const enriched = await applyEnrichers(details, context);
        const mediaId = await repository.storeMediaWithDetails(enriched);
        return [String(apiId), mediaId] as const;
    }

    async function* refreshBatch(apiIds: (number | string)[]) {
        try {
            const detailsByApiId = await provider.details.getDetailsBatch!(apiIds);

            for (const apiId of apiIds) {
                const details = detailsByApiId.get(String(apiId));

                if (!details) {
                    yield { apiId, state: "rejected" as const, reason: new Error("Missing bulk details response") };
                    continue;
                }

                try {
                    const enriched = await applyEnrichers(details, { mode: "refresh", isBulk: true });
                    await repository.updateMediaWithDetails(enriched);
                    yield { apiId, state: "fulfilled" as const, reason: undefined };
                }
                catch (reason) {
                    yield { apiId, state: "rejected" as const, reason };
                }
            }
        }
        catch (reason) {
            for (const apiId of apiIds) {
                yield { apiId, state: "rejected" as const, reason };
            }
        }
    }

    async function* refreshOneByOne(apiIds: (number | string)[]) {
        for (const apiId of apiIds) {
            try {
                const details = await fetchAndPrepareDetails(apiId, { mode: "refresh", isBulk: true });
                await repository.updateMediaWithDetails(details);
                yield { apiId, state: "fulfilled" as const, reason: undefined };
            }
            catch (reason) {
                yield { apiId, state: "rejected" as const, reason };
                if (refreshPolicy?.shouldAbortBulkRefresh?.(reason)) {
                    return;
                }
            }
        }
    }

    function* chunks(array: (number | string)[], chunkSize: number, limit?: number) {
        const maxItems = limit ? Math.min(limit, array.length) : array.length;

        for (let i = 0; i < maxItems; i += chunkSize) {
            yield array.slice(i, Math.min(i + chunkSize, maxItems));
        }
    }

    return {
        async storeFromExternal(apiId: number | string, checkInternalFirst: boolean = true) {
            if (checkInternalFirst) {
                const existingMedia = await repository.findByApiId(apiId);
                if (existingMedia) return existingMedia.id;
            }

            const details = await fetchAndPrepareDetails(apiId, { mode: "store", isBulk: false });
            return repository.storeMediaWithDetails(details);
        },

        async storeBatchFromExternal(apiIds: (number | string)[], checkInternalFirst: boolean = true) {
            const uniqueApiIds = [...new Map(apiIds.map((apiId) => [String(apiId), apiId])).values()];
            const mediaIdByApiId = new Map<string, number>();
            if (uniqueApiIds.length === 0) return mediaIdByApiId;

            if (checkInternalFirst) {
                const existingMedia = await repository.findByApiIds(uniqueApiIds);
                for (const media of existingMedia) {
                    mediaIdByApiId.set(String(media.apiId), media.id);
                }
            }

            const missingApiIds = uniqueApiIds.filter((apiId) => !mediaIdByApiId.has(String(apiId)));
            if (missingApiIds.length === 0) return mediaIdByApiId;

            if (provider.details.getDetailsBatch) {
                const detailsByApiId = await provider.details.getDetailsBatch(missingApiIds);
                for (const apiId of missingApiIds) {
                    const details = detailsByApiId.get(String(apiId));
                    if (!details) continue;

                    const [storedApiId, mediaId] = await storePreparedDetails(apiId, details, { mode: "store", isBulk: true });
                    mediaIdByApiId.set(storedApiId, mediaId);
                }

                return mediaIdByApiId;
            }

            for (const apiId of missingApiIds) {
                const details = await fetchAndPrepareDetails(apiId, { mode: "store", isBulk: true });
                const mediaId = await repository.storeMediaWithDetails(details);
                mediaIdByApiId.set(String(apiId), mediaId);
            }

            return mediaIdByApiId;
        },

        async refreshFromExternal(apiId: number | string, isBulk = false) {
            const details = await fetchAndPrepareDetails(apiId, { mode: "refresh", isBulk });
            return repository.updateMediaWithDetails(details);
        },

        async* bulkRefresh(limit?: number) {
            const apiIds = await refreshCandidates?.getCandidateApiIds() ?? [];

            const chunkSize = provider.details.getDetailsBatch
                ? refreshPolicy?.chunkSize ?? 100
                : apiIds.length || 1;

            for (const chunk of chunks(apiIds, chunkSize, limit)) {
                if (provider.details.getDetailsBatch) {
                    yield* refreshBatch(chunk);
                }
                else {
                    yield* refreshOneByOne(chunk);
                }
            }
        },
    };
}

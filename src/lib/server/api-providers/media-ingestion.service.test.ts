import {MediaType} from "@/lib/utils/enums";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {FormattedError} from "@/lib/utils/error-classes";


const transactionMocks = vi.hoisted(() => ({
    withTransaction: vi.fn(),
}));


vi.mock("@/lib/server/database/async-storage", () => transactionMocks);


describe("createMediaIngestionService", () => {
    beforeEach(() => {
        transactionMocks.withTransaction.mockReset();
        transactionMocks.withTransaction.mockImplementation(async (action) => action({}));
    });

    it("stops bulk one-by-one refresh when the refresh policy aborts on an error", async () => {
        const provider = {
            source: "jikan",
            mediaType: MediaType.MANGA,
            search: {
                search: vi.fn(),
            },
            details: {
                getDetails: vi.fn().mockRejectedValue(new FormattedError("Provider unavailable", { statusCode: 504 })),
            },
        } as const;

        const repository = {
            getMediaIdsToBeRefreshed: vi.fn().mockResolvedValue([1, 2, 3]),
            updateMediaWithDetails: vi.fn(),
        };

        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            refreshCandidates: {
                getCandidateApiIds: repository.getMediaIdsToBeRefreshed,
            },
            refreshPolicy: {
                shouldAbortBulkRefresh: (reason) => {
                    if (!(reason instanceof FormattedError)) return false;
                    const statusCode = reason?.args?.statusCode ?? 200;
                    return statusCode >= 500 && statusCode < 600;
                },
            },
        });

        const results = [];
        for await (const result of service.bulkRefresh()) {
            results.push(result);
        }

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ apiId: 1, state: "rejected" });
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);
        expect(repository.updateMediaWithDetails).not.toHaveBeenCalled();
    });

    it("runs each bulk media update in its own transaction", async () => {
        const provider = {
            source: "tmdb",
            mediaType: MediaType.SERIES,
            search: {
                search: vi.fn(),
            },
            details: {
                getDetails: vi.fn().mockImplementation(async (apiId) => ({ apiId })),
            },
        } as const;

        const repository = {
            getMediaIdsToBeRefreshed: vi.fn().mockResolvedValue([110492, 247718]),
            updateMediaWithDetails: vi.fn().mockResolvedValue(true),
        };

        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            refreshCandidates: {
                getCandidateApiIds: repository.getMediaIdsToBeRefreshed,
            },
        });

        const results = [];
        for await (const result of service.bulkRefresh()) {
            results.push(result);
        }

        expect(results).toEqual([
            { apiId: 110492, state: "fulfilled", reason: undefined },
            { apiId: 247718, state: "fulfilled", reason: undefined },
        ]);
        expect(transactionMocks.withTransaction).toHaveBeenCalledTimes(2);
        expect(repository.updateMediaWithDetails).toHaveBeenCalledTimes(2);
    });
});

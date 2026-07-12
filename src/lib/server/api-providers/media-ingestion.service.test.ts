import {MediaType} from "@/lib/utils/enums";
import {describe, expect, it, vi} from "vitest";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {FormattedError} from "@/lib/utils/error-classes";


describe("createMediaIngestionService", () => {
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
});

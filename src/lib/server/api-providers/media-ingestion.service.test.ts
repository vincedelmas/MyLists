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
            search: vi.fn(),
            getDetails: vi.fn().mockRejectedValue(new FormattedError("Provider unavailable", { statusCode: 504 })),
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
        expect(provider.getDetails).toHaveBeenCalledTimes(1);
        expect(repository.updateMediaWithDetails).not.toHaveBeenCalled();
    });

    it("runs each bulk media update in its own transaction", async () => {
        const provider = {
            search: vi.fn(),
            getDetails: vi.fn().mockImplementation(async (apiId) => ({ apiId })),
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

    it("opens a transaction only after external store details are prepared", async () => {
        let transactionActive = false;
        transactionMocks.withTransaction.mockImplementation(async (action) => {
            transactionActive = true;
            try {
                return await action({});
            }
            finally {
                transactionActive = false;
            }
        });

        const provider = {
            search: vi.fn(),
            getDetails: vi.fn().mockImplementation(async (apiId) => {
                expect(transactionActive).toBe(false);
                return { apiId };
            }),
        } as const;

        const enricher = vi.fn().mockImplementation(async (details) => {
            expect(transactionActive).toBe(false);
            return details;
        });
        const repository = {
            findByApiId: vi.fn().mockResolvedValue(undefined),
            storeMediaWithDetails: vi.fn().mockImplementation(async () => {
                expect(transactionActive).toBe(true);
                return 42;
            }),
        };
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            enrichers: [enricher],
        });

        await expect(service.storeFromExternal(123)).resolves.toBe(42);
        expect(transactionMocks.withTransaction).toHaveBeenCalledOnce();
        expect(repository.storeMediaWithDetails).toHaveBeenCalledOnce();
    });

    it("opens a transaction only after external refresh details are prepared", async () => {
        let transactionActive = false;
        transactionMocks.withTransaction.mockImplementation(async (action) => {
            transactionActive = true;
            try {
                return await action({});
            }
            finally {
                transactionActive = false;
            }
        });

        const provider = {
            search: vi.fn(),
            getDetails: vi.fn().mockImplementation(async (apiId) => {
                expect(transactionActive).toBe(false);
                return { apiId };
            }),
        } as const;

        const enricher = vi.fn().mockImplementation(async (details) => {
            expect(transactionActive).toBe(false);
            return details;
        });
        const repository = {
            updateMediaWithDetails: vi.fn().mockImplementation(async () => {
                expect(transactionActive).toBe(true);
                return true;
            }),
        };
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            enrichers: [enricher],
        });

        await expect(service.refreshFromExternal(123)).resolves.toBe(true);
        expect(transactionMocks.withTransaction).toHaveBeenCalledOnce();
        expect(repository.updateMediaWithDetails).toHaveBeenCalledOnce();
    });

    it("stores only unique missing ids through the provider batch capability", async () => {
        const provider = {
            search: vi.fn(),
            getDetails: vi.fn(),
            getDetailsBatch: vi.fn().mockResolvedValue(new Map([
                ["2", { apiId: 2 }],
            ])),
        };
        const repository = {
            findByApiIds: vi.fn().mockResolvedValue([{ id: 10, apiId: 1 }]),
            storeMediaWithDetails: vi.fn().mockResolvedValue(20),
        };
        const enricher = vi.fn().mockImplementation(async (details) => ({ ...details, enriched: true }));
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            enrichers: [enricher],
        });

        const result = await service.storeBatchFromExternal([1, "1", 2, 3]);

        expect(repository.findByApiIds).toHaveBeenCalledWith(["1", 2, 3]);
        expect(provider.getDetailsBatch).toHaveBeenCalledWith([2, 3]);
        expect(provider.getDetails).not.toHaveBeenCalled();
        expect(enricher).toHaveBeenCalledWith({ apiId: 2 }, { mode: "store", isBulk: true });
        expect(repository.storeMediaWithDetails).toHaveBeenCalledWith({ apiId: 2, enriched: true });
        expect(transactionMocks.withTransaction).toHaveBeenCalledOnce();
        expect(result).toEqual(new Map([
            ["1", 10],
            ["2", 20],
        ]));
    });

    it("falls back to fetching and storing batch ids one by one", async () => {
        const provider = {
            search: vi.fn(),
            getDetails: vi.fn().mockImplementation(async (apiId) => ({ apiId })),
        };
        const repository = {
            storeMediaWithDetails: vi.fn()
                .mockResolvedValueOnce(40)
                .mockResolvedValueOnce(50),
        };
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
        });

        const result = await service.storeBatchFromExternal([4, 5], false);

        expect(provider.getDetails).toHaveBeenNthCalledWith(1, 4);
        expect(provider.getDetails).toHaveBeenNthCalledWith(2, 5);
        expect(repository.storeMediaWithDetails).toHaveBeenCalledTimes(2);
        expect(transactionMocks.withTransaction).toHaveBeenCalledTimes(2);
        expect(result).toEqual(new Map([
            ["4", 40],
            ["5", 50],
        ]));
    });

    it("reports missing batch refresh details and per-item update failures independently", async () => {
        const updateError = new Error("Database update failed");
        const provider = {
            search: vi.fn(),
            getDetails: vi.fn(),
            getDetailsBatch: vi.fn().mockResolvedValue(new Map([
                ["1", { apiId: 1 }],
                ["3", { apiId: 3 }],
            ])),
        };
        const repository = {
            updateMediaWithDetails: vi.fn().mockImplementation(async ({ apiId }) => {
                if (apiId === 3) throw updateError;
                return true;
            }),
        };
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            refreshCandidates: {
                getCandidateApiIds: vi.fn().mockResolvedValue([1, 2, 3]),
            },
        });

        const results = [];
        for await (const result of service.bulkRefresh()) {
            results.push(result);
        }

        expect(results[0]).toEqual({ apiId: 1, state: "fulfilled", reason: undefined });
        expect(results[1]).toMatchObject({ apiId: 2, state: "rejected" });
        expect(results[1].reason).toMatchObject({ message: "Missing bulk details response" });
        expect(results[2]).toEqual({ apiId: 3, state: "rejected", reason: updateError });
        expect(repository.updateMediaWithDetails).toHaveBeenCalledTimes(2);
        expect(transactionMocks.withTransaction).toHaveBeenCalledTimes(2);
    });

    it("reports a rejected provider batch for every requested refresh id", async () => {
        const providerError = new Error("Provider batch failed");
        const provider = {
            search: vi.fn(),
            getDetails: vi.fn(),
            getDetailsBatch: vi.fn().mockRejectedValue(providerError),
        };
        const repository = {
            updateMediaWithDetails: vi.fn(),
        };
        const service = createMediaIngestionService({
            provider,
            repository: repository as any,
            refreshCandidates: {
                getCandidateApiIds: vi.fn().mockResolvedValue([1, 2]),
            },
        });

        const results = [];
        for await (const result of service.bulkRefresh()) {
            results.push(result);
        }

        expect(results).toEqual([
            { apiId: 1, state: "rejected", reason: providerError },
            { apiId: 2, state: "rejected", reason: providerError },
        ]);
        expect(repository.updateMediaWithDetails).not.toHaveBeenCalled();
        expect(transactionMocks.withTransaction).not.toHaveBeenCalled();
    });
});

import {FormattedError} from "@/lib/utils/error-classes";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ImportItemOutcome, ParsedImport} from "@/lib/types/imports.types";
import {MyListsCsvFileError} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


const { ImportService } = await import("@/lib/server/domain/imports/import.service");


vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


describe("ImportService.createImportJob", () => {
    const repository = {
        createJob: vi.fn(),
        markJobFailed: vi.fn(),
        markJobQueued: vi.fn(),
        getIssueItems: vi.fn(),
        countJobsAhead: vi.fn(),
        findJobForUser: vi.fn(),
        countFailedItems: vi.fn(),
        insertParsedItems: vi.fn(),
        deleteTerminalJob: vi.fn(),
        claimNextQueuedJob: vi.fn(),
        markItemsProcessing: vi.fn(),
        incrementJobCounters: vi.fn(),
        settleProcessingItems: vi.fn(),
        finalizeProcessingJob: vi.fn(),
        getQueuedItemsForProcessingJob: vi.fn(),
    };
    const parser = vi.fn();
    const service = new ImportService(repository as any, {
        [ImportSource.MYLISTS]: parser,
    });

    beforeEach(() => {
        vi.resetAllMocks();
        repository.createJob.mockResolvedValue({
            id: 10,
            userId: 42,
            source: ImportSource.MYLISTS,
            status: ImportJobStatus.PARSING,
        });
    });

    it("claims the next queued job for the drain worker", async () => {
        const job = { id: 10, status: ImportJobStatus.PROCESSING };
        repository.claimNextQueuedJob.mockResolvedValue(job);

        await expect(service.claimNextQueuedJob()).resolves.toBe(job);
    });

    it("finalizes an accounted processing job", async () => {
        const job = { id: 10, status: ImportJobStatus.COMPLETED };
        repository.finalizeProcessingJob.mockResolvedValue(job);

        await expect(service.finalizeProcessingJob(10)).resolves.toBe(job);
    });

    it("groups queued items by media type for matcher dispatch", async () => {
        const game = { id: 1, mediaType: MediaType.GAMES };
        const movie = { id: 2, mediaType: MediaType.MOVIES };
        repository.getQueuedItemsForProcessingJob.mockResolvedValue([game, movie]);

        const groups = await service.getQueuedItemsByMediaType(10);

        expect(groups.get(MediaType.GAMES)).toEqual([game]);
        expect(groups.get(MediaType.MOVIES)).toEqual([movie]);
    });

    it("increments counters only for item outcomes that actually transition", async () => {
        const outcomes = [
            { itemId: 1, status: ImportItemStatus.COMPLETED, matchedMediaId: 101 },
            { itemId: 2, status: ImportItemStatus.SKIPPED, statusReason: "Ambiguous" },
            { itemId: 3, status: ImportItemStatus.FAILED, statusReason: "Provider error" },
        ] as const;

        repository.settleProcessingItems.mockResolvedValue([
            { id: 1, status: ImportItemStatus.COMPLETED },
            { id: 3, status: ImportItemStatus.FAILED },
        ]);
        repository.incrementJobCounters.mockResolvedValue({ id: 10 });

        await expect(service.applyItemOutcomes(10, [...outcomes]))
            .resolves.toEqual([
                { id: 1, status: ImportItemStatus.COMPLETED },
                { id: 3, status: ImportItemStatus.FAILED },
            ]);

        expect(repository.incrementJobCounters).toHaveBeenCalledWith(10, {
            failedCount: 1,
            skippedCount: 0,
            completedCount: 1,
            processedCount: 2,
        });
    });

    it("commits large outcome sets in batches of 200", async () => {
        const outcomes: ImportItemOutcome[] = Array.from({ length: 401 }, (_, idx) => ({
            itemId: idx + 1,
            matchedMediaId: idx + 100,
            status: ImportItemStatus.COMPLETED,
        }));

        repository.settleProcessingItems.mockImplementation(async (_jobId: number, batch: ImportItemOutcome[]) => {
            return batch.map(outcome => ({ id: outcome.itemId, status: outcome.status }));
        });
        repository.incrementJobCounters.mockResolvedValue({ id: 10 });

        const applied = await service.applyItemOutcomes(10, outcomes);

        expect(applied).toHaveLength(401);
        expect(repository.settleProcessingItems).toHaveBeenCalledTimes(3);
        expect(repository.settleProcessingItems.mock.calls.map(call => call[1].length)).toEqual([200, 200, 1]);
        expect(repository.incrementJobCounters).toHaveBeenCalledTimes(3);
    });

    it("marks queued item IDs as processing", async () => {
        repository.markItemsProcessing.mockResolvedValue([{ id: 1 }, { id: 2 }]);

        await expect(service.markItemsProcessing(10, [1, 2]))
            .resolves.toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("persists parsed items and returns the queued job", async () => {
        const parsed = createParsedImport();
        const queuedJob = {
            id: 10,
            totalCount: 1,
            status: ImportJobStatus.QUEUED,
        };

        parser.mockReturnValue(parsed);
        repository.markJobQueued.mockResolvedValue(queuedJob);

        await expect(service.createImportJob(42, ImportSource.MYLISTS, "csv")).resolves.toBe(queuedJob);

        expect(repository.createJob).toHaveBeenCalledWith(42, ImportSource.MYLISTS);
        expect(repository.insertParsedItems).toHaveBeenCalledWith(10, parsed.items);
        expect(repository.markJobQueued).toHaveBeenCalledWith(10, 1, 0);
        expect(repository.markJobFailed).not.toHaveBeenCalled();
    });

    it("marks file-level parsing errors failed and returns the failed job", async () => {
        const failedJob = {
            id: 10,
            status: ImportJobStatus.FAILED,
            error: "Missing required CSV headers: status",
        };

        parser.mockImplementation(() => {
            throw new MyListsCsvFileError("Missing required CSV headers: status");
        });

        repository.markJobFailed.mockResolvedValue(failedJob);

        await expect(service.createImportJob(42, ImportSource.MYLISTS, "invalid")).resolves.toBe(failedJob);

        expect(repository.insertParsedItems).not.toHaveBeenCalled();
        expect(repository.markJobFailed).toHaveBeenCalledWith(10, failedJob.error);
    });

    it("creates a failed job for import sources that are not implemented", async () => {
        const serviceWithoutParser = new ImportService(repository as any, {});

        const failedJob = {
            id: 10,
            status: ImportJobStatus.FAILED,
            error: 'Import source "letterboxd" is not supported yet',
        };

        repository.markJobFailed.mockResolvedValue(failedJob);

        await expect(serviceWithoutParser.createImportJob(42, ImportSource.LETTERBOXD, "csv")).resolves.toBe(failedJob);
    });

    it("rejects when the parsing job changes state before it can be queued", async () => {
        parser.mockReturnValue(createParsedImport());

        repository.markJobQueued.mockResolvedValue(null);
        repository.markJobFailed.mockResolvedValue(null);

        await expect(service.createImportJob(42, ImportSource.MYLISTS, "csv"))
            .rejects.toThrow("Import job 10 is no longer in parsing state");
    });

    it("returns the number of jobs ahead of a queued job owned by the user", async () => {
        const job = {
            id: 10,
            userId: 42,
            status: ImportJobStatus.QUEUED,
            createdAt: "2024-01-01 00:00:00",
        };
        repository.findJobForUser.mockResolvedValue(job);
        repository.countJobsAhead.mockResolvedValue(2);

        await expect(service.getImportJob(42, 10)).resolves.toEqual({ job, jobsAhead: 2 });
        expect(repository.countJobsAhead).toHaveBeenCalledWith(job);
    });

    it("does not expose another user's import job", async () => {
        repository.findJobForUser.mockResolvedValue(undefined);

        await expect(service.getImportJob(999, 10)).rejects.toBeDefined();
        expect(repository.countJobsAhead).not.toHaveBeenCalled();
    });

    it("returns paginated issues only after verifying job ownership", async () => {
        repository.findJobForUser.mockResolvedValue({ id: 10, userId: 42 });
        repository.getIssueItems.mockResolvedValue({ items: [], total: 0 });

        await expect(service.getImportIssues(42, 10, 2, 25))
            .resolves.toEqual({ items: [], total: 0 });

        expect(repository.getIssueItems).toHaveBeenCalledWith(10, 2, 25);
    });

    it("deletes an owned terminal import job", async () => {
        repository.deleteTerminalJob.mockResolvedValue({ id: 10 });

        await expect(service.deleteImportJob(42, 10)).resolves.toEqual({ id: 10 });
        expect(repository.findJobForUser).not.toHaveBeenCalled();
    });

    it("rejects deletion of an active import job", async () => {
        repository.deleteTerminalJob.mockResolvedValue(null);
        repository.findJobForUser.mockResolvedValue({ id: 10, status: ImportJobStatus.QUEUED });

        await expect(service.deleteImportJob(42, 10)).rejects.toThrow(FormattedError);
    });
});


const createParsedImport = (): ParsedImport => ({
    totalCount: 1,
    failedCount: 0,
    items: [{
        rowNumber: 2,
        name: "Movie",
        statusReason: null,
        externalApiId: null,
        releaseDate: "2024",
        externalApiSource: null,
        mediaType: MediaType.MOVIES,
        status: ImportItemStatus.QUEUED,
        payload: { status: "Completed" },
    }],
});

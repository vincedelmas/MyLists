
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ParsedImport} from "@/lib/types/imports.types";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


const transactionMocks = vi.hoisted(() => ({
    withTransaction: vi.fn(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");


vi.mock("@/lib/server/database/async-storage", () => transactionMocks);


describe("ImportService.createImportJob", () => {
    const parser = vi.fn();
    const repository = {
        createJob: vi.fn(),
        markJobFailed: vi.fn(),
        markJobQueued: vi.fn(),
        getIssueItems: vi.fn(),
        countJobsAhead: vi.fn(),
        findJobForUser: vi.fn(),
        countFailedItems: vi.fn(),
        insertParsedItems: vi.fn(),
        deleteQueuedOrTerminalJob: vi.fn(),
        claimNextQueuedJob: vi.fn(),
        markItemsProcessing: vi.fn(),
        findActiveJobForUser: vi.fn(),
        incrementJobCounters: vi.fn(),
        settleProcessingItems: vi.fn(),
        finalizeProcessingJob: vi.fn(),
        markProcessingJobFailed: vi.fn(),
        requeueInterruptedJobs: vi.fn(),
        getQueuedItemsForProcessingJob: vi.fn(),
    };
    const service = new ImportService(repository as any, {
        [ImportSource.MYLISTS]: parser,
    });

    beforeEach(() => {
        vi.resetAllMocks();
        transactionMocks.withTransaction.mockImplementation((action) => action());
        repository.createJob.mockReturnValue({
            id: 10,
            userId: 42,
            source: ImportSource.MYLISTS,
            status: ImportJobStatus.PARSING,
        });
        repository.findActiveJobForUser.mockResolvedValue(null);
    });

    it("rejects when the parsing job changes state before it can be queued", async () => {
        parser.mockReturnValue(createParsedImport());

        repository.markJobQueued.mockReturnValue(null);
        repository.markJobFailed.mockReturnValue(null);

        await expect(service.createImportJob(42, ImportSource.MYLISTS, "csv"))
            .rejects.toThrow("The import could not be saved. Please try again.");
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

it("deletes an owned queued or terminal import job", async () => {
        repository.deleteQueuedOrTerminalJob.mockResolvedValue({ id: 10 });

        await expect(service.deleteImportJob(42, 10)).resolves.toEqual({ id: 10 });
        expect(repository.deleteQueuedOrTerminalJob).toHaveBeenCalledWith(10, 42);
        expect(repository.findJobForUser).not.toHaveBeenCalled();
    });

it("does not expose another user's job after deletion is refused", async () => {
        repository.deleteQueuedOrTerminalJob.mockResolvedValue(null);
        repository.findJobForUser.mockResolvedValue(undefined);

        await expect(service.deleteImportJob(999, 10)).rejects.toMatchObject({ isNotFound: true });
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

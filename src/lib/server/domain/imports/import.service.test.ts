import {ParsedImport} from "@/lib/types/imports.types";
import {beforeEach, describe, expect, it, vi} from "vitest";
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
        countFailedItems: vi.fn(),
        insertParsedItems: vi.fn(),
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

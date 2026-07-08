import {describe, expect, it, vi} from "vitest";
import {ImportItemsSelect} from "@/lib/types/imports.types";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {ImportItemStatus, ImportJobStatus, MediaType, Status} from "@/lib/utils/enums";


describe("ImportJobProcessor", () => {
    it("returns null when no queued job can be claimed", async () => {
        const importService = createImportServiceStub();
        const matcherRegistry = createMatcherRegistryStub();

        importService.claimNextQueuedJob.mockResolvedValue(null);

        const processor = new ImportJobProcessor(importService as any, matcherRegistry as any);

        await expect(processor.processNextJob()).resolves.toBeNull();
        expect(importService.getQueuedItemsByMediaType).not.toHaveBeenCalled();
    });

    it("marks queued items processing, dispatches only claimed items, applies yielded outcomes, and finalizes", async () => {
        const movieItem = createItem(1, MediaType.MOVIES);
        const skippedMovieItem = createItem(2, MediaType.MOVIES);
        const finalJob = { id: 10, status: ImportJobStatus.COMPLETED };
        const importService = createImportServiceStub();
        const matcher = {
            match: vi.fn().mockImplementation(async function* (_context, items: ImportItemsSelect[]) {
                yield [{ itemId: items[0].id, status: ImportItemStatus.COMPLETED, matchedMediaId: 101 }];
            }),
        };
        const matcherRegistry = createMatcherRegistryStub();

        importService.claimNextQueuedJob.mockResolvedValue({ id: 10, userId: 42 });
        importService.getQueuedItemsByMediaType.mockResolvedValue(new Map([[MediaType.MOVIES, [movieItem, skippedMovieItem]]]));
        importService.markItemsProcessing.mockResolvedValue([{ id: movieItem.id }]);
        importService.finalizeProcessingJob.mockResolvedValue(finalJob);
        matcherRegistry.get.mockReturnValue(matcher);

        const processor = new ImportJobProcessor(importService as any, matcherRegistry as any);

        await expect(processor.processNextJob()).resolves.toBe(finalJob);

        expect(importService.markItemsProcessing).toHaveBeenCalledWith(10, [1, 2]);
        expect(matcher.match).toHaveBeenCalledWith({ jobId: 10, userId: 42 }, [movieItem]);
        expect(importService.applyItemOutcomes).toHaveBeenCalledWith(10, [
            { itemId: 1, status: ImportItemStatus.COMPLETED, matchedMediaId: 101 },
        ]);
        expect(importService.finalizeProcessingJob).toHaveBeenCalledWith(10);
    });

    it("marks the claimed job failed and rethrows when processing crashes", async () => {
        const movieItem = createItem(1, MediaType.MOVIES);
        const error = new Error("Matcher missing");
        const importService = createImportServiceStub();
        const matcherRegistry = createMatcherRegistryStub();

        importService.claimNextQueuedJob.mockResolvedValue({ id: 10, userId: 42 });
        importService.getQueuedItemsByMediaType.mockResolvedValue(new Map([[MediaType.MOVIES, [movieItem]]]));
        importService.markItemsProcessing.mockResolvedValue([{ id: movieItem.id }]);
        matcherRegistry.get.mockImplementation(() => {
            throw error;
        });

        const processor = new ImportJobProcessor(importService as any, matcherRegistry as any);

        await expect(processor.processNextJob()).rejects.toBe(error);
        expect(importService.markProcessingJobFailed).toHaveBeenCalledWith(10, "Matcher missing");
    });
});


const createImportServiceStub = () => ({
    applyItemOutcomes: vi.fn(),
    claimNextQueuedJob: vi.fn(),
    markProcessingJobFailed: vi.fn(),
    markItemsProcessing: vi.fn(),
    finalizeProcessingJob: vi.fn(),
    getQueuedItemsByMediaType: vi.fn(),
});


const createMatcherRegistryStub = () => ({
    get: vi.fn(),
});


const createItem = (id: number, mediaType: MediaType): ImportItemsSelect => ({
    id,
    jobId: 10,
    mediaType,
    rowNumber: id + 1,
    statusReason: null,
    name: `Item ${id}`,
    releaseDate: "2024",
    externalApiId: null,
    matchedMediaId: null,
    externalApiSource: null,
    status: ImportItemStatus.QUEUED,
    createdAt: "2024-01-01 00:00:00",
    updatedAt: "2024-01-01 00:00:00",
    payload: { status: Status.COMPLETED },
});

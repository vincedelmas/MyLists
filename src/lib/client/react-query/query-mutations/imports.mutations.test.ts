import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {ImportJobStatus} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {allUserJobsOptions, importJobOptions, importJobQueryKey, importJobsQueryKey} from "../query-options/imports.options";
import {useDeleteImportJobMutation} from "./imports.mutations";


const server = vi.hoisted(() => ({
    getImportJob: vi.fn(),
    getAllUserJobs: vi.fn(),
    getImportJobIssues: vi.fn(),
    postCreateImportJob: vi.fn(),
    postDeleteImportJob: vi.fn(),
}));

let queryClient: QueryClient;
let unsubscribeJob: () => void;
let unsubscribeJobs: () => void;

vi.mock("@/lib/server/functions/imports", () => server);
vi.mock("@tanstack/react-query", async importOriginal => ({
    ...await importOriginal<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => queryClient,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(queryClient, options);
        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));


describe("deleting an import from an outdated queued view", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        queryClient.setQueryData(importJobQueryKey(1), { jobId: 1, status: ImportJobStatus.QUEUED });
        queryClient.setQueryData(importJobsQueryKey, [{ id: 1, status: ImportJobStatus.QUEUED }]);
        unsubscribeJob = new QueryObserver(queryClient, importJobOptions(1)).subscribe(() => {});
        unsubscribeJobs = new QueryObserver(queryClient, allUserJobsOptions()).subscribe(() => {});
    });

    afterEach(() => {
        unsubscribeJob();
        unsubscribeJobs();
        queryClient.clear();
    });

    it("preserves the error and reloads the active job and history when processing already started", async () => {
        const error = new FormattedError("This import has already started processing and cannot be deleted. Please wait for it to finish.");
        server.postDeleteImportJob.mockRejectedValue(error);
        server.getImportJob.mockResolvedValue({ jobId: 1, status: ImportJobStatus.PROCESSING });
        server.getAllUserJobs.mockResolvedValue([{ id: 1, status: ImportJobStatus.PROCESSING }]);

        await expect(useDeleteImportJobMutation(1).mutateAsync({ data: { jobId: 1 } })).rejects.toBe(error);

        expect(server.postDeleteImportJob).toHaveBeenCalledOnce();
        expect(server.getImportJob).toHaveBeenCalledOnce();
        expect(server.getAllUserJobs).toHaveBeenCalledOnce();
        expect(queryClient.getQueryData(importJobQueryKey(1))).toMatchObject({ status: ImportJobStatus.PROCESSING });
        expect(queryClient.getQueryData(importJobsQueryKey)).toEqual([{ id: 1, status: ImportJobStatus.PROCESSING }]);
    });
});

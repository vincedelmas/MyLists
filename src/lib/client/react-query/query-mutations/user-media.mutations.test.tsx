import {beforeEach, afterEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {useRemoveMediaFromListMutation, useUpdateCustomCoverMutation, useUpdateUserMediaMutation} from "./user-media.mutations";


const server = vi.hoisted(() => ({
    update: vi.fn(),
    remove: vi.fn(),
    cover: vi.fn(),
}));

let queryClient: QueryClient;

vi.mock("@tanstack/react-query", async (importOriginal) => ({
    ...await importOriginal<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => queryClient,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(queryClient, options);
        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));

vi.mock("@/lib/client/hooks/use-auth", () => ({ useAuth: () => ({ currentUser: { name: "alice" } }) }));
vi.mock("@/lib/schemas", () => import("@/lib/schemas/user-media.schema"));
vi.mock("@/lib/server/functions/user-media", () => ({
    postUpdateUserMedia: server.update,
    postRemoveMediaFromList: server.remove,
    postUpdateUserCustomCover: server.cover,
}));
vi.mock("@/lib/client/react-query/query-options", () => ({
    mediaDetailsOptions: (mediaType: MediaType, mediaId: number) => ({ queryKey: ["details", mediaType, mediaId] }),
    historyOptions: (mediaType: MediaType, mediaId: number) => ({ queryKey: ["onOpenHistory", mediaType, mediaId] }),
}));
vi.mock("@/lib/client/components/media/base/UserMediaDetails", () => ({ UserMediaDetails: () => null }));
vi.mock("@/lib/client/components/ui/dialog", () => ({
    Dialog: () => null,
    DialogContent: () => null,
    DialogDescription: () => null,
    DialogHeader: () => null,
    DialogTitle: () => null,
}));

const queryKey = ["userList", MediaType.SERIES, "alice", { status: [Status.WATCHING] as Status[] }] as const;
const queryOption = { queryKey } as ReturnType<typeof mediaListOptions>;
const item = { mediaId: 1, status: Status.WATCHING, rating: null, comment: "Review", customCover: null };
const initialList = {
    results: {
        items: [item],
        pagination: { page: 1, perPage: 25, totalItems: 26, totalPages: 2 },
    },
};
const refreshedList = {
    results: {
        items: [{ ...item, mediaId: 2 }],
        pagination: { page: 1, perPage: 25, totalItems: 25, totalPages: 1 },
    },
};
let fetchList: ReturnType<typeof vi.fn<() => Promise<typeof refreshedList>>>;
let unsubscribe: () => void;

const closeDialog = () => {
    const onOpenChange = vi.fn();
    const dialog = UserMediaEditDialog({
        dialogOpen: true,
        mediaType: MediaType.SERIES,
        userMedia: item as UserMediaItem,
        queryOption,
        onOpenChange,
    });
    const closing = dialog!.props.onOpenChange(false) as Promise<void>;
    expect(onOpenChange).toHaveBeenCalledWith(false);
    return closing;
};

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKey, initialList);
    fetchList = vi.fn().mockResolvedValue(refreshedList);
    const observer = new QueryObserver(queryClient, { queryKey, queryFn: fetchList });
    unsubscribe = observer.subscribe(() => {});
});

afterEach(() => {
    unsubscribe();
    queryClient.clear();
});

describe("list editing refresh timing", () => {
    it.each([
        { type: UpdateType.RATING, seasonRating: { season: 1, rating: 8 } },
        { type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 2 }] },
    ])("refreshes season details after a $type update without refreshing the edited list", async payload => {
        const seasonKey = ["tvSeasons", MediaType.SERIES, 1, 10] as const;
        queryClient.setQueryData(seasonKey, [{ season: 1, rating: null, redo: 0 }]);
        const fetchSeasons = vi.fn().mockResolvedValue([{ season: 1, rating: 8, redo: 2 }]);
        const observer = new QueryObserver(queryClient, { queryKey: seasonKey, queryFn: fetchSeasons });
        const unsubscribeSeasons = observer.subscribe(() => {});
        try {
            server.update.mockResolvedValueOnce({ ...item, rating: 8, redo: 2 });
            await useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption).mutateAsync({ payload });
            expect(server.update).toHaveBeenCalledWith({ data: { mediaType: MediaType.SERIES, mediaId: 1, payload } });
            expect(fetchSeasons).toHaveBeenCalledTimes(1);
            expect(queryClient.getQueryData(seasonKey)).toEqual([{ season: 1, rating: 8, redo: 2 }]);
            expect(fetchList).not.toHaveBeenCalled();
        }
        finally { unsubscribeSeasons(); }
    });

    it("keeps a newly completed item in the Watching list for rating until the dialog closes", async () => {
        const mutation = useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption);
        server.update.mockResolvedValueOnce({ ...item, status: Status.COMPLETED });
        await mutation.mutateAsync({ payload: { type: UpdateType.STATUS, status: Status.COMPLETED } });
        server.update.mockResolvedValueOnce({ ...item, status: Status.COMPLETED, rating: 8 });
        await mutation.mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });

        expect(fetchList).not.toHaveBeenCalled();
        expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items).toEqual([
            { ...item, status: Status.COMPLETED, rating: 8 },
        ]);

        await closeDialog();
        expect(fetchList).toHaveBeenCalledTimes(1);
        expect(queryClient.getQueryData(queryKey)).toEqual(refreshedList);
    });

    it("defers comment and custom-cover refreshes until closing too", async () => {
        server.update.mockResolvedValueOnce({ ...item, comment: null });
        await useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption)
            .mutateAsync({ payload: { type: UpdateType.COMMENT, comment: null } });
        server.cover.mockResolvedValueOnce({ ...item, customCover: "/custom.jpg" });
        await useUpdateCustomCoverMutation(queryOption).mutateAsync({ data: new FormData() });

        expect(fetchList).not.toHaveBeenCalled();
        expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items[0]).toMatchObject({
            comment: null,
            customCover: "/custom.jpg",
        });
        await closeDialog();
        expect(fetchList).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])("waits for an in-flight save before refreshing (failure: %s)", async (fail) => {
        let finish!: () => void;
        server.update.mockImplementationOnce(() => new Promise((resolve, reject) => {
            finish = () => fail ? reject(new Error("Save failed")) : resolve({ ...item, rating: 8 });
        }));
        const save = useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } })
            .catch(() => {});
        await vi.waitFor(() => expect(server.update).toHaveBeenCalledTimes(1));

        const closing = closeDialog();
        expect(fetchList).not.toHaveBeenCalled();
        finish();
        await Promise.all([save, closing]);
        expect(fetchList).toHaveBeenCalledTimes(1);
        expect(queryClient.getQueryData(queryKey)).toEqual(refreshedList);
    });

    it("refreshes page contents and totals immediately after deletion", async () => {
        server.remove.mockResolvedValueOnce(undefined);
        await useRemoveMediaFromListMutation(queryOption).mutateAsync({ data: { mediaType: MediaType.SERIES, mediaId: 1 } });

        expect(fetchList).toHaveBeenCalledTimes(1);
        expect(queryClient.getQueryData(queryKey)).toEqual(refreshedList);
    });
});

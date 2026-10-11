import {beforeEach, afterEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {tagNamesOptions} from "@/lib/client/react-query/query-options/user-media.options";

import {profilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {useEditTagMutation, useRemoveMediaFromListMutation, useUpdateUserMediaMutation, UserMediaQueryOption} from "./user-media.mutations";


const server = vi.hoisted(() => ({
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    cover: vi.fn(),
    deleteUpdates: vi.fn(),
    activityStats: vi.fn(),
    listFilters: vi.fn(),
    editTag: vi.fn(),
    tagNames: vi.fn(),
    correction: vi.fn(),
    toast: vi.fn(),
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
vi.mock("@/lib/client/components/ui/toast", () => ({ toast: { add: server.toast } }));
vi.mock("@/lib/client/components/activity/MonthlyActivityCorrection", () => ({
    requestActivityCorrection: server.correction,
}));
vi.mock("@/lib/schemas", () => import("@/lib/schemas/user-media.schema"));
vi.mock("@/lib/server/functions/user-media", () => ({
    postAddMediaToList: server.add,
    postUpdateUserMedia: server.update,
    postRemoveMediaFromList: server.remove,
    postUpdateUserCustomCover: server.cover,
    postDeleteUserUpdates: server.deleteUpdates,
    postEditUserTag: server.editTag,
    getUserTagNames: server.tagNames,
}));
vi.mock("@/lib/server/functions/user-monthly-activity", () => ({
    getMonthlyActivityStats: server.activityStats,
}));
vi.mock("@/lib/server/functions/media-lists", () => ({
    getMediaListFilters: server.listFilters,
}));
vi.mock("@/lib/server/functions/profile-pins", () => ({ getProfilePins: vi.fn(), getOwnProfilePins: vi.fn() }));
vi.mock("@/lib/client/react-query/query-options", () => ({
    mediaDetailsOptions: (mediaType: MediaType, mediaId: number) => ({ queryKey: ["details", mediaType, mediaId] }),
    historyOptions: (mediaType: MediaType, mediaId: number) => ({ queryKey: ["onOpenHistory", mediaType, mediaId] }),
    profileOptions: (username: string) => ({ queryKey: ["profile", username] }),
    profileHeaderOptions: (username: string) => ({ queryKey: ["profile", "header", username] }),
    profileRecentFeedOptions: (username: string) => ({ queryKey: ["profile", "recent-feed", username] }),
    profileSummaryOptions: (username: string) => ({ queryKey: ["profile", "summary", username] }),
    continueOptions: (username: string) => ({ queryKey: ["continue", username] }),
    tagNamesOptions: (mediaType: MediaType) => ({ queryKey: ["tagNames", mediaType] }),
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

describe("list filter freshness", () => {
    it.each(["details", "userList"] as const)("reloads tag names and counts after removing the last tagged title from %s", async source => {
        const namesOptions = tagNamesOptions(MediaType.MOVIES, true);
        const tagsKey = ["tagsView", MediaType.MOVIES, "alice"];
        const otherUserKey = ["tagsView", MediaType.MOVIES, "bob"];
        const otherMediaKey = tagNamesOptions(MediaType.BOOKS, true).queryKey;
        queryClient.setQueryData(namesOptions.queryKey, [{ name: "Favorites" }]);
        queryClient.setQueryData(tagsKey, [{ tagName: "Favorites", totalCount: 1 }]);
        for (const key of [otherUserKey, otherMediaKey]) queryClient.setQueryData(key, []);
        const fetchTags = vi.fn().mockResolvedValue([]);
        const observer = new QueryObserver(queryClient, { queryKey: tagsKey, queryFn: fetchTags });
        const unsubscribeTags = observer.subscribe(() => {});
        const mutationKey = source === "details"
            ? ["details", MediaType.MOVIES, 3] as const
            : ["userList", MediaType.MOVIES, "alice", {}] as const;
        const mutationOptions = { queryKey: mutationKey } as UserMediaQueryOption;

        try {
            server.remove.mockResolvedValueOnce(undefined);
            server.tagNames.mockResolvedValueOnce([]);
            await useRemoveMediaFromListMutation(mutationOptions)
                .mutateAsync({ data: { mediaType: MediaType.MOVIES, mediaId: 3 } });

            expect(fetchTags).toHaveBeenCalledTimes(1);
            expect(queryClient.getQueryData(tagsKey)).toEqual([]);
            expect(await queryClient.fetchQuery(namesOptions)).toEqual([]);
            expect(server.tagNames).toHaveBeenCalledTimes(1);
            expect(queryClient.getQueryState(otherUserKey)?.isInvalidated).toBe(false);
            expect(queryClient.getQueryState(otherMediaKey)?.isInvalidated).toBe(false);
        }
        finally { unsubscribeTags(); }
    });

    it.each([TagAction.RENAME, TagAction.DELETE_ALL])("refreshes tracking tags and cached tag names after %s", async action => {
        const listKey = ["userList", MediaType.MOVIES, "alice", {}];
        const detailsKey = ["details", MediaType.MOVIES, 3];
        const otherUserKey = ["userList", MediaType.MOVIES, "bob", {}];
        const otherMediaKey = ["userList", MediaType.BOOKS, "alice", {}];
        const namesKey = ["tagNames", MediaType.MOVIES];
        const pinsKey = profilePinsOptions("alice").queryKey;
        const otherPinsKey = profilePinsOptions("bob").queryKey;
        const previous = [{ name: "Old name" }, { name: "Keep" }];
        const tags = action === TagAction.RENAME ? [{ name: "New name" }, { name: "Keep" }] : [{ name: "Keep" }];
        queryClient.setQueryData(namesKey, previous);
        for (const key of [pinsKey, otherPinsKey]) queryClient.setQueryData(key, { items: [], activeMediaTypes: [] });
        for (const key of [listKey, detailsKey, otherUserKey, otherMediaKey]) queryClient.setQueryData(key, { tags: previous });
        server.editTag.mockResolvedValueOnce(action === TagAction.RENAME ? { name: "New name" } : undefined);

        await useEditTagMutation(MediaType.MOVIES).mutateAsync({
            action,
            tag: action === TagAction.RENAME ? { name: "New name", oldName: "Old name" } : { name: "Old name" },
        });

        expect(queryClient.getQueryState(namesKey)?.isInvalidated).toBe(true);
        server.tagNames.mockResolvedValueOnce(tags);
        expect(await queryClient.fetchQuery(tagNamesOptions(MediaType.MOVIES, true))).toEqual(tags);
        expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(detailsKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(otherUserKey)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(otherMediaKey)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(pinsKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(otherPinsKey)?.isInvalidated).toBe(false);
    });

});

describe("profile progress refresh", () => {
it.each([Status.WATCHING, Status.COMPLETED])("refreshes progress and totals without reloading highlights or another user's profile (%s)", async status => {
        const progressKeys = [
            ["continue", "alice"],
            ["profile", "recent-feed", "alice"],
            ["profile", "summary", "alice"],
            ["profile", "header", "alice"],
            ["userList", "header", "alice", MediaType.SERIES],
            ["allUpdates", "alice", {}],
            [...profilePinsOptions("alice").queryKey],
        ];
        const stableKeys = [
            ["profile", "alice"],
            ["profile", "bob"],
            ["profile", "recent-feed", "bob"],
            ["profile", "summary", "bob"],
            ["profile", "header", "bob"],
            ["userList", "header", "bob", MediaType.SERIES],
            ["continue", "bob"],
            [...profilePinsOptions("bob").queryKey],
        ];
        const queries = [...progressKeys, ...stableKeys].map(key => {
            queryClient.setQueryData(key, { version: "before" });
            const fetch = vi.fn().mockResolvedValue({ version: "after" });
            const observer = new QueryObserver(queryClient, { queryKey: key, queryFn: fetch });
            return { key, fetch, unsubscribe: observer.subscribe(() => {}) };
        });

        try {
            server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, currentEpisode: 10, status } });
            await useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption)
                .mutateAsync({ payload: { type: UpdateType.TV, currentEpisode: 10 } });

            for (const query of queries.slice(0, progressKeys.length)) {
                expect(query.fetch).toHaveBeenCalledTimes(1);
                expect(queryClient.getQueryData(query.key)).toEqual({ version: "after" });
            }
            for (const query of queries.slice(progressKeys.length)) {
                expect(query.fetch).not.toHaveBeenCalled();
                expect(queryClient.getQueryState(query.key)?.isInvalidated).toBe(false);
                expect(queryClient.getQueryData(query.key)).toEqual({ version: "before" });
            }
        }
        finally { queries.forEach(query => query.unsubscribe()); }
    });

});


describe("activity correction choices", () => {
    const preview = { version: "a".repeat(64), progressRemoved: 20, redoRemoved: 0, months: [] };
    const payload = { type: UpdateType.TV, currentEpisode: 3 };

    it("submits the chosen month, refreshes activity, and reports the applied correction", async () => {
        const activityKey = ["monthly-activity", "alice"];
        queryClient.setQueryData(activityKey, { total: 120 });
        const choice = { version: preview.version, startMonth: "2026-08" };
        server.update.mockResolvedValueOnce({ kind: "correction-required", preview })
            .mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, currentEpisode: 3 },
                activityCorrection: { changes: [], unrecordedProgress: 0, unrecordedRedo: 0, keptHistory: false } });
        server.correction.mockResolvedValueOnce(choice);

        await useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption).mutateAsync({ payload });

        expect(server.update).toHaveBeenLastCalledWith({ data: { mediaType: MediaType.SERIES, mediaId: 1, payload, activityCorrection: choice } });
        expect(queryClient.getQueryState(activityKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items[0]).toMatchObject({ currentEpisode: 3 });
        expect(server.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Progress and activity corrected." }));
    });

    it("asks again when another edit changes the preview before confirmation", async () => {
        const changedPreview = { ...preview, version: "b".repeat(64), progressRemoved: 30 };
        server.update.mockResolvedValueOnce({ kind: "correction-required", preview })
            .mockResolvedValueOnce({ kind: "correction-required", preview: changedPreview });
        server.correction.mockResolvedValueOnce({ version: preview.version }).mockResolvedValueOnce(null);

        await useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption).mutateAsync({ payload });

        expect(server.correction).toHaveBeenNthCalledWith(2, MediaType.SERIES, changedPreview);
        expect(queryClient.getQueryData(queryKey)).toEqual(initialList);
        expect(server.toast).not.toHaveBeenCalled();
    });
});


describe("list editing refresh timing", () => {

    it("keeps a newly completed item in the Watching list for rating until the dialog closes", async () => {
        const mutation = useUpdateUserMediaMutation(MediaType.SERIES, 1, queryOption);
        server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, status: Status.COMPLETED } });
        await mutation.mutateAsync({ payload: { type: UpdateType.STATUS, status: Status.COMPLETED } });
        server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, status: Status.COMPLETED, rating: 8 } });
        await mutation.mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });

        expect(fetchList).not.toHaveBeenCalled();
        expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items).toEqual([
            { ...item, status: Status.COMPLETED, rating: 8 },
        ]);

        await closeDialog();
        expect(fetchList).toHaveBeenCalledTimes(1);
        expect(queryClient.getQueryData(queryKey)).toEqual(refreshedList);
    });

});

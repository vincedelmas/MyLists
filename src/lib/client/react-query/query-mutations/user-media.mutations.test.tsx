import {beforeEach, afterEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {createUserMediaCache} from "@/lib/client/components/media/user-media-cache";
import {tagNamesOptions} from "@/lib/client/react-query/query-options/user-media.options";

import {profilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {useAddMediaToListMutation, useEditTagMutation, useRemoveMediaFromListMutation, useUpdateCustomCoverMutation, useUpdateUserMediaMutation, useUpdateUserMediaNotificationsMutation} from "./user-media.mutations";


const server = vi.hoisted(() => ({
    capture: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    cover: vi.fn(),
    notifications: vi.fn(),
    deleteUpdates: vi.fn(),
    activityStats: vi.fn(),
    listFilters: vi.fn(),
    editTag: vi.fn(),
    tagNames: vi.fn(),
    correction: vi.fn(),
    toast: vi.fn(),
}));

vi.mock("@/lib/client/analytics", () => ({ captureEvent: server.capture }));

let queryClient: QueryClient;

vi.mock("@tanstack/react-query", async (importOriginal) => ({
    ...await importOriginal<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => queryClient,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(queryClient, options);
        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));

vi.mock("@/lib/client/hooks/use-auth", () => ({ useAuth: () => ({ currentUser: { id: 1, name: "alice" } }) }));
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
    postUpdateUserMediaNotifications: server.notifications,
    postDeleteUserUpdates: server.deleteUpdates,
    postEditUserTag: server.editTag,
    getUserTagNames: server.tagNames,
}));
vi.mock("@/lib/server/functions/tv-seasons", () => ({ getTvSeasons: vi.fn() }));
vi.mock("@/lib/server/functions/user-monthly-activity", () => ({
    getMonthlyActivityStats: server.activityStats,
}));
vi.mock("@/lib/server/functions/media-lists", () => ({
    getMediaListFilters: server.listFilters,
}));
vi.mock("@/lib/server/functions/profile-pins", () => ({ getProfilePins: vi.fn(), getOwnProfilePins: vi.fn() }));
vi.mock("@/lib/client/react-query/query-options/media.options", () => ({
    mediaDetailsOptions: (mediaType: MediaType, mediaId: number) => ({ queryKey: ["details", mediaType, mediaId] }),
}));
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
const item = { currentEpisode: 0, mediaId: 1, status: Status.WATCHING, rating: null, comment: "Review", customCover: null };
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

let editing: ReturnType<ReturnType<typeof createUserMediaCache>["startEditing"]>;
const closeDialog = async (onEdited?: () => Promise<void>) => {
    if (await editing.finish()) await onEdited?.();
};

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    editing = createUserMediaCache(queryClient, "alice", MediaType.SERIES, 1).startEditing();
    queryClient.setQueryData(queryKey, initialList);
    fetchList = vi.fn().mockResolvedValue(refreshedList);
    const observer = new QueryObserver(queryClient, { queryKey, queryFn: fetchList });
    unsubscribe = observer.subscribe(() => {});
});

afterEach(() => {
    editing.stop();
    unsubscribe();
    queryClient.clear();
});

describe("list filter freshness", () => {
    it("reloads tag names and counts after removing the last tagged title", async () => {
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

        try {
            server.remove.mockResolvedValueOnce(undefined);
            server.tagNames.mockResolvedValueOnce([]);
            await useRemoveMediaFromListMutation(MediaType.MOVIES, 3)
                .mutateAsync({ data: { mediaType: MediaType.MOVIES, mediaId: 3 } });

            expect(fetchTags).toHaveBeenCalledTimes(1);
            expect(queryClient.getQueryData(tagsKey)).toEqual([]);
            expect(await queryClient.query(namesOptions)).toEqual([]);
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
        server.editTag.mockResolvedValueOnce({ tagNames: tags });

        await useEditTagMutation(MediaType.MOVIES).mutateAsync({
            action,
            tag: action === TagAction.RENAME ? { name: "New name", oldName: "Old name" } : { name: "Old name" },
        });

        expect(queryClient.getQueryData(namesKey)).toEqual(tags);
        expect(server.tagNames).not.toHaveBeenCalled();
        expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(detailsKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(otherUserKey)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(otherMediaKey)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(pinsKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(otherPinsKey)?.isInvalidated).toBe(false);
    });

});

describe("profile progress refresh", () => {
it.each([Status.WATCHING, Status.COMPLETED])("marks secondary progress stale and refreshes only the feed (%s)", async status => {
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
            await useUpdateUserMediaMutation(MediaType.SERIES, 1)
                .mutateAsync({ payload: { type: UpdateType.TV, currentEpisode: 10 } });

            for (const query of queries.slice(0, progressKeys.length)) {
                if (query.key[1] === "recent-feed") {
                    await vi.waitFor(() => expect(queryClient.getQueryData(query.key)).toEqual({ version: "after" }));
                }
                else {
                    expect(query.fetch).not.toHaveBeenCalled();
                    expect(queryClient.getQueryState(query.key)?.isInvalidated).toBe(true);
                }
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

        await useUpdateUserMediaMutation(MediaType.SERIES, 1).mutateAsync({ payload });

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

        await useUpdateUserMediaMutation(MediaType.SERIES, 1).mutateAsync({ payload });

        expect(server.correction).toHaveBeenNthCalledWith(2, MediaType.SERIES, changedPreview);
        expect(queryClient.getQueryData(queryKey)).toEqual(initialList);
        expect(server.toast).not.toHaveBeenCalled();
    });
});


describe("list editing refresh timing", () => {

    it("keeps a newly completed item in the Watching list for rating until the dialog closes", async () => {
        const mutation = useUpdateUserMediaMutation(MediaType.SERIES, 1);
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


describe("immediate saved media feedback", () => {
    it("applies consecutive saves while the feed is stalled and ignores an older list response", async () => {
        const slowFeed = Promise.withResolvers<string[]>();
        const staleList = Promise.withResolvers<typeof initialList>();
        const feedKey = ["profile", "recent-feed", "alice"];
        queryClient.setQueryData(feedKey, ["before"]);
        const observer = new QueryObserver(queryClient, { queryKey: feedKey, queryFn: () => slowFeed.promise });
        const stopFeed = observer.subscribe(() => {});
        fetchList.mockReturnValueOnce(staleList.promise);
        const staleFetch = queryClient.refetchQueries({ queryKey }).catch(() => {});
        try {
            const mutation = useUpdateUserMediaMutation(MediaType.SERIES, 1);
            for (const rating of [7, 8]) {
                server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, rating } });
                await mutation.mutateAsync({ payload: { type: UpdateType.RATING, rating } });
                expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items[0].rating).toBe(rating);
                expect(queryClient.getQueryState(feedKey)?.fetchStatus).toBe("fetching");
            }
            staleList.resolve(initialList);
            await staleFetch;
            expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items[0].rating).toBe(8);
        }
        finally {
            slowFeed.resolve(["after"]);
            staleList.resolve(initialList);
            stopFeed();
        }
    });

    it("does not invalidate progress-only queries for a rating edit", async () => {
        const stable = [["continue", "alice"], ["release-calendar", "alice"], ["profile", "header", "alice"],
            ["userList", "header", "alice", MediaType.SERIES], ["monthly-activity", "alice"], ["tvSeasons", MediaType.SERIES, 1]];
        for (const key of stable) queryClient.setQueryData(key, { before: true });
        const summaryKey = ["profile", "summary", "alice"];
        queryClient.setQueryData(summaryKey, { average: 4 });
        server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, rating: 8 } });
        await useUpdateUserMediaMutation(MediaType.SERIES, 1)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });
        for (const key of stable) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
    });
});


describe("media identity cache synchronization", () => {
    it("updates details and every cached own list without changing another user's tracking data", async () => {
        const secondPage = ["userList", MediaType.SERIES, "alice", { page: 2 }];
        const otherUser = ["userList", MediaType.SERIES, "bob", {}];
        const otherMedia = ["userList", MediaType.BOOKS, "alice", {}];
        const detailsKey = ["details", MediaType.SERIES, 1];
        const details = { media: { name: "Title" }, userMedia: { ...item, tags: [{ name: "Keep" }] } };
        for (const key of [secondPage, otherUser, otherMedia]) queryClient.setQueryData(key, initialList);
        queryClient.setQueryData(detailsKey, details);
        server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, rating: 8 } });

        await useUpdateUserMediaMutation(MediaType.SERIES, 1)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });

        for (const key of [queryKey, secondPage]) {
            expect(queryClient.getQueryData<typeof initialList>(key)?.results.items[0].rating).toBe(8);
        }
        expect(queryClient.getQueryData<typeof details>(detailsKey)).toEqual({
            ...details, userMedia: { ...details.userMedia, rating: 8 },
        });
        for (const key of [otherUser, otherMedia]) expect(queryClient.getQueryData(key)).toEqual(initialList);
        expect(fetchList).not.toHaveBeenCalled();
    });

    it("waits for this title's save on close, but not another title of the same media type", async () => {
        const selected = Promise.withResolvers<{ kind: "saved"; userMedia: typeof item }>();
        const other = Promise.withResolvers<{ kind: "saved"; userMedia: typeof item }>();
        server.update.mockReturnValueOnce(selected.promise).mockReturnValueOnce(other.promise);
        const saving = useUpdateUserMediaMutation(MediaType.SERIES, 1)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });
        await vi.waitFor(() => expect(server.update).toHaveBeenCalledTimes(1));
        const otherSaving = useUpdateUserMediaMutation(MediaType.SERIES, 2)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 6 } });
        await vi.waitFor(() => expect(server.update).toHaveBeenCalledTimes(2));
        const onEdited = vi.fn().mockResolvedValue(undefined);
        const closing = closeDialog(onEdited);

        try {
            expect(fetchList).not.toHaveBeenCalled();
            expect(onEdited).not.toHaveBeenCalled();
            selected.resolve({ kind: "saved", userMedia: item });
            await saving;
            await vi.waitFor(() => expect(onEdited).toHaveBeenCalledTimes(1));
            await closing;
            expect(queryClient.isMutating({ mutationKey: ["userMediaEdit", MediaType.SERIES, 2] })).toBe(1);
            expect(fetchList).toHaveBeenCalledTimes(1);
        }
        finally {
            selected.resolve({ kind: "saved", userMedia: item });
            other.resolve({ kind: "saved", userMedia: { ...item, mediaId: 2 } });
            await Promise.all([saving, otherSaving, closing]);
        }
    });

    it("adds by identity and updates membership without overwriting another user's rating", async () => {
        const otherUser = ["userList", MediaType.SERIES, "bob", {}];
        const otherList = { results: { ...initialList.results, items: [{ ...item, rating: 4, common: false }] } };
        const detailsKey = ["details", MediaType.SERIES, 1];
        queryClient.setQueryData(otherUser, otherList);
        queryClient.setQueryData(detailsKey, { media: {}, userMedia: null });
        server.add.mockResolvedValueOnce(item);

        await useAddMediaToListMutation().mutateAsync({ data: { mediaType: MediaType.SERIES, mediaId: 1 } });

        expect(queryClient.getQueryData<typeof otherList>(otherUser)?.results.items[0]).toMatchObject({ rating: 4, common: true });
        expect(queryClient.getQueryState(detailsKey)?.isInvalidated).toBe(true);
        expect(fetchList).toHaveBeenCalledTimes(1);
    });

    it("removes own entries and membership while preserving other users' entries", async () => {
        // An inactive list exposes the immediate cache update before the next server read.
        unsubscribe();
        const otherUser = ["userList", MediaType.SERIES, "bob", {}];
        const otherList = { results: { ...initialList.results, items: [{ ...item, rating: 4, common: true }] } };
        const detailsKey = ["details", MediaType.SERIES, 1];
        queryClient.setQueryData(otherUser, otherList);
        queryClient.setQueryData(detailsKey, { media: {}, userMedia: item });
        server.remove.mockResolvedValueOnce(undefined);

        await useRemoveMediaFromListMutation(MediaType.SERIES, 1)
            .mutateAsync({ data: { mediaType: MediaType.SERIES, mediaId: 1 } });

        expect(queryClient.getQueryData<typeof initialList>(queryKey)?.results.items).toEqual([]);
        expect(queryClient.getQueryData<typeof otherList>(otherUser)?.results.items).toEqual([{ ...item, rating: 4, common: false }]);
        expect(queryClient.getQueryData(detailsKey)).toEqual({ media: {}, userMedia: null });
    });

    it.each([TagAction.ADD, TagAction.DELETE_ONE])("updates editor tags after %s and preserves list tag IDs until close", async action => {
        const detailsKey = ["details", MediaType.SERIES, 1];
        const tag = { name: "Favorites" };
        const details = { media: {}, userMedia: { ...item, tags: action === TagAction.ADD ? [] : [tag] } };
        const list = { results: { ...initialList.results, items: [{ ...item, tags: [{ id: 7, name: "Keep" }] }] } };
        queryClient.setQueryData(detailsKey, details);
        queryClient.setQueryData(queryKey, list);
        server.editTag.mockResolvedValueOnce({ tag, tagNames: action === TagAction.ADD ? [tag] : [] });

        await useEditTagMutation(MediaType.SERIES, 1).mutateAsync({ tag, action });

        expect(queryClient.getQueryData<typeof details>(detailsKey)?.userMedia.tags).toEqual(action === TagAction.ADD ? [tag] : []);
        expect(queryClient.getQueryData<typeof list>(queryKey)?.results.items[0].tags).toEqual([{ id: 7, name: "Keep" }]);
        expect(fetchList).not.toHaveBeenCalled();
        await closeDialog();
        expect(fetchList).toHaveBeenCalledTimes(1);
    });

    it("updates custom cover and notification preferences in details and cached lists", async () => {
        const detailsKey = ["details", MediaType.SERIES, 1];
        const details = { media: {}, userMedia: { ...item, releaseNotificationsEnabled: true } };
        queryClient.setQueryData(detailsKey, details);
        server.cover.mockResolvedValueOnce({ mediaId: 1, customCover: "new-cover.jpg" });
        server.notifications.mockResolvedValueOnce(undefined);

        await useUpdateCustomCoverMutation(MediaType.SERIES, 1)
            .mutateAsync({ data: { mediaType: MediaType.SERIES, mediaId: 1, imageUrl: "https://example.com/cover.jpg" } });
        await useUpdateUserMediaNotificationsMutation(MediaType.SERIES, 1)
            .mutateAsync({ data: { mediaType: MediaType.SERIES, mediaId: 1, releaseNotificationsEnabled: false } });

        expect(queryClient.getQueryData<typeof details>(detailsKey)?.userMedia)
            .toMatchObject({ customCover: "new-cover.jpg", releaseNotificationsEnabled: false });
        const listItem = queryClient.getQueryData<typeof initialList>(queryKey)?.results.items[0];
        expect(listItem).toMatchObject({ customCover: "new-cover.jpg" });
        expect(listItem).not.toHaveProperty("releaseNotificationsEnabled");
        expect(fetchList).not.toHaveBeenCalled();
    });
});


describe("editor refresh decisions", () => {
    it("does not refresh an untouched editor or call its completion callback", async () => {
        const onEdited = vi.fn().mockResolvedValue(undefined);
        await closeDialog(onEdited);
        expect(fetchList).not.toHaveBeenCalled();
        expect(onEdited).not.toHaveBeenCalled();
    });

    it("does not refresh after a failed save", async () => {
        server.update.mockRejectedValueOnce(new Error("Save failed"));
        await expect(useUpdateUserMediaMutation(MediaType.SERIES, 1)
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } })).rejects.toThrow("Save failed");
        expect(server.capture).not.toHaveBeenCalled();
        await closeDialog();
        expect(fetchList).not.toHaveBeenCalled();
    });

    it("does not refresh after a cancelled correction", async () => {
        server.update.mockResolvedValueOnce({ kind: "correction-required", preview: { version: "a".repeat(64) } });
        server.correction.mockResolvedValueOnce(null);
        await useUpdateUserMediaMutation(MediaType.SERIES, 1)
            .mutateAsync({ payload: { type: UpdateType.TV, currentEpisode: 3 } });
        expect(server.capture).not.toHaveBeenCalled();
        await closeDialog();
        expect(fetchList).not.toHaveBeenCalled();
    });
});


describe("media edit analytics", () => {
    it.each([undefined, "details", "list_dialog"] as const)("records the successful edit source %s", async source => {
        server.update.mockResolvedValueOnce({ kind: "saved", userMedia: { ...item, rating: 8 } });
        await useUpdateUserMediaMutation(MediaType.SERIES, 1, { source })
            .mutateAsync({ payload: { type: UpdateType.RATING, rating: 8 } });
        expect(server.capture).toHaveBeenCalledExactlyOnceWith("media_updated", {
            media_type: MediaType.SERIES, source: source ?? "details",
        });
    });
});


describe("authoritative editor caches", () => {
    it.each([
        { type: UpdateType.RATING, seasonRating: { season: 1, rating: 8.5 } },
        { type: UpdateType.RATING, rating: 8.5 },
        { type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 2 }] },
        { type: UpdateType.STATUS, status: Status.PLAN_TO_WATCH },
    ])("applies saved seasons and history without a follow-up request ($type)", async payload => {
        const seasonsKey = ["tvSeasons", MediaType.SERIES, 1, 1];
        const historyKey = ["onOpenHistory", MediaType.SERIES, 1];
        const otherUserKey = ["tvSeasons", MediaType.SERIES, 1, 2];
        const oldSeasons = [{ season: 1, rating: 2.5, redo: 0, episodes: 8 }];
        const savedSeasons = [{ season: 1, rating: 8.5, redo: 2, episodes: 8 }];
        const history = [{ id: 7 }];
        for (const key of [seasonsKey, otherUserKey]) queryClient.setQueryData(key, oldSeasons);
        queryClient.setQueryData(historyKey, []);
        const fetchSeasons = vi.fn();
        const fetchHistory = vi.fn();
        const stopSeasons = new QueryObserver(queryClient, { queryKey: seasonsKey, queryFn: fetchSeasons }).subscribe(() => {});
        const stopHistory = new QueryObserver(queryClient, { queryKey: historyKey, queryFn: fetchHistory }).subscribe(() => {});
        try {
            server.update.mockResolvedValueOnce({ kind: "saved", userMedia: item, seasons: savedSeasons, history });
            await useUpdateUserMediaMutation(MediaType.SERIES, 1).mutateAsync({ payload });
            expect(queryClient.getQueryData(seasonsKey)).toEqual(savedSeasons);
            expect(queryClient.getQueryData(historyKey)).toEqual(history);
            expect(queryClient.getQueryData(otherUserKey)).toEqual(oldSeasons);
            expect(fetchSeasons).not.toHaveBeenCalled();
            expect(fetchHistory).not.toHaveBeenCalled();
        }
        finally { stopSeasons(); stopHistory(); }
    });

    it("cancels an older season read before applying a confirmed save", async () => {
        const key = ["tvSeasons", MediaType.SERIES, 1, 1];
        const before = [{ season: 1, rating: 2.5, redo: 0, episodes: 8 }];
        const after = [{ ...before[0], rating: 8.5 }];
        const oldRead = Promise.withResolvers<typeof before>();
        queryClient.setQueryData(key, before);
        const stop = new QueryObserver(queryClient, { queryKey: key, queryFn: () => oldRead.promise }).subscribe(() => {});
        const fetching = queryClient.refetchQueries({ queryKey: key });
        try {
            server.update.mockResolvedValueOnce({ kind: "saved", userMedia: item, seasons: after, history: [] });
            await useUpdateUserMediaMutation(MediaType.SERIES, 1)
                .mutateAsync({ payload: { type: UpdateType.RATING, seasonRating: { season: 1, rating: 8.5 } } });
            oldRead.resolve(before);
            await fetching;
            expect(queryClient.getQueryData(key)).toEqual(after);
        }
        finally { oldRead.resolve(before); stop(); }
    });

    it("finishes a tag edit without refetching the editor or unrelated active queries", async () => {
        const namesKey = ["tagNames", MediaType.SERIES];
        const tagsKey = ["tagsView", MediaType.SERIES, "alice"];
        const detailsKey = ["details", MediaType.SERIES, 1];
        const tag = { name: "Favorites" };
        queryClient.setQueryData(namesKey, [tag]);
        queryClient.setQueryData(tagsKey, [{ tagName: tag.name, totalCount: 1 }]);
        queryClient.setQueryData(detailsKey, { media: {}, userMedia: { ...item, tags: [tag] } });
        const fetchNames = vi.fn();
        const fetchTags = vi.fn();
        const stopNames = new QueryObserver(queryClient, { queryKey: namesKey, queryFn: fetchNames }).subscribe(() => {});
        const stopTags = new QueryObserver(queryClient, { queryKey: tagsKey, queryFn: fetchTags }).subscribe(() => {});
        try {
            server.editTag.mockResolvedValueOnce({ tagNames: [] });
            await useEditTagMutation(MediaType.SERIES, 1).mutateAsync({ tag, action: TagAction.DELETE_ONE });
            expect(queryClient.getQueryData(namesKey)).toEqual([]);
            expect(queryClient.getQueryData<{ userMedia: { tags: unknown[] } }>(detailsKey)?.userMedia.tags).toEqual([]);
            expect(queryClient.getQueryState(tagsKey)?.isInvalidated).toBe(true);
            expect(fetchNames).not.toHaveBeenCalled();
            expect(fetchTags).not.toHaveBeenCalled();
        }
        finally { stopNames(); stopTags(); }
    });
});

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {collectionDetailsEditOptions, collectionDetailsReadQueryKey} from "../query-options/collections.options";
import {useDeleteCollectionMutation, useToggleCollectionLikeMutation} from "./collections.mutations";


const server = vi.hoisted(() => ({
    getCommunityCollections: vi.fn(),
    getEditCollectionDetails: vi.fn(),
    getMediaCommunityCollections: vi.fn(),
    getReadCollectionDetails: vi.fn(),
    getUserCollectionMemberships: vi.fn(),
    postAddMediaToCollection: vi.fn(),
    postCopyCollection: vi.fn(),
    postCreateCollection: vi.fn(),
    postDeleteCollection: vi.fn(),
    postRemoveMediaFromCollection: vi.fn(),
    postToggleCollectionLike: vi.fn(),
    postUpdateCollection: vi.fn(),
}));

let queryClient: QueryClient;
let unsubscribers: (() => void)[];

vi.mock("@/lib/server/functions/collections", () => server);
vi.mock("@tanstack/react-query", async importOriginal => ({
    ...await importOriginal<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => queryClient,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(queryClient, options);
        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));

beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    unsubscribers = [];
});

afterEach(() => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
    queryClient.clear();
});


describe("collection mutations", () => {
    it("refreshes summaries after deletion without reloading the deleted viewer or editor before navigation", async () => {
        const readKey = [...collectionDetailsReadQueryKey(7), {}, false];
        const editKey = collectionDetailsEditOptions(7).queryKey;
        const summaryKey = ["collections", "user", "hub", {}];
        const fetchDeleted = vi.fn().mockRejectedValue(new Error("Collection not found"));
        const fetchSummary = vi.fn().mockResolvedValue({ items: [] });

        for (const queryKey of [readKey, editKey]) {
            queryClient.setQueryData(queryKey, { collection: { id: 7 } });
            unsubscribers.push(new QueryObserver(queryClient, { queryKey, queryFn: fetchDeleted }).subscribe(() => {}));
        }
        queryClient.setQueryData(summaryKey, { items: [{ id: 7 }] });
        unsubscribers.push(new QueryObserver(queryClient, { queryKey: summaryKey, queryFn: fetchSummary }).subscribe(() => {}));

        await useDeleteCollectionMutation(7).mutateAsync({ data: { collectionId: 7 } });

        expect(fetchDeleted).not.toHaveBeenCalled();
        for (const queryKey of [readKey, editKey]) {
            expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
            expect(queryClient.getQueryState(queryKey)?.status).toBe("success");
        }
        expect(fetchSummary).toHaveBeenCalledOnce();
        expect(queryClient.getQueryData(summaryKey)).toEqual({ items: [] });
    });

    it.each([
        { isLiked: true, likeCount: 10 },
        { isLiked: false, likeCount: 8 },
    ])("synchronizes stale filtered caches with the saved like state ($isLiked)", async result => {
        const firstKey = [...collectionDetailsReadQueryKey(7), {}, false];
        const filteredKey = [...collectionDetailsReadQueryKey(7), { search: "movie" }, false];
        const otherKey = [...collectionDetailsReadQueryKey(8), {}, false];
        const firstData = { isLiked: false, collection: { id: 7, likeCount: 2 }, items: [{ mediaId: 1 }] };
        const filteredData = { isLiked: true, collection: { id: 7, likeCount: 5 }, items: [] };
        const otherData = { isLiked: false, collection: { id: 8, likeCount: 4 }, items: [] };
        queryClient.setQueryData(firstKey, firstData);
        queryClient.setQueryData(filteredKey, filteredData);
        queryClient.setQueryData(otherKey, otherData);
        server.postToggleCollectionLike.mockResolvedValueOnce(result);

        await useToggleCollectionLikeMutation(7).mutateAsync({ data: { collectionId: 7 } });

        expect(queryClient.getQueryData(firstKey)).toEqual({
            ...firstData, isLiked: result.isLiked, collection: { ...firstData.collection, likeCount: result.likeCount },
        });
        expect(queryClient.getQueryData(filteredKey)).toEqual({
            ...filteredData, isLiked: result.isLiked, collection: { ...filteredData.collection, likeCount: result.likeCount },
        });
        expect(queryClient.getQueryData(otherKey)).toEqual(otherData);
    });
});

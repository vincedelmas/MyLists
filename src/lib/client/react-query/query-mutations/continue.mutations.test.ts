import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient, QueryObserver} from "@tanstack/react-query";
import {MediaType, Status} from "@/lib/utils/enums";
import {ContinueItem, continueOptions} from "@/lib/client/react-query/query-options/continue.options";
import {useContinueMediaMutation} from "./continue.mutations";

const mocks = vi.hoisted(() => ({ capture: vi.fn(), save: vi.fn(), toast: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/client/analytics", () => ({ captureEvent: mocks.capture }));
let queryClient: QueryClient;

vi.mock("@tanstack/react-query", async (importOriginal) => ({
    ...await importOriginal<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => queryClient,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(queryClient, options);
        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/lib/client/hooks/use-auth", () => ({ useAuth: () => ({ currentUser: { name: "alice" } }) }));
vi.mock("@/lib/client/components/ui/toast", () => ({ toast: { add: mocks.toast } }));
vi.mock("@/lib/server/functions/continue", () => ({ postContinueMedia: mocks.save, getContinueMedia: vi.fn() }));
vi.mock("@/lib/server/functions/profile-pins", () => ({ getProfilePins: vi.fn(), getOwnProfilePins: vi.fn() }));
vi.mock("@/lib/client/react-query/query-options/media.options", () => ({
    mediaDetailsOptions: (type: MediaType, id: number) => ({ queryKey: ["details", type, id] }),
}));
vi.mock("@/lib/client/react-query/query-options", async () => ({
    ...await import("@/lib/client/react-query/query-options/continue.options"),
    mediaDetailsOptions: (type: MediaType, id: number) => ({ queryKey: ["details", type, id] }),
    historyOptions: (type: MediaType, id: number) => ({ queryKey: ["onOpenHistory", type, id] }),
    profileHeaderOptions: (name: string) => ({ queryKey: ["profile", "header", name] }),
    profileSummaryOptions: (name: string) => ({ queryKey: ["profile", "summary", name] }),
    profileRecentFeedOptions: (name: string) => ({ queryKey: ["profile", "recent-feed", name] }),
}));

const item = {
    mediaType: MediaType.MANGA, mediaId: 1, mediaName: "Manga", status: Status.READING, currentChapter: 7, chapters: 100,
} as ContinueItem;
const initial = { mediaTypes: [MediaType.MANGA], items: [item], counts: { [MediaType.MANGA]: 1 },
    pagination: { page: 1, perPage: 12, totalItems: 1, totalPages: 1 } };
const queryKey = continueOptions("alice").queryKey;

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKey, initial);
    queryClient.setQueryData(["profile", "alice"], { expensive: true });
});
afterEach(() => queryClient.clear());

describe("Continue quick updates", () => {

    it("allows the next save while the feed is still loading and ignores an older Continue response", async () => {
        const staleContinue = Promise.withResolvers<typeof initial>();
        const slowFeed = Promise.withResolvers<string[]>();
        const feedKey = ["profile", "recent-feed", "alice"];
        queryClient.setQueryData(feedKey, ["old feed"]);
        const observer = new QueryObserver(queryClient, { queryKey: feedKey, queryFn: () => slowFeed.promise });
        const unsubscribe = observer.subscribe(() => {});
        const staleFetch = queryClient.query({ queryKey, queryFn: () => staleContinue.promise, staleTime: 0 }).catch(() => {});
        const mutation = useContinueMediaMutation(item);

        for (const currentChapter of [8, 9]) {
            const updatedItem = { ...item, currentChapter };
            mocks.save.mockResolvedValueOnce({ item: updatedItem, completed: false });
            await mutation.mutateAsync();
            expect(queryClient.getQueryData(queryKey)).toEqual({ ...initial, items: [updatedItem] });
            expect(queryClient.getQueryState(feedKey)?.fetchStatus).toBe("fetching");
        }

        expect(mocks.capture).toHaveBeenCalledTimes(2);
        expect(mocks.capture).toHaveBeenLastCalledWith("media_updated", { media_type: MediaType.MANGA, source: "continue" });
        expect(mocks.save).toHaveBeenCalledTimes(2);
        expect(mocks.save).toHaveBeenLastCalledWith({ data: { mediaType: MediaType.MANGA, mediaId: 1 } });
        expect(queryClient.getQueryState(["profile", "alice"])?.isInvalidated).toBe(false);
        expect(mocks.toast).not.toHaveBeenCalled();

        staleContinue.resolve(initial);
        await staleFetch;
        expect(queryClient.getQueryData(queryKey)?.items[0]).toMatchObject({ currentChapter: 9 });
        slowFeed.resolve(["7 → 9"]);
        await vi.waitFor(() => expect(queryClient.getQueryData(feedKey)).toEqual(["7 → 9"]));
        unsubscribe();
    });

it("removes a completed card and offers its details without changing another user's preview", async () => {
        queryClient.setQueryData(continueOptions("bob").queryKey, initial);
        mocks.save.mockResolvedValueOnce({ item: null, completed: true });
        await useContinueMediaMutation(item).mutateAsync();

        expect(queryClient.getQueryData(queryKey)?.items).toEqual([]);
        expect(queryClient.getQueryData(continueOptions("bob").queryKey)).toEqual(initial);
        expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Marked completed", description: "Manga" }));
        mocks.toast.mock.calls[0][0].actionProps.onClick();
        expect(mocks.navigate).toHaveBeenCalledWith({ to: "/details/$mediaType/$mediaId", params: { mediaType: MediaType.MANGA, mediaId: 1 } });
    });

    it("updates every cached page and preview and removes newly finished titles only from previews", async () => {
        const pageKey = continueOptions("alice", { activeTab: MediaType.MANGA, page: 2 }).queryKey;
        const previewKey = continueOptions("alice", { preview: true }).queryKey;
        queryClient.setQueryData(pageKey, initial);
        queryClient.setQueryData(previewKey, initial);
        const updatedItem = { ...item, currentChapter: 100 };
        mocks.save.mockResolvedValueOnce({ item: updatedItem, completed: false });
        await useContinueMediaMutation(item).mutateAsync();
        expect(queryClient.getQueryData(pageKey)?.items).toEqual([updatedItem]);
        expect(queryClient.getQueryData(previewKey)?.items).toEqual([]);
        expect(queryClient.getQueryState(pageKey)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(previewKey)?.isInvalidated).toBe(true);
    });

    it("preserves saved progress when the request fails", async () => {
        mocks.save.mockRejectedValueOnce(new Error("Save failed"));
        await expect(useContinueMediaMutation(item).mutateAsync()).rejects.toThrow("Save failed");
        expect(mocks.capture).not.toHaveBeenCalled();
        expect(queryClient.getQueryData(queryKey)).toEqual(initial);
        expect(mocks.toast).not.toHaveBeenCalled();
    });
});

it("identifies a pending quick update by its title", async () => {
    const save = Promise.withResolvers<{ item: ContinueItem; completed: boolean }>();
    mocks.save.mockReturnValueOnce(save.promise);
    const saving = useContinueMediaMutation(item).mutateAsync();
    try {
        await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
        expect(queryClient.isMutating({ mutationKey: ["userMediaEdit", item.mediaType, item.mediaId] })).toBe(1);
        expect(queryClient.isMutating({ mutationKey: ["userMediaEdit", item.mediaType, item.mediaId + 1] })).toBe(0);
    }
    finally {
        save.resolve({ item, completed: false });
        await saving;
    }
});

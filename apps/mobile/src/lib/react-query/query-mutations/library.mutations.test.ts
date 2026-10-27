import {beforeEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient} from "@tanstack/react-query";


const mocks = vi.hoisted(() => ({ save: vi.fn() }));


let client: QueryClient;


vi.mock("../../api-client", () => ({ api: { libraryAction: mocks.save } }));


vi.mock("@tanstack/react-query", async original => ({
    ...await original<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => client,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(client, options);

        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));


import {useLibraryAction} from "./library.mutations";


beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ saved: true });
    client = new QueryClient();

    for (const key of [
        ["lists", "library", "", 1],
        ["profile", undefined, "extras"],
        ["settings", "profile"],
        ["profile", undefined, "continue"],
        ["media", "movies", 1],
        [
            "collections",
            "community",
            {}
        ],
        ["collections", "details", 1],
    ]) {
        client.setQueryData(key, {});
    }
});


describe("saved-list refresh scope", () => {
    it.each([
        [
            {
                action: "pin",
                kind: "collection",
                id: 1,
                pinned: true
            },
            true
        ],
        [
            { action: "delete", kind: "collection", id: 1 },
            true
        ],
        [
            {
                action: "collection",
                id: 1,
                title: "Title",
                privacy: "private",
                ordered: false
            },
            false
        ],
    ] as const)("refreshes saved-list changes without refreshing unrelated media for %j", async (input, refreshPins) => {
        const dismiss = vi.fn();

        await useLibraryAction(dismiss).mutateAsync(input);

        expect(dismiss).toHaveBeenCalledOnce();
        expect(client.getQueryState(["lists", "library", "", 1])?.isInvalidated).toBe(true);
        expect(client.getQueryState(["profile", undefined, "extras"])?.isInvalidated).toBe(true);
        expect(client.getQueryState(["settings", "profile"])?.isInvalidated).toBe(refreshPins);
        expect(client.getQueryState(["profile", undefined, "continue"])?.isInvalidated).toBe(false);
        expect(client.getQueryState(["media", "movies", 1])?.isInvalidated).toBe(false);
        const refreshCollections = input.action === "collection" || input.action === "delete";
        expect(client.getQueryState([
            "collections",
            "community",
            {}
        ])?.isInvalidated).toBe(refreshCollections);
        expect(client.getQueryState(["collections", "details", 1])?.isInvalidated).toBe(refreshCollections);
    });
});

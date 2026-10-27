import {beforeEach, describe, expect, it, vi} from "vitest";
import {MutationObserver, QueryClient} from "@tanstack/react-query";


const mocks = vi.hoisted(() => ({ save: vi.fn(), notify: vi.fn() }));


let client: QueryClient;


vi.mock("../../auth-client", () => ({ authClient: { $store: { notify: mocks.notify } } }));


vi.mock("../../api-client", () => ({ api: { saveSettings: mocks.save } }));


vi.mock("@tanstack/react-query", async original => ({
    ...await original<typeof import("@tanstack/react-query")>(),
    useQueryClient: () => client,
    useMutation: (options: ConstructorParameters<typeof MutationObserver>[1]) => {
        const observer = new MutationObserver(client, options);

        return { mutateAsync: observer.mutate.bind(observer) };
    },
}));


import {useSettingsMutation} from "./settings.mutations";


beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ saved: true });
    client = new QueryClient();
    for (const key of [["settings", "profile"], ["profile", undefined, "extras"], ["profile", undefined, "continue"], ["lists", "library", ""], ["media", "movies", 1], ["settings", "security"]]) client.setQueryData(key, {});
});


describe("settings refresh scope", () => {
    it.each([
        [
            {
                section: "pin",
                kind: "collection",
                id: 1,
                pinned: true
            },
            "extras",
            "continue"
        ],
        [
            { section: "profile", showContinue: false },
            "continue",
            "extras"
        ],
    ] as const)("refreshes only affected profile data for %j", async (input, affected, unaffected) => {
        await useSettingsMutation().mutateAsync(input);
        expect(client.getQueryState(["settings", "profile"])?.isInvalidated).toBe(true);
        expect(client.getQueryState(["profile", undefined, affected])?.isInvalidated).toBe(true);
        for (const key of [["profile", undefined, unaffected], ["lists", "library", ""], ["media", "movies", 1], ["settings", "security"]]) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
        expect(mocks.notify).not.toHaveBeenCalled();
    });
});

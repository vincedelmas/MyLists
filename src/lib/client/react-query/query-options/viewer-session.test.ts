import {QueryClient} from "@tanstack/react-query";
import {describe, expect, it} from "vitest";
import {resetCacheForViewerTransition} from "./viewer-session";


describe("viewer session cache transitions", () => {
    it("clears the previous principal's cache and retains only the new session", () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(["currentUser"], { id: 1 });
        queryClient.setQueryData(["details", "movies", 42, { viewer: 1 }], { private: true });

        expect(resetCacheForViewerTransition(
            queryClient,
            1,
            2,
            ["currentUser"],
            { id: 2 },
        )).toBe(true);
        expect(queryClient.getQueryData(["currentUser"])).toEqual({ id: 2 });
        expect(queryClient.getQueryData(["details", "movies", 42, { viewer: 1 }])).toBeUndefined();
        expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    });

    it("preserves warm data when the principal did not change", () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(["profile", "owner"], { visible: true });

        expect(resetCacheForViewerTransition(queryClient, 7, 7, ["currentUser"], { id: 7 })).toBe(false);
        expect(queryClient.getQueryData(["profile", "owner"])).toEqual({ visible: true });
    });
});

import {describe, expect, it, vi} from "vitest";
import {createMemoryHistory, createRootRoute, createRoute, createRouter, type AnyRoute} from "@tanstack/react-router";
import {Route as importsRoute} from "./imports";
import {Route as indexRoute} from "./imports/index";
import {Route as mylistsRoute} from "./imports/mylists";
import {Route as letterboxdRoute} from "./imports/letterboxd";
import {Route as imdbRoute} from "./imports/imdb";


vi.mock("@/lib/client/components/imports/ImportUploadForm", () => ({ ImportUploadForm: () => null }));
vi.mock("@/lib/client/components/user-settings/ExistingImportsPanel", () => ({ ExistingImportsPanel: () => null }));


function createImportsRouter(url: string) {
    const root = createRootRoute();
    const imports = createRoute({ ...importsRoute.options as AnyRoute["options"], getParentRoute: () => root, path: "/settings/imports" });
    const index = createRoute({ ...indexRoute.options as AnyRoute["options"], getParentRoute: () => imports, path: "/" });
    const mylists = createRoute({ ...mylistsRoute.options as AnyRoute["options"], getParentRoute: () => imports, path: "mylists" });
    const letterboxd = createRoute({ ...letterboxdRoute.options as AnyRoute["options"], getParentRoute: () => imports, path: "letterboxd" });
    const imdb = createRoute({ ...imdbRoute.options as AnyRoute["options"], getParentRoute: () => imports, path: "imdb" });

    return createRouter({
        routeTree: root.addChildren([imports.addChildren([index, mylists, letterboxd, imdb])]),
        history: createMemoryHistory({ initialEntries: [url] }),
        isServer: false,
        origin: "http://localhost",
    });
}


describe("import page navigation", () => {
    it("redirects the imports URL to Letterboxd and preserves job search state", async () => {
        const router = createImportsRouter("/settings/imports?jobId=42&page=2");
        await router.load();

        expect(router.state.location.pathname).toBe("/settings/imports/letterboxd");
        expect(router.state.location.search).toMatchObject({ jobId: 42, page: 2 });
    });

    it.each(["mylists", "letterboxd", "imdb"])("opens %s directly and keeps its URL when changing job selection or pagination", async source => {
        const path = `/settings/imports/${source}`;
        const router = createImportsRouter(`${path}?jobId=42&page=2`);
        await router.load();

        expect(router.state.matches.at(-1)?.fullPath).toBe(path);
        expect(router.state.matches.at(-1)?.search).toMatchObject({ jobId: 42, page: 2 });

        await router.navigate({ to: ".", search: prev => ({ ...prev, jobId: 43, page: 1 }) });
        expect(router.state.location.pathname).toBe(path);
        expect(router.state.location.search).toMatchObject({ jobId: 43, page: 1 });

        await router.navigate({ to: ".", search: prev => ({ ...prev, page: 3 }) });
        expect(router.state.location.pathname).toBe(path);
        expect(router.state.location.search).toMatchObject({ jobId: 43, page: 3 });

        await router.navigate({ to: ".", search: prev => ({ ...prev, jobId: undefined, page: 1 }) });
        expect(router.state.location.pathname).toBe(path);
        expect(router.state.location.search.jobId).toBeUndefined();
    });

    it("preserves job state between parser pages and restores the page from browser history", async () => {
        const router = createImportsRouter("/settings/imports/mylists?jobId=42&page=2");
        await router.load();
        await router.navigate({ to: "/settings/imports/letterboxd", search: true });

        expect(router.state.location.pathname).toBe("/settings/imports/letterboxd");
        expect(router.state.location.search).toMatchObject({ jobId: 42, page: 2 });

        router.history.back();
        await router.load();
        expect(router.state.location.pathname).toBe("/settings/imports/mylists");

        router.history.forward();
        await router.load();
        expect(router.state.location.pathname).toBe("/settings/imports/letterboxd");

        const reloaded = createImportsRouter(router.state.location.href);
        await reloaded.load();
        expect(reloaded.state.matches.at(-1)?.fullPath).toBe("/settings/imports/letterboxd");
        expect(reloaded.state.location.search).toMatchObject({ jobId: 42, page: 2 });
    });
});

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {McpAccess} from "@/lib/server/core/mcp/tool-context";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import {AuthorizationService} from "@/lib/server/authorization/authorization.service";
import {MediaType, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {getListsCollections, getUserListViews} from "./lists";


const mocks = vi.hoisted(() => ({
    currentUser: undefined as { id: number; role: RoleType } | undefined,
    access: undefined as McpAccess | undefined,
    owner: {
        id: 10,
        name: "list-owner",
        privacy: "public" as PrivacyType,
        userMediaSettings: [] as { mediaType: MediaType; active: boolean; totalEntries: number }[],
    },
    getContainer: vi.fn(),
    getUserByUsername: vi.fn(),
    getAllViews: vi.fn(),
    getSummaries: vi.fn(),
    getSummary: vi.fn(),
    getCollections: vi.fn(),
    getFollowingStatus: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
    createMiddleware: () => {
        const options: { server?: (args: unknown) => unknown } = {};
        const builder = {
            options,
            middleware: () => builder,
            validator: () => builder,
            server: (server: (args: unknown) => unknown) => {
                options.server = server;
                return builder;
            },
        };
        return builder;
    },
    createServerFn: () => {
        let validator: { parse: (data: unknown) => unknown };
        let middlewares: { options?: { server?: (args: unknown) => unknown } }[] = [];
        const builder = {
            middleware: (values: typeof middlewares) => {
                middlewares = values;
                return builder;
            },
            validator: (schema: typeof validator) => {
                validator = schema;
                return builder;
            },
            handler: (handler: (args: unknown) => unknown) => async (args: { data: unknown }) => {
                const data = validator.parse(args.data);
                type Context = { currentUser: typeof mocks.currentUser; targetUser?: typeof mocks.owner };
                const run = (index: number, context: Context): unknown => {
                    const middleware = middlewares[index];
                    if (!middleware) return handler({ data, context });
                    if (!middleware.options?.server) return run(index + 1, context);
                    return middleware.options.server({
                        data, context,
                        next: ({ context: nextContext }: { context: Partial<Context> }) => run(index + 1, { ...context, ...nextContext }),
                    });
                };
                return run(0, { currentUser: mocks.currentUser });
            },
        };
        return builder;
    },
}));
vi.mock("@/lib/schemas", async () => {
    const { baseUsernameSchema } = await import("@/lib/schemas/common.schema");
    return { baseUsernameSchema };
});
vi.mock("@/lib/server/middlewares/media-authentication", () => ({ optionalMediaAuthMiddleware: {} }));
vi.mock("@/lib/server/authorization", async () => {
    const { toActor } = await import("@/lib/server/authorization/utils");
    return { toActor };
});
vi.mock("@/lib/server/core/container", () => ({ getContainer: mocks.getContainer }));
vi.mock("@/lib/server/core/mcp/tool-context", () => ({ mcpRequestContext: { getStore: () => mocks.access } }));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({
    dynamicListsRepository: { getAll: mocks.getAllViews },
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.queries", () => ({
    getDynamicListSummaries: (userId: number, views: { id: number; spec: DynamicListSpec }[], options: { includeCovers?: boolean } = {}) => {
        mocks.getSummaries(userId, views, options);
        return new Map(views.map(view => {
            const summary = mocks.getSummary(userId, view.spec);
            return [view.id, options.includeCovers === false ? { ...summary, covers: [] } : summary];
        }));
    },
}));


const view = {
    id: 30,
    profilePosition: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    spec: {
        version: 2, title: "Weekend plans", mediaTypes: "all", filters: {},
        sort: { field: "addedAt", direction: "asc" }, display: "grid",
    } satisfies DynamicListSpec,
};
const preview = { total: 7, mediaTypes: [MediaType.MOVIES, MediaType.BOOKS], covers: [] };
const collectionResults = { items: [], total: 0, page: 1, pages: 0, perPage: 12 };


beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser = undefined;
    mocks.access = undefined;
    mocks.owner = {
        id: 10,
        name: "list-owner",
        privacy: PrivacyType.PUBLIC,
        userMediaSettings: [
            { mediaType: MediaType.MOVIES, active: true, totalEntries: 3 },
            { mediaType: MediaType.BOOKS, active: true, totalEntries: 0 },
            { mediaType: MediaType.MANGA, active: false, totalEntries: 42 },
        ],
    };
    mocks.getUserByUsername.mockImplementation(() => mocks.owner);
    mocks.getAllViews.mockReturnValue([view]);
    mocks.getSummary.mockReturnValue(preview);
    mocks.getCollections.mockResolvedValue(collectionResults);
    mocks.getContainer.mockResolvedValue({
        services: {
            account: { getUserByUsername: mocks.getUserByUsername },
            authorization: new AuthorizationService({ getFollowingStatus: mocks.getFollowingStatus } as unknown as SocialService),
            collections: { getPaginatedUserCollections: mocks.getCollections },
        },
    });
});


describe("lists hub privacy", () => {
    it.each([
        ["public guest", PrivacyType.PUBLIC, undefined, undefined, true],
        ["restricted guest", PrivacyType.RESTRICTED, undefined, undefined, false],
        ["restricted member", PrivacyType.RESTRICTED, { id: 20, role: RoleType.USER }, undefined, true],
        ["private guest", PrivacyType.PRIVATE, undefined, undefined, false],
        ["private non-follower", PrivacyType.PRIVATE, { id: 20, role: RoleType.USER }, undefined, false],
        ["private requested follower", PrivacyType.PRIVATE, { id: 20, role: RoleType.USER }, SocialState.REQUESTED, false],
        ["private accepted follower", PrivacyType.PRIVATE, { id: 20, role: RoleType.USER }, SocialState.ACCEPTED, true],
        ["private owner", PrivacyType.PRIVATE, { id: 10, role: RoleType.USER }, undefined, true],
        ["private administrator", PrivacyType.PRIVATE, { id: 20, role: RoleType.ADMIN }, undefined, true],
        ["private manager", PrivacyType.PRIVATE, { id: 20, role: RoleType.MANAGER }, undefined, false],
    ] as const)("returns only authorized tracking views and collections for %s", async (_label, privacy, currentUser, following, allowed) => {
        mocks.owner.privacy = privacy;
        mocks.currentUser = currentUser;
        mocks.getFollowingStatus.mockReturnValue(following ? { status: following } : null);

        const result = await getUserListViews({ data: { username: "list-owner" } });

        expect(result.canReadTracking).toBe(allowed);
        expect(result.isOwner).toBe(currentUser?.id === 10);
        expect(result.activeMediaTypes).toEqual([MediaType.MOVIES, MediaType.BOOKS]);
        expect(result).toMatchObject({ total: allowed ? 1 : 0, page: 1, pages: allowed ? 1 : 0, perPage: 8 });
        if (allowed) {
            expect(result.presets).toEqual([
                { mediaType: MediaType.MOVIES, totalEntries: 3 },
                { mediaType: MediaType.BOOKS, totalEntries: 0 },
            ]);
            expect(result.views).toEqual([{ ...view, preview }]);
            expect(mocks.getAllViews).toHaveBeenCalledWith(10);
            expect(mocks.getSummary).toHaveBeenCalledWith(10, view.spec);
        }
        else {
            expect(result.presets).toEqual([]);
            expect(result.views).toEqual([]);
            expect(mocks.getAllViews).not.toHaveBeenCalled();
            expect(mocks.getSummary).not.toHaveBeenCalled();
        }

        await expect(getListsCollections({ data: { username: "list-owner", page: 2, search: "Weekend", mediaType: MediaType.MOVIES } }))
            .resolves.toEqual(collectionResults);
        expect(mocks.getCollections).toHaveBeenCalledWith(
            10,
            { page: 2, search: "Weekend", mediaType: MediaType.MOVIES },
            currentUser ? { kind: "user", ...currentUser } : { kind: "anonymous" },
            !allowed,
        );
        expect(mocks.getUserByUsername).toHaveBeenCalledWith("list-owner");
    });

    it("loads every saved view from the target owner's library without requiring a profile pin", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        const pinned = { ...view, id: 31, profilePosition: 1 };
        mocks.getAllViews.mockReturnValue([view, pinned]);

        await expect(getUserListViews({ data: { username: "list-owner" } })).resolves.toMatchObject({
            isOwner: false,
            views: [{ ...view, preview }, { ...pinned, preview }],
        });
        expect(mocks.getAllViews).toHaveBeenCalledWith(10);
        expect(mocks.getSummary).toHaveBeenCalledTimes(2);
        expect(mocks.getSummary).toHaveBeenNthCalledWith(1, 10, view.spec);
        expect(mocks.getSummary).toHaveBeenNthCalledWith(2, 10, pinned.spec);
    });

    it("filters pinned dynamic lists before pagination and drops them after unpinning", async () => {
        const pinned = { ...view, id: 31, profilePosition: 1 };
        mocks.getAllViews.mockReturnValue([view, pinned]);

        const result = await getUserListViews({ data: { username: "list-owner", pinnedOnly: true, dynamicPage: 2 } });

        expect(result).toMatchObject({ total: 1, page: 1, pages: 1, views: [{ ...pinned, preview }] });
        expect(mocks.getSummary).toHaveBeenCalledTimes(1);

        mocks.getAllViews.mockReturnValue([view, { ...pinned, profilePosition: null }]);
        await expect(getUserListViews({ data: { username: "list-owner", pinnedOnly: true } }))
            .resolves.toMatchObject({ total: 0, views: [] });
    });

    it("paginates dynamic lists eight at a time and only loads summaries for that page", async () => {
        const views = Array.from({ length: 20 }, (_, index) => ({ ...view, id: 30 + index }));
        mocks.getAllViews.mockReturnValue(views);

        const result = await getUserListViews({ data: { username: "list-owner", dynamicPage: 2 } });

        expect(result).toMatchObject({ total: 20, page: 2, pages: 3, perPage: 8 });
        expect(result.views.map(({ id }) => id)).toEqual(views.slice(8, 16).map(({ id }) => id));
        expect(mocks.getSummary).toHaveBeenCalledTimes(8);
    });

    it("filters titles and actual matching media types before calculating pagination", async () => {
        const gamesView = { ...view, id: 31, spec: { ...view.spec, title: "Weekend games" } };
        const otherView = { ...view, id: 32, spec: { ...view.spec, title: "Other movies" } };
        mocks.getAllViews.mockReturnValue([view, gamesView, otherView]);
        mocks.getSummary.mockImplementation((_userId, spec: typeof view.spec) => ({
            ...preview,
            mediaTypes: spec.title === gamesView.spec.title ? [MediaType.GAMES] : [MediaType.MOVIES],
        }));

        const result = await getUserListViews({ data: {
            username: "list-owner", search: " WEEKEND ", mediaType: MediaType.MOVIES, dynamicPage: 4,
        } });

        expect(result).toMatchObject({ total: 1, page: 1, pages: 1, perPage: 8 });
        expect(result.views.map(({ id }) => id)).toEqual([view.id]);
        expect(mocks.getSummary).toHaveBeenCalledTimes(2);
        expect(mocks.getSummary).not.toHaveBeenCalledWith(10, otherView.spec);
    });

    it("loads covers only for the visible page after filtering a large directory by actual matching media", async () => {
        const views = Array.from({ length: 24 }, (_, index) => ({
            ...view, id: 30 + index, spec: { ...view.spec, title: `List ${index}` },
        }));
        const covers = [{ mediaType: MediaType.MOVIES, mediaId: 1, title: "Cover", imageCover: "/cover.jpg" }];
        mocks.getAllViews.mockReturnValue(views);
        mocks.getSummary.mockImplementation((_userId, spec: DynamicListSpec) => ({
            ...preview, covers,
            mediaTypes: Number(spec.title.split(" ")[1]) % 3 === 2 ? [MediaType.GAMES] : [MediaType.MOVIES],
        }));

        const result = await getUserListViews({ data: { username: "list-owner", mediaType: MediaType.MOVIES, dynamicPage: 2 } });
        const pageViews = views.filter((_, index) => index % 3 !== 2).slice(8, 16);

        expect(result).toMatchObject({ total: 16, page: 2, pages: 2, perPage: 8 });
        expect(result.views.map(({ id }) => id)).toEqual(pageViews.map(({ id }) => id));
        expect(result.views.map(({ preview }) => preview.covers)).toEqual(pageViews.map(() => covers));
        expect(mocks.getSummaries).toHaveBeenCalledTimes(2);
        expect(mocks.getSummaries).toHaveBeenNthCalledWith(1, 10, views, { includeCovers: false });
        expect(mocks.getSummaries).toHaveBeenNthCalledWith(2, 10, pageViews, {});
    });

    it("clamps stale pages to the final remaining page", async () => {
        const views = Array.from({ length: 9 }, (_, index) => ({ ...view, id: 30 + index }));
        mocks.getAllViews.mockReturnValue(views);

        const result = await getUserListViews({ data: { username: "list-owner", dynamicPage: 3 } });

        expect(result).toMatchObject({ total: 9, page: 2, pages: 2, perPage: 8 });
        expect(result.views.map(({ id }) => id)).toEqual([38]);
        expect(mocks.getSummary).toHaveBeenCalledTimes(1);
    });

    it.each([getUserListViews, getListsCollections])("keeps website hub reads unavailable through MCP context", async read => {
        mocks.access = { userId: 20, username: "assistant-owner", scopes: new Set(["media:read"]) };

        await expect(read({ data: { username: "list-owner" } })).rejects.toThrow("available on the web app");
        expect(mocks.getAllViews).not.toHaveBeenCalled();
        expect(mocks.getSummary).not.toHaveBeenCalled();
        expect(mocks.getCollections).not.toHaveBeenCalled();
    });
});

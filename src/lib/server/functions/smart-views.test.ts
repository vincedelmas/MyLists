import {beforeEach, describe, expect, it, vi} from "vitest";
import {AuthorizationService} from "@/lib/server/authorization/authorization.service";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import type {McpAccess} from "@/lib/server/core/mcp/tool-context";
import {MediaType, PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getProfileSmartViews, getSmartView, getSmartViewEditor, getSmartViewEditorFilters, getUserSmartViews, previewSmartViewSummary} from "./smart-views";


const mocks = vi.hoisted(() => ({
    currentUser: undefined as { id: number; role: RoleType } | undefined,
    access: undefined as McpAccess | undefined,
    owner: { id: 10, username: "view-owner", privacy: "public" as PrivacyType },
    getContainer: vi.fn(),
    getOwner: vi.fn(),
    getView: vi.fn(),
    getResults: vi.fn(),
    getSummary: vi.fn(),
    getEditorFilters: vi.fn(),
    getProfileViews: vi.fn(),
    getAllViews: vi.fn(),
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
                const initialContext = { currentUser: mocks.currentUser, user: mocks.owner, targetUser: mocks.owner };
                const run = (index: number, context: typeof initialContext): unknown => {
                    const middleware = middlewares[index];
                    if (!middleware) return handler({ data, context });
                    if (!middleware.options?.server) return run(index + 1, context);
                    return middleware.options.server({
                        data, context,
                        next: ({ context: nextContext }: { context: Partial<typeof initialContext> }) => run(index + 1, { ...context, ...nextContext }),
                    });
                };
                return run(0, initialContext);
            },
        };
        return builder;
    },
}));
vi.mock("@/lib/server/middlewares/authentication", () => ({ requiredAuthMiddleware: {} }));
vi.mock("@/lib/schemas", async () => {
    const { baseUsernameSchema } = await import("@/lib/schemas/common.schema");
    return { baseUsernameSchema };
});
vi.mock("@/lib/server/middlewares/media-authentication", () => ({
    optionalMediaAuthMiddleware: {}, requiredMediaReadMiddleware: {}, requiredMediaWriteMiddleware: {},
}));
vi.mock("@/lib/server/authorization", async () => {
    const { toActor } = await import("@/lib/server/authorization/utils");
    return { toActor };
});
vi.mock("@/lib/server/core/container", () => ({ getContainer: mocks.getContainer }));
vi.mock("@/lib/server/core/mcp/tool-context", () => ({ mcpRequestContext: { getStore: () => mocks.access } }));
vi.mock("@/lib/server/domain/smart-views/smart-views.repository", () => ({
    smartViewsRepository: { getOwner: mocks.getOwner, get: mocks.getView, getProfileViews: mocks.getProfileViews, getAll: mocks.getAllViews },
}));
vi.mock("@/lib/server/domain/smart-views/smart-views.queries", () => ({
    getSmartViewResults: mocks.getResults,
    getSmartViewSummary: mocks.getSummary,
    getSmartViewEditorFilterOptions: mocks.getEditorFilters,
}));

const view = {
    id: 30, profilePosition: 1 as number | null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    spec: { version: 1, title: "A shared smart list", mediaTypes: "all", filters: {}, sort: { field: "addedAt", direction: "asc" }, display: "grid" },
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser = undefined;
    mocks.access = undefined;
    mocks.owner = { id: 10, username: "view-owner", privacy: PrivacyType.PUBLIC };
    view.profilePosition = 1;
    mocks.getOwner.mockImplementation(() => mocks.owner);
    mocks.getView.mockImplementation((userId: number) => {
        if (userId !== mocks.owner.id) throw new FormattedError("Smart list not found.");
        return view;
    });
    mocks.getResults.mockReturnValue({ items: [], total: 0, page: 1, pages: 0, perPage: 24 });
    mocks.getContainer.mockResolvedValue({
        services: {
            authorization: new AuthorizationService({ getFollowingStatus: mocks.getFollowingStatus } as unknown as SocialService),
        },
    });
});


describe("canonical smart list access", () => {
    it("allows owners to open an unpinned view on a private profile", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        mocks.owner.privacy = PrivacyType.PRIVATE;
        view.profilePosition = null;
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({
            view, isOwner: true, owner: { username: "view-owner" },
        });
        expect(mocks.getContainer).not.toHaveBeenCalled();
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, { page: 1, filters: undefined });
    });

    it("loads editor records for their owner and hides even pinned records from other users", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        await expect(getSmartViewEditor({ data: { id: 30 } })).resolves.toEqual(view);
        expect(mocks.getView).toHaveBeenCalledWith(10, 30);
        mocks.currentUser = { id: 20, role: RoleType.USER };
        await expect(getSmartViewEditor({ data: { id: 30 } })).rejects.toThrow("Smart list not found");
        expect(mocks.getView).toHaveBeenLastCalledWith(20, 30);
        expect(mocks.getResults).not.toHaveBeenCalled();
        expect(mocks.getContainer).not.toHaveBeenCalled();
    });

    it("loads editor options for the authenticated owner and rejects forged ownership", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        mocks.getEditorFilters.mockReturnValue({ genres: ["Drama"], tags: ["cozy"] });
        await expect(getSmartViewEditorFilters({ data: { mediaTypes: "all" } })).resolves.toEqual({ genres: ["Drama"], tags: ["cozy"] });
        expect(mocks.getEditorFilters).toHaveBeenCalledWith(20, "all");
        await expect(getSmartViewEditorFilters({ data: { mediaTypes: "all", userId: 10 } } as Parameters<typeof getSmartViewEditorFilters>[0])).rejects.toThrow();
        expect(mocks.getEditorFilters).toHaveBeenCalledTimes(1);
    });

    it("adds narrow owner previews only after profile authorization has provided the owner", async () => {
        mocks.getProfileViews.mockReturnValue([view]);
        const preview = { total: 3, mediaTypes: [MediaType.MOVIES], covers: [{ mediaType: MediaType.MOVIES, mediaId: 1, title: "Owner media", imageCover: "owner.jpg" }] };
        mocks.getSummary.mockReturnValue(preview);
        await expect(getProfileSmartViews({ data: { username: "view-owner" } })).resolves.toEqual([{ ...view, preview }]);
        expect(mocks.getProfileViews).toHaveBeenCalledWith(10);
        expect(mocks.getSummary).toHaveBeenCalledWith(10, view.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
    });

    it("previews summary covers for the authenticated owner without loading full personal rows", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        const preview = { total: 0, mediaTypes: [], covers: [] };
        mocks.getSummary.mockReturnValue(preview);
        await expect(previewSmartViewSummary({ data: view.spec } as Parameters<typeof previewSmartViewSummary>[0])).resolves.toEqual(preview);
        expect(mocks.getSummary).toHaveBeenCalledWith(20, view.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
        await expect(previewSmartViewSummary({ data: { ...view.spec, userId: 10 } } as Parameters<typeof previewSmartViewSummary>[0])).rejects.toThrow();
        expect(mocks.getSummary).toHaveBeenCalledTimes(1);
    });

    it.each([null, 1])("lets anonymous visitors read a public view with pin position %s from the owner's lists", async profilePosition => {
        view.profilePosition = profilePosition;
        await expect(getSmartView({ data: { id: 30, page: 2 } })).resolves.toMatchObject({
            view, isOwner: false, owner: { username: "view-owner" },
        });
        expect(mocks.getView).toHaveBeenCalledWith(10, 30);
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, { page: 2, filters: undefined });
    });

    it.each([null, 1])("requires sign-in for restricted profile views with pin position %s", async profilePosition => {
        view.profilePosition = profilePosition;
        mocks.owner.privacy = PrivacyType.RESTRICTED;
        await expect(getSmartView({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "restricted" });
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.currentUser = { id: 20, role: RoleType.USER };
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false });
    });

    it.each([null, 1])("permits only accepted followers to read private views with pin position %s", async profilePosition => {
        view.profilePosition = profilePosition;
        mocks.owner.privacy = PrivacyType.PRIVATE;
        await expect(getSmartView({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "private" });
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.currentUser = { id: 20, role: RoleType.USER };
        for (const status of [undefined, SocialState.REQUESTED]) {
            mocks.getFollowingStatus.mockReturnValue(status ? { status } : null);
            await expect(getSmartView({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "private" });
            expect(mocks.getView).not.toHaveBeenCalled();
            expect(mocks.getResults).not.toHaveBeenCalled();
        }
        mocks.getFollowingStatus.mockReturnValue({ status: SocialState.ACCEPTED });
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false });
        expect(mocks.getFollowingStatus).toHaveBeenCalledWith(20, 10);
    });

    it("lets administrators read unpinned private views through profile authorization", async () => {
        view.profilePosition = null;
        mocks.owner.privacy = PrivacyType.PRIVATE;
        mocks.currentUser = { id: 20, role: RoleType.ADMIN };
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false, view });
    });

    it("rejects a forged owner without querying any saved view", async () => {
        await expect(getSmartView({ data: { id: 30, userId: 20 } } as Parameters<typeof getSmartView>[0])).rejects.toThrow();
        expect(mocks.getOwner).not.toHaveBeenCalled();
        expect(mocks.getView).not.toHaveBeenCalled();
    });

    it("keeps MCP reads scoped to the token user even if a foreign view is pinned and public", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        mocks.access = { userId: 20, username: "assistant-owner", scopes: new Set(["media:read"]) };
        await expect(getSmartView({ data: { id: 30 } })).rejects.toThrow("Smart list not found");
        expect(mocks.getView).toHaveBeenCalledWith(20, 30);
        expect(mocks.getOwner).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.owner.id = 20;
        view.profilePosition = null;
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: true, owner: { username: "assistant-owner" } });
        expect(mocks.getResults).toHaveBeenCalledWith(20, view.spec, { page: 1, filters: undefined });
    });

    it.each([getProfileSmartViews, getUserSmartViews])("keeps profile smart list summaries unavailable through MCP context", async read => {
        mocks.access = { userId: 20, username: "assistant-owner", scopes: new Set(["media:read"]) };
        await expect(read({ data: { username: "view-owner" } })).rejects.toThrow("available on the website");
        expect(mocks.getProfileViews).not.toHaveBeenCalled();
        expect(mocks.getAllViews).not.toHaveBeenCalled();
        expect(mocks.getSummary).not.toHaveBeenCalled();
    });
});


describe("profile smart list summaries", () => {
    it("returns all saved records, including unpinned records, with narrow actual-type summaries", async () => {
        const unpinned = { ...view, id: 31, profilePosition: null };
        mocks.getAllViews.mockReturnValue([unpinned, view]);
        const preview = { total: 7, mediaTypes: [MediaType.MOVIES, MediaType.BOOKS], covers: [] };
        mocks.getSummary.mockReturnValue(preview);

        await expect(getUserSmartViews({ data: { username: "view-owner" } })).resolves.toEqual([
            { ...unpinned, preview }, { ...view, preview },
        ]);

        expect(mocks.getAllViews).toHaveBeenCalledWith(10);
        expect(mocks.getProfileViews).not.toHaveBeenCalled();
        expect(mocks.getSummary).toHaveBeenCalledTimes(2);
        expect(mocks.getSummary).toHaveBeenCalledWith(10, unpinned.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
    });

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
    ] as const)("authorizes %s before loading saved records or summaries", async (_label, privacy, currentUser, following, allowed) => {
        mocks.owner.privacy = privacy;
        mocks.currentUser = currentUser;
        mocks.getFollowingStatus.mockReturnValue(following ? { status: following } : null);
        mocks.getAllViews.mockReturnValue([{ ...view, profilePosition: null }]);
        mocks.getSummary.mockReturnValue({ total: 0, mediaTypes: [], covers: [] });

        const result = getUserSmartViews({ data: { username: "view-owner" } });
        if (allowed) {
            await expect(result).resolves.toHaveLength(1);
            expect(mocks.getAllViews).toHaveBeenCalledWith(10);
            expect(mocks.getSummary).toHaveBeenCalledWith(10, view.spec);
        }
        else {
            await expect(result).rejects.toMatchObject({
                name: "UnauthorizedError", type: privacy === PrivacyType.RESTRICTED ? "restricted" : "private",
            });
            expect(mocks.getAllViews).not.toHaveBeenCalled();
            expect(mocks.getSummary).not.toHaveBeenCalled();
        }
    });

    it("rejects forged ownership without querying saved records", async () => {
        await expect(getUserSmartViews({ data: { username: "view-owner", userId: 20 } } as Parameters<typeof getUserSmartViews>[0])).rejects.toThrow();
        expect(mocks.getAllViews).not.toHaveBeenCalled();
        expect(mocks.getSummary).not.toHaveBeenCalled();
    });
});

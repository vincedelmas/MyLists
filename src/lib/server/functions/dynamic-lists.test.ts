import {beforeEach, describe, expect, it, vi} from "vitest";
import {AuthorizationService} from "@/lib/server/authorization/authorization.service";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import type {McpAccess} from "@/lib/server/core/mcp/tool-context";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDynamicList, getDynamicListEditor, getDynamicListEditorFilters, previewDynamicListSummary} from "./dynamic-lists";


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
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({
    dynamicListsRepository: { getOwner: mocks.getOwner, get: mocks.getView },
}));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.queries", () => ({
    getDynamicListResults: mocks.getResults,
    getDynamicListSummary: mocks.getSummary,
    getDynamicListEditorFilterOptions: mocks.getEditorFilters,
}));

const view = {
    id: 30, profilePosition: 1 as number | null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    spec: { version: 1, title: "A shared dynamic list", mediaTypes: "all", filters: {}, sort: { field: "addedAt", direction: "asc" }, display: "grid" },
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser = undefined;
    mocks.access = undefined;
    mocks.owner = { id: 10, username: "view-owner", privacy: PrivacyType.PUBLIC };
    view.profilePosition = 1;
    mocks.getOwner.mockImplementation(() => mocks.owner);
    mocks.getView.mockImplementation((userId: number) => {
        if (userId !== mocks.owner.id) throw new FormattedError("Dynamic list not found.");
        return view;
    });
    mocks.getResults.mockReturnValue({ items: [], total: 0, page: 1, pages: 0, perPage: 24 });
    mocks.getContainer.mockResolvedValue({
        services: {
            authorization: new AuthorizationService({ getFollowingStatus: mocks.getFollowingStatus } as unknown as SocialService),
        },
    });
});


describe("canonical dynamic list access", () => {
    it("allows owners to open an unpinned view on a private profile", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        mocks.owner.privacy = PrivacyType.PRIVATE;
        view.profilePosition = null;
        await expect(getDynamicList({ data: { id: 30 } })).resolves.toMatchObject({
            view, isOwner: true, owner: { username: "view-owner" },
        });
        expect(mocks.getContainer).not.toHaveBeenCalled();
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, { page: 1, filters: undefined, includeFilterOptions: undefined, viewerId: 10 });
    });

    it("authorizes lazy facet options and passes the actual visitor for common-media filtering", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        mocks.owner.privacy = PrivacyType.PRIVATE;
        mocks.getFollowingStatus.mockReturnValue({ status: SocialState.ACCEPTED });
        const filters = { hideCommon: true, mediaFilters: { movies: { actors: ["Actor"] } } };
        await getDynamicList({ data: { id: 30, includeFilterOptions: true, filters } });
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, {
            page: 1, filters, viewerId: 20, includeFilterOptions: true,
        });
        mocks.getFollowingStatus.mockReturnValue(null);
        await expect(getDynamicList({ data: { id: 30, includeFilterOptions: true } })).rejects.toMatchObject({ name: "UnauthorizedError" });
        expect(mocks.getResults).toHaveBeenCalledTimes(1);
    });

    it("loads editor records for their owner and hides even pinned records from other users", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        await expect(getDynamicListEditor({ data: { id: 30 } })).resolves.toEqual(view);
        expect(mocks.getView).toHaveBeenCalledWith(10, 30);
        mocks.currentUser = { id: 20, role: RoleType.USER };
        await expect(getDynamicListEditor({ data: { id: 30 } })).rejects.toThrow("Dynamic list not found");
        expect(mocks.getView).toHaveBeenLastCalledWith(20, 30);
        expect(mocks.getResults).not.toHaveBeenCalled();
        expect(mocks.getContainer).not.toHaveBeenCalled();
    });

    it("loads editor options for the authenticated owner and rejects forged ownership", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        mocks.getEditorFilters.mockReturnValue({ genres: ["Drama"], tags: ["cozy"] });
        await expect(getDynamicListEditorFilters({ data: { mediaTypes: "all" } })).resolves.toEqual({ genres: ["Drama"], tags: ["cozy"] });
        expect(mocks.getEditorFilters).toHaveBeenCalledWith(20, "all");
        await expect(getDynamicListEditorFilters({ data: { mediaTypes: "all", userId: 10 } } as Parameters<typeof getDynamicListEditorFilters>[0])).rejects.toThrow();
        expect(mocks.getEditorFilters).toHaveBeenCalledTimes(1);
    });

    it("previews summary covers for the authenticated owner without loading full personal rows", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        const preview = { total: 0, mediaTypes: [], covers: [] };
        mocks.getSummary.mockReturnValue(preview);
        await expect(previewDynamicListSummary({ data: view.spec } as Parameters<typeof previewDynamicListSummary>[0])).resolves.toEqual(preview);
        expect(mocks.getSummary).toHaveBeenCalledWith(20, view.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
        await expect(previewDynamicListSummary({ data: { ...view.spec, userId: 10 } } as Parameters<typeof previewDynamicListSummary>[0])).rejects.toThrow();
        expect(mocks.getSummary).toHaveBeenCalledTimes(1);
    });

    it.each([null, 1])("lets anonymous visitors read a public view with pin position %s from the owner's lists", async profilePosition => {
        view.profilePosition = profilePosition;
        await expect(getDynamicList({ data: { id: 30, page: 2 } })).resolves.toMatchObject({
            view, isOwner: false, owner: { username: "view-owner" },
        });
        expect(mocks.getView).toHaveBeenCalledWith(10, 30);
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, { page: 2, filters: undefined, includeFilterOptions: undefined, viewerId: undefined });
    });

    it.each([null, 1])("requires sign-in for restricted profile views with pin position %s", async profilePosition => {
        view.profilePosition = profilePosition;
        mocks.owner.privacy = PrivacyType.RESTRICTED;
        await expect(getDynamicList({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "restricted" });
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.currentUser = { id: 20, role: RoleType.USER };
        await expect(getDynamicList({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false });
    });

    it.each([null, 1])("permits only accepted followers to read private views with pin position %s", async profilePosition => {
        view.profilePosition = profilePosition;
        mocks.owner.privacy = PrivacyType.PRIVATE;
        await expect(getDynamicList({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "private" });
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.currentUser = { id: 20, role: RoleType.USER };
        for (const status of [undefined, SocialState.REQUESTED]) {
            mocks.getFollowingStatus.mockReturnValue(status ? { status } : null);
            await expect(getDynamicList({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "private" });
            expect(mocks.getView).not.toHaveBeenCalled();
            expect(mocks.getResults).not.toHaveBeenCalled();
        }
        mocks.getFollowingStatus.mockReturnValue({ status: SocialState.ACCEPTED });
        await expect(getDynamicList({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false });
        expect(mocks.getFollowingStatus).toHaveBeenCalledWith(20, 10);
    });

    it("lets administrators read unpinned private views through profile authorization", async () => {
        view.profilePosition = null;
        mocks.owner.privacy = PrivacyType.PRIVATE;
        mocks.currentUser = { id: 20, role: RoleType.ADMIN };
        await expect(getDynamicList({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false, view });
    });

    it("rejects a forged owner without querying any saved view", async () => {
        await expect(getDynamicList({ data: { id: 30, userId: 20 } } as Parameters<typeof getDynamicList>[0])).rejects.toThrow();
        expect(mocks.getOwner).not.toHaveBeenCalled();
        expect(mocks.getView).not.toHaveBeenCalled();
    });

    it("keeps MCP reads scoped to the token user even if a foreign view is pinned and public", async () => {
        mocks.currentUser = { id: 10, role: RoleType.USER };
        mocks.access = { userId: 20, username: "assistant-owner", scopes: new Set(["media:read"]) };
        await expect(getDynamicList({ data: { id: 30 } })).rejects.toThrow("Dynamic list not found");
        expect(mocks.getView).toHaveBeenCalledWith(20, 30);
        expect(mocks.getOwner).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.owner.id = 20;
        view.profilePosition = null;
        await expect(getDynamicList({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: true, owner: { username: "assistant-owner" } });
        expect(mocks.getResults).toHaveBeenCalledWith(20, view.spec, { page: 1, filters: undefined, includeFilterOptions: undefined, viewerId: 20 });
    });

});

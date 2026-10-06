import {beforeEach, describe, expect, it, vi} from "vitest";
import {AuthorizationService} from "@/lib/server/authorization/authorization.service";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import type {McpAccess} from "@/lib/server/core/mcp/tool-context";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getProfileSmartViews, getSmartView, getSmartViewEditor, getSmartViewEditorFilters, previewSmartViewSummary} from "./smart-views";


const mocks = vi.hoisted(() => ({
    currentUser: undefined as { id: number; role: RoleType } | undefined,
    access: undefined as McpAccess | undefined,
    owner: { id: 10, username: "view-owner", privacy: "public" as PrivacyType, profilePosition: 1 as number | null },
    getContainer: vi.fn(),
    getOwner: vi.fn(),
    getView: vi.fn(),
    getResults: vi.fn(),
    getSummary: vi.fn(),
    getEditorFilters: vi.fn(),
    getProfileViews: vi.fn(),
    getFollowingStatus: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
    createServerFn: () => {
        let validator: { parse: (data: unknown) => unknown };
        const builder = {
            middleware: () => builder,
            validator: (schema: typeof validator) => {
                validator = schema;
                return builder;
            },
            handler: (handler: (args: unknown) => unknown) => async (args: { data: unknown }) => handler({
                data: validator.parse(args.data),
                context: { currentUser: mocks.currentUser, user: { id: 10 } },
            }),
        };
        return builder;
    },
}));
vi.mock("@/lib/server/middlewares/authentication", () => ({ requiredAuthMiddleware: {} }));
vi.mock("@/lib/server/middlewares/authorization", () => ({ contentAuthorizationMiddleware: {} }));
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
    smartViewsRepository: { getOwner: mocks.getOwner, get: mocks.getView, getProfileViews: mocks.getProfileViews },
}));
vi.mock("@/lib/server/domain/smart-views/smart-views.queries", () => ({
    getSmartViewResults: mocks.getResults,
    getSmartViewSummary: mocks.getSummary,
    getSmartViewEditorFilterOptions: mocks.getEditorFilters,
}));

const view = {
    id: 30, profilePosition: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    spec: { version: 1, title: "A shared smart list", mediaTypes: "all", filters: {}, sort: { field: "addedAt", direction: "asc" }, display: "grid" },
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser = undefined;
    mocks.access = undefined;
    mocks.owner = { id: 10, username: "view-owner", privacy: PrivacyType.PUBLIC, profilePosition: 1 };
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
        mocks.owner.profilePosition = null;
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
        const preview = { total: 3, covers: [{ mediaType: "movies", mediaId: 1, title: "Owner media", imageCover: "owner.jpg" }] };
        mocks.getSummary.mockReturnValue(preview);
        await expect(getProfileSmartViews({ data: { username: "view-owner" } })).resolves.toEqual([{ ...view, preview }]);
        expect(mocks.getProfileViews).toHaveBeenCalledWith(10);
        expect(mocks.getSummary).toHaveBeenCalledWith(10, view.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
    });

    it("previews summary covers for the authenticated owner without loading full personal rows", async () => {
        mocks.currentUser = { id: 20, role: RoleType.USER };
        const preview = { total: 0, covers: [] };
        mocks.getSummary.mockReturnValue(preview);
        await expect(previewSmartViewSummary({ data: view.spec } as Parameters<typeof previewSmartViewSummary>[0])).resolves.toEqual(preview);
        expect(mocks.getSummary).toHaveBeenCalledWith(20, view.spec);
        expect(mocks.getResults).not.toHaveBeenCalled();
        await expect(previewSmartViewSummary({ data: { ...view.spec, userId: 10 } } as Parameters<typeof previewSmartViewSummary>[0])).rejects.toThrow();
        expect(mocks.getSummary).toHaveBeenCalledTimes(1);
    });

    it("lets anonymous visitors read a pinned public view from the owner's lists", async () => {
        await expect(getSmartView({ data: { id: 30, page: 2 } })).resolves.toMatchObject({
            view, isOwner: false, owner: { username: "view-owner" },
        });
        expect(mocks.getView).toHaveBeenCalledWith(10, 30);
        expect(mocks.getResults).toHaveBeenCalledWith(10, view.spec, { page: 2, filters: undefined });
    });

    it("requires sign-in for a pinned restricted profile view", async () => {
        mocks.owner.privacy = PrivacyType.RESTRICTED;
        await expect(getSmartView({ data: { id: 30 } })).rejects.toMatchObject({ name: "UnauthorizedError", type: "restricted" });
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
        mocks.currentUser = { id: 20, role: RoleType.USER };
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: false });
    });

    it("permits only accepted followers to read pinned private views", async () => {
        mocks.owner.privacy = PrivacyType.PRIVATE;
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

    it("hides unpinned views from visitors even on public profiles", async () => {
        mocks.owner.profilePosition = null;
        for (const currentUser of [undefined, { id: 20, role: RoleType.USER }, { id: 20, role: RoleType.ADMIN }]) {
            mocks.currentUser = currentUser;
            await expect(getSmartView({ data: { id: 30 } })).rejects.toThrow("Smart list not found");
        }
        expect(mocks.getView).not.toHaveBeenCalled();
        expect(mocks.getResults).not.toHaveBeenCalled();
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
        mocks.owner.profilePosition = null;
        await expect(getSmartView({ data: { id: 30 } })).resolves.toMatchObject({ isOwner: true, owner: { username: "assistant-owner" } });
        expect(mocks.getResults).toHaveBeenCalledWith(20, view.spec, { page: 1, filters: undefined });
    });

    it("keeps profile overview readers unavailable through MCP context", async () => {
        mocks.access = { userId: 20, username: "assistant-owner", scopes: new Set(["media:read"]) };
        await expect(getProfileSmartViews({ data: { username: "view-owner" } })).rejects.toThrow("available on the website");
        expect(mocks.getProfileViews).not.toHaveBeenCalled();
    });
});

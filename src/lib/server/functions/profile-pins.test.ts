import {beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, PrivacyType, RoleType} from "@/lib/utils/enums";
import {getProfilePins, postSetProfilePin} from "./profile-pins";


const mocks = vi.hoisted(() => ({
    access: false,
    currentUser: { id: 20, role: "user" },
    user: { id: 10, userMediaSettings: [{ mediaType: "movies", active: true }, { mediaType: "manga", active: false }] },
    getCollections: vi.fn(),
    getPinned: vi.fn(),
    getSummary: vi.fn(),
    setPin: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
    createServerFn: () => {
        let validator: { parse: (data: unknown) => unknown };
        const builder = {
            middleware: () => builder,
            validator: (schema: typeof validator) => { validator = schema; return builder; },
            handler: (handler: (args: unknown) => unknown) => async (args: { data: unknown }) => handler({
                data: validator.parse(args.data), context: { currentUser: mocks.currentUser, user: mocks.user },
            }),
        };
        return builder;
    },
}));
vi.mock("@/lib/server/middlewares/authentication", () => ({ requiredAuthMiddleware: {} }));
vi.mock("@/lib/server/middlewares/authorization", () => ({ contentAuthorizationMiddleware: {} }));
vi.mock("@/lib/server/authorization", async () => ({ toActor: (await import("@/lib/server/authorization/utils")).toActor }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: () => ({ services: { collections: { getUserCollections: mocks.getCollections } } }) }));
vi.mock("@/lib/server/core/mcp/tool-context", () => ({ mcpRequestContext: { getStore: () => mocks.access } }));
vi.mock("@/lib/server/domain/profile/profile-pins.repository", () => ({ profilePinsRepository: { set: mocks.setPin } }));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.repository", () => ({ dynamicListsRepository: { getPinned: mocks.getPinned } }));
vi.mock("@/lib/server/domain/dynamic-lists/dynamic-lists.queries", () => ({ getDynamicListSummary: mocks.getSummary }));


beforeEach(() => {
    vi.resetAllMocks();
    mocks.access = false;
    mocks.getCollections.mockResolvedValue([]);
    mocks.getPinned.mockReturnValue([]);
});


describe("profile pins endpoints", () => {
    it("loads accessible pinned collections and narrow dynamic previews for the authorized profile, in their shared order", async () => {
        const view = { id: 1, profilePosition: 3, spec: { version: 1, title: "Dynamic", mediaTypes: "all", filters: {}, sort: { field: "addedAt", direction: "asc" }, display: "grid" } };
        const collection = { id: 2, title: "Public collection", privacy: PrivacyType.PUBLIC, profilePosition: 1, itemsCount: 2, previews: [] };
        const preview = { total: 3, mediaTypes: [MediaType.MOVIES], covers: [] };
        mocks.getCollections.mockResolvedValue([collection]);
        mocks.getPinned.mockReturnValue([view]);
        mocks.getSummary.mockReturnValue(preview);

        await expect(getProfilePins({ data: { username: "profile-owner" } })).resolves.toEqual({
            activeMediaTypes: [MediaType.MOVIES],
            items: [{ kind: "collection", position: 1, collection }, { kind: "dynamic", position: 3, view, preview }],
        });
        expect(mocks.getCollections).toHaveBeenCalledWith(10, { kind: "user", id: 20, role: RoleType.USER }, undefined, true);
        expect(mocks.getPinned).toHaveBeenCalledWith(10);
        expect(mocks.getSummary).toHaveBeenCalledWith(10, view.spec);
    });

    it("keeps profile shortcuts unavailable through MCP context before reading any pins or summaries", async () => {
        mocks.access = true;
        await expect(getProfilePins({ data: { username: "profile-owner" } })).rejects.toThrow("available on the website");
        expect(mocks.getCollections).not.toHaveBeenCalled();
        expect(mocks.getPinned).not.toHaveBeenCalled();
        expect(mocks.getSummary).not.toHaveBeenCalled();
    });

    it("pins as the authenticated user and rejects forged owner fields", async () => {
        await postSetProfilePin({ data: { kind: "collection", id: 1, pinned: true } });
        expect(mocks.setPin).toHaveBeenCalledWith(20, { kind: "collection", id: 1 }, true);
        await expect(postSetProfilePin({ data: { kind: "dynamic", id: 2, pinned: true, userId: 10 } } as Parameters<typeof postSetProfilePin>[0])).rejects.toThrow();
        expect(mocks.setPin).toHaveBeenCalledTimes(1);
    });
});

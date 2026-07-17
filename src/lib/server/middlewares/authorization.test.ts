import {describe, expect, it, vi} from "vitest";
import {JobType, MediaType} from "@/lib/utils/enums";


vi.mock("@/lib/server/core/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: vi.fn() }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("@/lib/utils/admin-token", () => ({ isAdminAuthenticated: vi.fn() }));

const {mediaListAuthorizationMiddleware} = await import("./authorization");


describe("media list authorization middleware", () => {
    it("preserves endpoint-specific input for downstream validators", () => {
        const validator = mediaListAuthorizationMiddleware.options.validator as { parse: (input: unknown) => unknown };
        const data = {
            mediaType: MediaType.ANIME,
            username: "Cross",
            args: {},
            search: { page: 2 },
            query: "studio",
            job: JobType.CREATOR,
        };

        expect(validator.parse(data)).toEqual(data);
    });
});

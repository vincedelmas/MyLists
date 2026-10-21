import {beforeEach, describe, expect, it, vi} from "vitest";
import {z} from "zod";
import {notFound} from "@tanstack/react-router";
import {mobileRequest} from "./request";
import {FormattedError, InactiveMediaTypeError} from "@/lib/utils/error-classes";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/env/client", () => ({clientEnv: {VITE_BASE_URL: "http://localhost:3000"}}));
vi.mock("@/lib/server/core/request-user", () => ({getRequestUser: session}));
vi.mock("@/lib/server/core/logger", () => ({logger: {error: vi.fn()}}));

beforeEach(() => {
    session.mockReset();
    session.mockResolvedValue({id: 10});
});
const request = (headers: HeadersInit = {"content-type": "application/json"}, body = "{}") =>
    new Request("http://192.168.1.61:3000/api/mobile/v1/settings", {method: "PATCH", headers, body});

describe("mobile mutation boundary", () => {
    it("rejects cross-origin browser writes and non-JSON forms before invoking the mutation", async () => {
        const save = vi.fn().mockResolvedValue({saved: true});
        expect(
            (await mobileRequest(request({origin: "https://other.invalid", "content-type": "application/json"}), save))
                .status,
        ).toBe(403);
        expect(
            (
                await mobileRequest(
                    request({"content-type": "application/x-www-form-urlencoded"}, "username=changed"),
                    save,
                )
            ).status,
        ).toBe(415);
        expect(save).not.toHaveBeenCalled();
    });

    it("accepts authenticated native JSON writes and uses the session identity", async () => {
        const save = vi.fn().mockResolvedValue({saved: true});
        const response = await mobileRequest(request(), save);
        expect(response.status).toBe(200);
        expect(save).toHaveBeenCalledWith(10);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
    });

    it("does not invoke writes for revoked sessions", async () => {
        session.mockResolvedValue(undefined);
        const save = vi.fn();
        expect((await mobileRequest(request(), save)).status).toBe(401);
        expect(save).not.toHaveBeenCalled();
    });

    it("returns actionable validation errors and safe missing-resource errors", async () => {
        const req = request();
        const invalid = await mobileRequest(req, async () =>
            z.object({rating: z.number().max(10)}).parse({rating: 11}),
        );
        expect(invalid.status).toBe(400);
        expect((await invalid.json()).error.message).toBeTruthy();
        expect(
            (
                await mobileRequest(request(), async () => {
                    throw notFound();
                })
            ).status,
        ).toBe(404);
        expect(
            (
                await mobileRequest(request(), async () => {
                    throw new InactiveMediaTypeError("games");
                })
            ).status,
        ).toBe(409);
        const known = await mobileRequest(request(), async () => {
            throw new FormattedError("Invalid episode");
        });
        expect(known.status).toBe(400);
        expect((await known.json()).error.message).toBe("Invalid episode");
    });

    it("turns malformed JSON into a client error", async () => {
        const req = request(undefined, "{");
        expect((await mobileRequest(req, () => req.json())).status).toBe(400);
    });
});

import {describe, expect, it, vi} from "vitest";
import {createWakeRequestHandler} from "@/worker/wake-server";


describe("createWakeRequestHandler", () => {
    it("accepts wake notifications", async () => {
        const onWake = vi.fn();
        const handler = createWakeRequestHandler(onWake);

        const response = handler(new Request("http://worker/wake", {method: "POST"}));

        expect(response.status).toBe(202);
        expect(onWake).toHaveBeenCalledOnce();
    });

    it("exposes health without waking the worker", () => {
        const onWake = vi.fn();
        const handler = createWakeRequestHandler(onWake);

        const response = handler(new Request("http://worker/health"));

        expect(response.status).toBe(204);
        expect(onWake).not.toHaveBeenCalled();
    });

    it("rejects unsupported routes and methods", () => {
        const handler = createWakeRequestHandler(vi.fn());

        expect(handler(new Request("http://worker/wake")).status).toBe(405);
        expect(handler(new Request("http://worker/unknown")).status).toBe(404);
    });
});

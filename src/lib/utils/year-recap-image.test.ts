import {afterEach, describe, expect, it, vi} from "vitest";
import {canShareYearRecapImage, shareYearRecapImage} from "@/lib/utils/year-recap-image";


const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");


const restoreGlobal = (name: "window" | "navigator", descriptor?: PropertyDescriptor) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
};


describe("year recap image sharing", () => {
    afterEach(() => {
        restoreGlobal("window", originalWindow);
        restoreGlobal("navigator", originalNavigator);
    });

    it("does not fall back to downloading when file sharing is unavailable", async () => {
        Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: false } });
        Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
            share: vi.fn(),
            canShare: vi.fn(() => true),
        } });

        await expect(shareYearRecapImage({
            filename: "recap.png",
            dataUrl: "data:image/png;base64,AA==",
        })).resolves.toBe("unsupported");
    });

    it("detects image file sharing in a secure context", () => {
        const canShare = vi.fn(() => true);
        Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true } });
        Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
            share: vi.fn(),
            canShare,
        } });

        expect(canShareYearRecapImage()).toBe(true);
        expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    });
});

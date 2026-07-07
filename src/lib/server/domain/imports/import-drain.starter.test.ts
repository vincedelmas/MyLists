import {describe, expect, it, vi} from "vitest";
import {NoopImportDrainStarter, SystemdImportDrainStarter} from "@/lib/server/domain/imports/import-drain.starter";


describe("SystemdImportDrainStarter", () => {
    it("starts the configured user systemd service detached", async () => {
        const child = { unref: vi.fn() };
        const spawnProcess = vi.fn().mockReturnValue(child);
        const starter = new SystemdImportDrainStarter("mylists-import-drain.service", true, spawnProcess as any);

        await starter.start();

        expect(spawnProcess).toHaveBeenCalledWith("systemctl", ["--user", "start", "mylists-import-drain.service"], {
            detached: true,
            stdio: "ignore",
        });
        expect(child.unref).toHaveBeenCalled();
    });

    it("can start a system service", async () => {
        const child = { unref: vi.fn() };
        const spawnProcess = vi.fn().mockReturnValue(child);
        const starter = new SystemdImportDrainStarter("mylists-import-drain.service", false, spawnProcess as any);

        await starter.start();

        expect(spawnProcess).toHaveBeenCalledWith("systemctl", ["start", "mylists-import-drain.service"], expect.any(Object));
    });
});


describe("NoopImportDrainStarter", () => {
    it("does nothing", async () => {
        await expect(new NoopImportDrainStarter().start()).resolves.toBeUndefined();
    });
});

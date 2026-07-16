import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {
    changeGameStatus,
    createInitialGameProgress,
    importGameProgress,
    replaceGamePlatform,
    replaceGamePlaytime,
} from "./game-progress";


describe("game progress", () => {
    it("resets playtime but preserves platform when returning to plan-to-play", () => {
        const imported = importGameProgress(Status.PLAYING, 600, "PC");
        expect(changeGameStatus(imported, Status.PLAN_TO_PLAY)).toEqual({
            status: Status.PLAN_TO_PLAY,
            playtimeMinutes: 0,
            platform: "PC",
        });
    });

    it("changes playtime and platform independently", () => {
        const initial = createInitialGameProgress(Status.PLAYING);
        const withPlaytime = replaceGamePlaytime(initial, 90);
        expect(replaceGamePlatform(withPlaytime, "Switch")).toEqual({
            status: Status.PLAYING,
            playtimeMinutes: 90,
            platform: "Switch",
        });
    });

    it("rejects cross-family statuses and out-of-range playtime", () => {
        expect(() => createInitialGameProgress(Status.WATCHING)).toThrow("Status is not valid for games");
        expect(() => replaceGamePlaytime(createInitialGameProgress(Status.PLAYING), 1_800_001)).toThrow(
            "Playtime must be between 0 and 30,000 hours",
        );
    });
});

import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {getTvContinueProgress} from "@/lib/client/components/media/tv/continue-progress";
import {getGamesContinueProgress} from "@/lib/client/components/media/games/continue-progress";
import {getBooksContinueProgress} from "@/lib/client/components/media/books/continue-progress";
import {getMangaContinueProgress} from "@/lib/client/components/media/manga/continue-progress";
import {formatContinueProgress, type ContinueItemFor} from "./continue.utils";


describe("Continue remaining estimates", () => {
    it("rounds remaining time to hours and omits missing or exhausted estimates", () => {
        expect(formatContinueProgress("Playing", 379)).toBe("Playing · ~ 6h left");
        expect(formatContinueProgress("Reading", 653)).toBe("Reading · ~ 11h left");
        expect(formatContinueProgress("Reading", 20)).toBe("Reading · < 1h left");
        expect(formatContinueProgress("Playing", null)).toBe("Playing");
        expect(formatContinueProgress("Playing", 0)).toBe("Playing");
    });

    it("counts unwatched episodes across seasons, independent of season order", () => {
        const item = {
            currentSeason: 1,
            currentEpisode: 2,
            duration: 45,
            epsPerSeason: [{ season: 3, episodes: 6 }, { season: 1, episodes: 6 }, { season: 2, episodes: 6 }],
        } as ContinueItemFor<typeof MediaType.SERIES>;

        expect(getTvContinueProgress(item).label).toBe("S1 E2/6 · ~ 12h left");
        expect(getTvContinueProgress(item).total! - getTvContinueProgress(item).value).toBe(16);
        expect(getTvContinueProgress({ ...item, duration: 0 }).label).toBe("S1 E2/6");
        expect(getTvContinueProgress({ ...item, currentSeason: 3, currentEpisode: 6 }).label).toBe("S3 E6/6");
    });

    it("subtracts logged minutes from HLTB hours without treating the estimate as completion", () => {
        const item = { playtime: 90, hltbMainTime: 3 } as ContinueItemFor<typeof MediaType.GAMES>;

        expect(getGamesContinueProgress(item).label).toBe("1h 30m played · ~ 2h left");
        expect(getGamesContinueProgress({ ...item, playtime: 60 }).label).toBe("1h played · ~ 2h left");
        expect(getGamesContinueProgress({ ...item, hltbMainTime: null }).label).toBe("1h 30m played");
        expect(getGamesContinueProgress(item).total).toBe(180);
        expect(getGamesContinueProgress({ ...item, hltbMainTime: null }).total).toBeNull();

        expect(getGamesContinueProgress({ ...item, playtime: 240 }).label).toBe("4h played");
        expect(getGamesContinueProgress({ ...item, playtime: 240 }).update).not.toBeNull();
    });

    it("uses the existing reading pace and does not confuse unknown totals with completion", () => {
        const item = { actualPage: 100, pages: 200 } as ContinueItemFor<typeof MediaType.BOOKS>;

        expect(getBooksContinueProgress(item).label).toBe("100/200 pp · ~ 3h left");
        expect(getBooksContinueProgress({ ...item, pages: 0 }).label).toBe("100/? pp");
        expect(getBooksContinueProgress({ ...item, actualPage: 200 }).label).toBe("200/200 pp");
    });

    it("uses the existing manga pace and handles unknown chapter counts", () => {
        const item = { currentChapter: 10, chapters: 30 } as ContinueItemFor<typeof MediaType.MANGA>;

        expect(getMangaContinueProgress(item).label).toBe("10/30 ch · ~ 2h left");
        expect(getMangaContinueProgress({ ...item, chapters: null }).label).toBe("10/? ch");
    });
});

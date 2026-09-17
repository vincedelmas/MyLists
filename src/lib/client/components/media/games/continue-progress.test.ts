import {describe, expect, it} from "vitest";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {PLAYTIME_MAX_MINUTES} from "@/lib/utils/constants";
import type {ContinueItemFor} from "@/lib/client/components/continue/continue.types";
import {getGamesContinueProgress} from "./continue-progress";


describe("games continue progress", () => {
    const game = { mediaType: MediaType.GAMES, playtime: 90 } as ContinueItemFor<typeof MediaType.GAMES>;

    it("shows game time in hours and minutes without a completion total", () => {
        expect(getGamesContinueProgress(game)).toMatchObject({
            total: null,
            label: "1h 30m played",
            value: 90,
            actionLabel: "+ 60 min",
            update: { payload: { type: UpdateType.PLAYTIME, playtime: 150 } },
        });
    });

    it("caps quick updates at the supported playtime limit", () => {
        expect(getGamesContinueProgress({ ...game, playtime: PLAYTIME_MAX_MINUTES - 15 })).toMatchObject({
            actionLabel: "+ 15 min",
            update: { payload: { type: UpdateType.PLAYTIME, playtime: PLAYTIME_MAX_MINUTES } },
        });
        expect(getGamesContinueProgress({ ...game, playtime: PLAYTIME_MAX_MINUTES }).update).toBeNull();
    });
});

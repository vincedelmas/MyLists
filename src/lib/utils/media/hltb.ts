import {dateFromUTCInput} from "@/lib/utils/formatting/date";


export type GameHltbData = {
    hltbMainTime: number | null;
    hltbLastCheckedAt: string | null;
    hltbMainAndExtraTime: number | null;
    hltbTotalCompleteTime: number | null;
};


export const shouldCheckGameHltb = (game: GameHltbData) => {
    const hasTimes = Boolean(game.hltbMainTime || game.hltbMainAndExtraTime || game.hltbTotalCompleteTime);

    return !hasTimes && (!game.hltbLastCheckedAt ||
        Date.now() - dateFromUTCInput(game.hltbLastCheckedAt).getTime() > 30 * 24 * 60 * 60 * 1000);
};

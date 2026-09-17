import {MediaType} from "@/lib/utils/enums";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getGamesContinueProgress(item: ContinueItemFor<typeof MediaType.GAMES>): ContinueProgress {
    const value = item.playtime ?? 0;
    const hours = Math.floor(value / 60);

    const minutes = value % 60;
    const update = gamesDefinition.continue.getUpdate(item);

    return {
        value,
        total: null,
        label: `${hours}h ${minutes}m played`,
        actionLabel: update ? `+ ${update.playtime - value} min` : "Playtime limit reached",
        update: update ? { payload: update } : null,
    };
}

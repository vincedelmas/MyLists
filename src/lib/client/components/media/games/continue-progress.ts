import {MediaType} from "@/lib/utils/enums";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {formatContinueProgress, type ContinueItemFor, type ContinueProgress} from "@/lib/client/components/continue/continue.utils";


export function getGamesContinueProgress(item: ContinueItemFor<typeof MediaType.GAMES>): ContinueProgress {
    const value = item.playtime ?? 0;
    const hours = Math.floor(value / 60);

    const minutes = value % 60;
    const update = gamesDefinition.continue.getUpdate(item);

    const total = item.hltbMainTime ? item.hltbMainTime * gamesDefinition.progress.timing.minutesPerInputUnit : null;
    const remaining = Math.max(0, Math.round((total ?? 0) - value));

    return {
        value,
        total,
        update: update ? { payload: update } : null,
        actionLabel: update ? `+ ${update.playtime - value} min` : "Playtime limit reached",
        label: formatContinueProgress(`${hours}h${minutes > 0 ? ` ${minutes}m` : ""} played`, total !== null ? remaining : null),
    };
}

import {Trophy} from "lucide-react";
import {Status} from "@/lib/utils/enums";
import {canShowProgress} from "@/lib/utils/media/status";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {toActivityDisplayValue} from "@/lib/utils/media/activity";
import {getGameAchievementPercent} from "@/lib/utils/media/game-achievements";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";


interface DisplayPlaytimeProps {
    status: Status;
    playtime: number | null;
    achievementsTotal?: number | null;
    achievementsUnlocked?: number | null;
}


export const DisplayPlaytime = ({ playtime, status, achievementsUnlocked, achievementsTotal }: DisplayPlaytimeProps) => {
    if (!canShowProgress(status)) return null;
    const achievementPercent = getGameAchievementPercent(achievementsUnlocked, achievementsTotal);

    const displayValue = playtime
        ? toActivityDisplayValue(gamesDefinition.identity.mediaType, playtime)
        : DEFAULT_DASH_FALLBACK;

    return (
        <div className="flex gap-x-2 items-center">
            <span>
                {displayValue} {gamesDefinition.statistics.durationDistribution.unit}
            </span>
            {achievementPercent !== null &&
                <span
                    title={`${achievementsUnlocked} / ${achievementsTotal} achievements`}
                    className={achievementPercent === 100
                        ? "inline-flex items-center gap-0.5 text-achievement"
                        : "inline-flex items-center gap-0.5 opacity-85"}
                >
                    <Trophy className="size-3 shrink-0" aria-hidden="true"/>
                    <span>
                        {achievementPercent}%
                    </span>
                </span>
            }
        </div>
    );
};

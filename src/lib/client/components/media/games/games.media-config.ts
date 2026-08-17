import {MediaType} from "@/lib/utils/enums";
import {XLineTop} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatNumber} from "@/lib/utils/number-formatting";
import {GameListItem} from "@/lib/client/components/media/games/GameListItem";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {GamesInfoGrid} from "@/lib/client/components/media/games/GamesInfoGrid";
import {GamesOverTitle} from "@/lib/client/components/media/games/GamesOverTitle";
import {GameFollowCard} from "@/lib/client/components/media/games/GameFollowCard";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {GamesUnderTitle} from "@/lib/client/components/media/games/GamesUnderTitle";
import {getGamesColumns} from "@/lib/client/components/media/games/GamesListColumns";
import {GamesUserDetails} from "@/lib/client/components/media/games/GamesUserDetails";
import {GamesExtraSections} from "@/lib/client/components/media/games/GamesExtraSections";
import {GamesUpComingAlert} from "@/lib/client/components/media/games/GamesUpComingAlert";
import {getGamesActiveFilters} from "@/lib/client/components/media/games/GamesActiveFilters";
import {gameSearchFilterDefinition} from "@/lib/client/components/media/games/GameSearchFilters";


export const gamesMediaConfig = defineMediaConfig({
    mediaType: MediaType.GAMES,
    infoGrid: GamesInfoGrid,
    overTitle: GamesOverTitle,
    underTitle: GamesUnderTitle,
    mediaListCard: GameListItem,
    mediaFollowCard: GameFollowCard,
    upComingAlert: GamesUpComingAlert,
    extraSections: GamesExtraSections,
    mediaListColumns: getGamesColumns,
    mediaUserDetails: GamesUserDetails,
    sheetFilters: getGamesActiveFilters,
    communityActivity: {
        countLabel: "Played",
        extraLabel: "Playtime",
        extraMetric: "totalPlaytime",
    },
    statistics: {
        getStatCards: (stats) => [
            {
                icon: XLineTop,
                title: "Avg. Game Playtime",
                subtitle: "All games included",
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 1 })} hours`,
            },
        ],
    },
    advancedSearch: {
        provider: gamesDefinition.externalSearch.provider,
        ...gameSearchFilterDefinition,
    },
});

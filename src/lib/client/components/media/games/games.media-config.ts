import {MediaType} from "@/lib/utils/enums";
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
    advancedSearch: {
        provider: gamesDefinition.externalSearch.provider,
        ...gameSearchFilterDefinition,
    },
});

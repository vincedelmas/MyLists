import {JobType, MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/formatting/number";
import {Building2, Gamepad2, XLineTop} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
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
import {getGamesContinueProgress} from "@/lib/client/components/media/games/continue-progress";
import {gameSearchFilterDefinition} from "@/lib/client/components/media/games/GameSearchFilters";


export const gamesMediaConfig = defineMediaConfig({
    mediaType: MediaType.GAMES,
    jobs: {
        [JobType.CREATOR]: {
            icon: Gamepad2,
            label: "Developer",
            descriptionSuffix: "",
            sectionTitle: "Catalogue",
            descriptionVerb: "developed by",
        },
        [JobType.PUBLISHER]: {
            icon: Building2,
            label: "Publisher",
            descriptionSuffix: "",
            sectionTitle: "Catalogue",
            descriptionVerb: "published by",
        },
    },
    infoGrid: GamesInfoGrid,
    overTitle: GamesOverTitle,
    underTitle: GamesUnderTitle,
    mediaListCard: GameListItem,
    mediaFollowCard: GameFollowCard,
    upComingAlert: GamesUpComingAlert,
    extraSections: GamesExtraSections,
    mediaListColumns: getGamesColumns,
    mediaUserDetails: GamesUserDetails,
    metadataFilters: {
        companies: { title: "Companies", type: "search" },
        platforms: { title: "Platforms", type: "checkbox" },
    },
    continue: {
        getProgress: getGamesContinueProgress,
    },
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

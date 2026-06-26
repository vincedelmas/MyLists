import React from "react";
import {ColumnDef} from "@tanstack/react-table";
import {MediaType, Status} from "@/lib/utils/enums";
import {BooksInfoGrid} from "./books/BooksInfoGrid";
import {MangaInfoGrid} from "./manga/MangaInfoGrid";
import {GamesInfoGrid} from "./games/GamesInfoGrid";
import {BooksOverTitle} from "./books/BooksOverTitle";
import {MangaOverTitle} from "./manga/MangaOverTitle";
import {GamesOverTitle} from "./games/GamesOverTitle";
import {MoviesInfoGrid} from "./movies/MoviesInfoGrid";
import {BooksUnderTitle} from "./books/BooksUnderTitle";
import {MangaUnderTitle} from "./manga/MangaUnderTitle";
import {GamesUnderTitle} from "./games/GamesUnderTitle";
import {SheetFilterObject} from "@/lib/types/media-list.types";
import {MoviesUnderTitle} from "./movies/MoviesUnderTitle";
import {GamesExtraSections} from "./games/GamesExtraSections";
import {GamesUpComingAlert} from "./games/GamesUpComingAlert";
import {MoviesUpComingAlert} from "./movies/MoviesUpComingAlert";
import {MoviesExtraSections} from "./movies/MoviesExtraSections";
import {TvInfoGrid} from "@/lib/client/components/media/tv/TvInfoGrid";
import {TvListItem} from "@/lib/client/components/media/tv/TvListItem";
import {TvOverTitle} from "@/lib/client/components/media/tv/TvOverTitle";
import {TvUnderTitle} from "@/lib/client/components/media/tv/TvUnderTitle";
import {TvFollowCard} from "@/lib/client/components/media/tv/TvFollowCard";
import {getTvColumns} from "@/lib/client/components/media/tv/TvListColumns";
import {TvUserDetails} from "@/lib/client/components/media/tv/TvUserDetails";
import {GameListItem} from "@/lib/client/components/media/games/GameListItem";
import {BookListItem} from "@/lib/client/components/media/books/BookListItem";
import {MangaListItem} from "@/lib/client/components/media/manga/MangaListItem";
import {TvUpComingAlert} from "@/lib/client/components/media/tv/TvUpComingAlert";
import {MovieListItem} from "@/lib/client/components/media/movies/MovieListItem";
import {TvExtraSections} from "@/lib/client/components/media/tv/TvExtraSections";
import {GameFollowCard} from "@/lib/client/components/media/games/GameFollowCard";
import {BookFollowCard} from "@/lib/client/components/media/books/BookFollowCard";
import {ColumnConfigProps} from "@/lib/client/components/media/base/BaseListTable";
import {getTvActiveFilters} from "@/lib/client/components/media/tv/TvActiveFilters";
import {MangaFollowCard} from "@/lib/client/components/media/manga/MangaFollowCard";
import {getGamesColumns} from "@/lib/client/components/media/games/GamesListColumns";
import {getBooksColumns} from "@/lib/client/components/media/books/BooksListColumns";
import {getMangaColumns} from "@/lib/client/components/media/manga/MangaListColumns";
import {MovieFollowCard} from "@/lib/client/components/media/movies/MovieFollowCard";
import {BooksUserDetails} from "@/lib/client/components/media/books/BookUserDetails";
import {MoviesOverTitle} from "@/lib/client/components/media/movies/MoviesOverTitle";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {MangaUserDetails} from "@/lib/client/components/media/manga/MangaUserDetails";
import {GamesUserDetails} from "@/lib/client/components/media/games/GamesUserDetails";
import {getMoviesColumns} from "@/lib/client/components/media/movies/MoviesListColumns";
import {MoviesUserDetails} from "@/lib/client/components/media/movies/MoviesUserDetails";
import {getMangaActiveFilters} from "@/lib/client/components/media/manga/MangaActiveFilters";
import {getBooksActiveFilters} from "@/lib/client/components/media/books/BooksActiveFilters";
import {getGamesActiveFilters} from "@/lib/client/components/media/games/GamesActiveFilters";
import {getMoviesActiveFilters} from "@/lib/client/components/media/movies/MoviesActiveFilters";
import {MediaCommunityActivityStats} from "@/lib/types/user-media.types";
import {UpdateUserMediaMutationOptions, UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {ExtractFollowByType, ExtractListByType, ExtractMediaDetailsByType, ExtractUserMediaByType} from "@/lib/types/query.options.types";


export type MediaConfig = {
    [T in MediaType]: {
        overTitle: React.FC<{
            mediaType: T;
            media: ExtractMediaDetailsByType<T>;
        }>;
        underTitle: React.FC<{
            mediaType: T;
            media: ExtractMediaDetailsByType<T>;
        }>;
        infoGrid: React.FC<{
            mediaType: T;
            media: ExtractMediaDetailsByType<T>;
        }>;
        upComingAlert?: React.FC<{
            mediaType: T;
            media: ExtractMediaDetailsByType<T>;
        }>;
        extraSections?: React.FC<{
            mediaType: T;
            media: ExtractMediaDetailsByType<T>;
        }>;

        mediaUserDetails: React.FC<{
            mediaType: T;
            queryOption: UserMediaQueryOption;
            userMedia: ExtractUserMediaByType<T>;
            mutationOptions?: UpdateUserMediaMutationOptions;
        }>;
        mediaFollowCard: React.FC<{
            showComment?: boolean,
            rating: React.ReactNode,
            followData: ExtractFollowByType<T>,
        }>;
        communityActivity: {
            countLabel: string;
            extraLabel: string;
            extraMetric: keyof Pick<MediaCommunityActivityStats, "totalRedo" | "totalPlaytime" | "totalSpecific">;
        };
        mediaListCard: React.FC<{
            mediaType: T,
            isCurrent: boolean,
            isConnected: boolean,
            allStatuses: Status[],
            rating: React.ReactNode,
            userMedia: ExtractListByType<T>,
            queryOption: ReturnType<typeof mediaListOptions>;
        }>;
        sheetFilters: () => SheetFilterObject[];
        mediaListColumns: (props: ColumnConfigProps) => (ColumnDef<ExtractListByType<T>>)[];
    };
};


export const mediaConfig: MediaConfig = {
    [MediaType.SERIES]: {
        overTitle: TvOverTitle,
        underTitle: TvUnderTitle,
        infoGrid: TvInfoGrid,
        upComingAlert: TvUpComingAlert,
        extraSections: TvExtraSections,
        mediaFollowCard: TvFollowCard,
        mediaUserDetails: TvUserDetails,
        communityActivity: {
            countLabel: "Watched",
            extraMetric: "totalRedo",
            extraLabel: "Rewatched seasons",
        },

        mediaListCard: TvListItem,
        mediaListColumns: getTvColumns,
        sheetFilters: getTvActiveFilters,
    },
    [MediaType.ANIME]: {
        overTitle: TvOverTitle,
        underTitle: TvUnderTitle,
        infoGrid: TvInfoGrid,
        upComingAlert: TvUpComingAlert,
        extraSections: TvExtraSections,

        mediaUserDetails: TvUserDetails,
        mediaFollowCard: TvFollowCard,
        communityActivity: {
            countLabel: "Watched",
            extraMetric: "totalRedo",
            extraLabel: "Rewatched seasons",
        },
        mediaListCard: TvListItem,
        mediaListColumns: getTvColumns,
        sheetFilters: getTvActiveFilters,
    },
    [MediaType.MOVIES]: {
        overTitle: MoviesOverTitle,
        underTitle: MoviesUnderTitle,
        infoGrid: MoviesInfoGrid,
        upComingAlert: MoviesUpComingAlert,
        extraSections: MoviesExtraSections,

        mediaUserDetails: MoviesUserDetails,
        mediaFollowCard: MovieFollowCard,
        communityActivity: {
            countLabel: "Watched",
            extraLabel: "Rewatches",
            extraMetric: "totalRedo",
        },
        mediaListCard: MovieListItem,
        mediaListColumns: getMoviesColumns,
        sheetFilters: getMoviesActiveFilters,
    },
    [MediaType.GAMES]: {
        overTitle: GamesOverTitle,
        underTitle: GamesUnderTitle,
        infoGrid: GamesInfoGrid,
        upComingAlert: GamesUpComingAlert,
        extraSections: GamesExtraSections,

        mediaUserDetails: GamesUserDetails,
        mediaFollowCard: GameFollowCard,
        communityActivity: {
            countLabel: "Played",
            extraLabel: "Playtime",
            extraMetric: "totalPlaytime",
        },
        mediaListCard: GameListItem,
        mediaListColumns: getGamesColumns,
        sheetFilters: getGamesActiveFilters,
    },
    [MediaType.BOOKS]: {
        overTitle: BooksOverTitle,
        underTitle: BooksUnderTitle,
        infoGrid: BooksInfoGrid,

        mediaUserDetails: BooksUserDetails,
        mediaFollowCard: BookFollowCard,
        communityActivity: {
            countLabel: "Read",
            extraLabel: "Rereads",
            extraMetric: "totalRedo",
        },
        mediaListCard: BookListItem,
        mediaListColumns: getBooksColumns,
        sheetFilters: getBooksActiveFilters,
    },
    [MediaType.MANGA]: {
        overTitle: MangaOverTitle,
        underTitle: MangaUnderTitle,
        infoGrid: MangaInfoGrid,

        mediaUserDetails: MangaUserDetails,
        mediaFollowCard: MangaFollowCard,
        communityActivity: {
            countLabel: "Read",
            extraLabel: "Rereads",
            extraMetric: "totalRedo",
        },
        mediaListCard: MangaListItem,
        mediaListColumns: getMangaColumns,
        sheetFilters: getMangaActiveFilters,
    },
};

import {MediaType} from "@/lib/utils/enums";
import type {
    AnimeDetailsPage,
    BookDetailsPage as BookDetailsContract,
    GameDetailsPage as GameDetailsContract,
    MangaDetailsPage as MangaDetailsContract,
    MovieDetailsPage as MovieDetailsContract,
    SeriesDetailsPage,
} from "@/lib/contracts/media/details";
import type {UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {DetailsLayout} from "@/lib/client/features/media-details/DetailsLayout";
import {TvOverTitle} from "@/lib/client/components/media/tv/TvOverTitle";
import {TvUnderTitle} from "@/lib/client/components/media/tv/TvUnderTitle";
import {TvInfoGrid} from "@/lib/client/components/media/tv/TvInfoGrid";
import {TvUpComingAlert} from "@/lib/client/components/media/tv/TvUpComingAlert";
import {TvExtraSections} from "@/lib/client/components/media/tv/TvExtraSections";
import {MoviesOverTitle} from "@/lib/client/components/media/movies/MoviesOverTitle";
import {MoviesUnderTitle} from "@/lib/client/components/media/movies/MoviesUnderTitle";
import {MoviesInfoGrid} from "@/lib/client/components/media/movies/MoviesInfoGrid";
import {MoviesUpComingAlert} from "@/lib/client/components/media/movies/MoviesUpComingAlert";
import {MoviesExtraSections} from "@/lib/client/components/media/movies/MoviesExtraSections";
import {GamesOverTitle} from "@/lib/client/components/media/games/GamesOverTitle";
import {GamesUnderTitle} from "@/lib/client/components/media/games/GamesUnderTitle";
import {GamesInfoGrid} from "@/lib/client/components/media/games/GamesInfoGrid";
import {GamesUpComingAlert} from "@/lib/client/components/media/games/GamesUpComingAlert";
import {GamesExtraSections} from "@/lib/client/components/media/games/GamesExtraSections";
import {BooksOverTitle} from "@/lib/client/components/media/books/BooksOverTitle";
import {BooksUnderTitle} from "@/lib/client/components/media/books/BooksUnderTitle";
import {BooksInfoGrid} from "@/lib/client/components/media/books/BooksInfoGrid";
import {MangaOverTitle} from "@/lib/client/components/media/manga/MangaOverTitle";
import {MangaUnderTitle} from "@/lib/client/components/media/manga/MangaUnderTitle";
import {MangaInfoGrid} from "@/lib/client/components/media/manga/MangaInfoGrid";


type FamilyPageProps<T> = { details: T; queryOption: UserMediaQueryOption };


export const TvDetailsPage = ({ details, queryOption }: FamilyPageProps<SeriesDetailsPage | AnimeDetailsPage>) => {
    const { kind, media } = details;
    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind, seasons: media.seasons }}
            alternateTitle={media.originalName}
            overTitle={<TvOverTitle mediaType={kind} media={media}/>}
            underTitle={<TvUnderTitle mediaType={kind} media={media}/>}
            infoGrid={<TvInfoGrid mediaType={kind} media={media}/>}
            upcomingAlert={<TvUpComingAlert mediaType={kind} media={media}/>}
            extraSections={<TvExtraSections mediaType={kind} media={media}/>}
        />
    );
};


export const MovieDetailsPage = ({ details, queryOption }: FamilyPageProps<MovieDetailsContract>) => {
    const { media } = details;
    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind: MediaType.MOVIES }}
            alternateTitle={media.originalName}
            overTitle={<MoviesOverTitle mediaType={MediaType.MOVIES} media={media}/>}
            underTitle={<MoviesUnderTitle mediaType={MediaType.MOVIES} media={media}/>}
            infoGrid={<MoviesInfoGrid mediaType={MediaType.MOVIES} media={media}/>}
            upcomingAlert={<MoviesUpComingAlert mediaType={MediaType.MOVIES} media={media}/>}
            extraSections={<MoviesExtraSections mediaType={MediaType.MOVIES} media={media}/>}
        />
    );
};


export const GameDetailsPage = ({ details, queryOption }: FamilyPageProps<GameDetailsContract>) => {
    const { media } = details;
    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind: MediaType.GAMES }}
            overTitle={<GamesOverTitle mediaType={MediaType.GAMES} media={media}/>}
            underTitle={<GamesUnderTitle mediaType={MediaType.GAMES} media={media}/>}
            infoGrid={<GamesInfoGrid mediaType={MediaType.GAMES} media={media}/>}
            upcomingAlert={<GamesUpComingAlert mediaType={MediaType.GAMES} media={media}/>}
            extraSections={<GamesExtraSections mediaType={MediaType.GAMES} media={media}/>}
        />
    );
};


export const BookDetailsPage = ({ details, queryOption }: FamilyPageProps<BookDetailsContract>) => {
    const { media } = details;
    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind: MediaType.BOOKS, pages: media.pages }}
            allowDefaultBookCoverEdit
            overTitle={<BooksOverTitle mediaType={MediaType.BOOKS} media={media}/>}
            underTitle={<BooksUnderTitle mediaType={MediaType.BOOKS} media={media}/>}
            infoGrid={<BooksInfoGrid mediaType={MediaType.BOOKS} media={media}/>}
        />
    );
};


export const MangaDetailsPage = ({ details, queryOption }: FamilyPageProps<MangaDetailsContract>) => {
    const { media } = details;
    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind: MediaType.MANGA, chapters: media.chapters }}
            alternateTitle={media.originalName}
            overTitle={<MangaOverTitle mediaType={MediaType.MANGA} media={media}/>}
            underTitle={<MangaUnderTitle mediaType={MediaType.MANGA} media={media}/>}
            infoGrid={<MangaInfoGrid mediaType={MediaType.MANGA} media={media}/>}
        />
    );
};

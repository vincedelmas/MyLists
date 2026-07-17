import {MediaType} from "@/lib/utils/enums";
import {TvInfoGrid} from "@/lib/client/components/media/tv/TvInfoGrid";
import {TvOverTitle} from "@/lib/client/components/media/tv/TvOverTitle";
import {TvUnderTitle} from "@/lib/client/components/media/tv/TvUnderTitle";
import {DetailsLayout} from "@/lib/client/components/features/media-details/DetailsLayout";
import {GamesInfoGrid} from "@/lib/client/components/media/games/GamesInfoGrid";
import {BooksInfoGrid} from "@/lib/client/components/media/books/BooksInfoGrid";
import {MangaInfoGrid} from "@/lib/client/components/media/manga/MangaInfoGrid";
import {TvUpComingAlert} from "@/lib/client/components/media/tv/TvUpComingAlert";
import {TvExtraSections} from "@/lib/client/components/media/tv/TvExtraSections";
import {MangaOverTitle} from "@/lib/client/components/media/manga/MangaOverTitle";
import {BooksOverTitle} from "@/lib/client/components/media/books/BooksOverTitle";
import {GamesOverTitle} from "@/lib/client/components/media/games/GamesOverTitle";
import {MoviesInfoGrid} from "@/lib/client/components/media/movies/MoviesInfoGrid";
import {GamesUnderTitle} from "@/lib/client/components/media/games/GamesUnderTitle";
import {BooksUnderTitle} from "@/lib/client/components/media/books/BooksUnderTitle";
import {MangaUnderTitle} from "@/lib/client/components/media/manga/MangaUnderTitle";
import {MoviesOverTitle} from "@/lib/client/components/media/movies/MoviesOverTitle";
import {MoviesUnderTitle} from "@/lib/client/components/media/movies/MoviesUnderTitle";
import {GamesUpComingAlert} from "@/lib/client/components/media/games/GamesUpComingAlert";
import {GamesExtraSections} from "@/lib/client/components/media/games/GamesExtraSections";
import {MoviesUpComingAlert} from "@/lib/client/components/media/movies/MoviesUpComingAlert";
import {MoviesExtraSections} from "@/lib/client/components/media/movies/MoviesExtraSections";
import type {UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import type {
    AnimeDetailsPage,
    BookDetailsPage as BookDetailsContract,
    GameDetailsPage as GameDetailsContract,
    MangaDetailsPage as MangaDetailsContract,
    MovieDetailsPage as MovieDetailsContract,
    SeriesDetailsPage,
} from "@/lib/contracts/media/details";


type KindPageProps<T> = {
    details: T;
    queryOption: UserMediaQueryOption;
};


export const TvDetailsPage = ({ details, queryOption }: KindPageProps<SeriesDetailsPage | AnimeDetailsPage>) => {
    const { kind, media } = details;

    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            alternateTitle={media.originalName}
            progressMetadata={{ kind, seasons: media.seasons }}
            infoGrid={<TvInfoGrid mediaType={kind} media={media}/>}
            overTitle={<TvOverTitle mediaType={kind} media={media}/>}
            underTitle={<TvUnderTitle mediaType={kind} media={media}/>}
            upcomingAlert={<TvUpComingAlert mediaType={kind} media={media}/>}
            extraSections={<TvExtraSections mediaType={kind} media={media}/>}
        />
    );
};


export const MovieDetailsPage = ({ details, queryOption }: KindPageProps<MovieDetailsContract>) => {
    const { media } = details;

    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            alternateTitle={media.originalName}
            progressMetadata={{ kind: MediaType.MOVIES }}
            infoGrid={<MoviesInfoGrid mediaType={MediaType.MOVIES} media={media}/>}
            overTitle={<MoviesOverTitle mediaType={MediaType.MOVIES} media={media}/>}
            underTitle={<MoviesUnderTitle mediaType={MediaType.MOVIES} media={media}/>}
            upcomingAlert={<MoviesUpComingAlert mediaType={MediaType.MOVIES} media={media}/>}
            extraSections={<MoviesExtraSections mediaType={MediaType.MOVIES} media={media}/>}
        />
    );
};


export const GameDetailsPage = ({ details, queryOption }: KindPageProps<GameDetailsContract>) => {
    const { media } = details;

    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            progressMetadata={{ kind: MediaType.GAMES }}
            infoGrid={<GamesInfoGrid mediaType={MediaType.GAMES} media={media}/>}
            overTitle={<GamesOverTitle mediaType={MediaType.GAMES} media={media}/>}
            underTitle={<GamesUnderTitle mediaType={MediaType.GAMES} media={media}/>}
            upcomingAlert={<GamesUpComingAlert mediaType={MediaType.GAMES} media={media}/>}
            extraSections={<GamesExtraSections mediaType={MediaType.GAMES} media={media}/>}
        />
    );
};


export const BookDetailsPage = ({ details, queryOption }: KindPageProps<BookDetailsContract>) => {
    const { media } = details;

    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            allowDefaultBookCoverEdit={true}
            progressMetadata={{ kind: MediaType.BOOKS, pages: media.pages }}
            infoGrid={<BooksInfoGrid mediaType={MediaType.BOOKS} media={media}/>}
            overTitle={<BooksOverTitle mediaType={MediaType.BOOKS} media={media}/>}
            underTitle={<BooksUnderTitle mediaType={MediaType.BOOKS} media={media}/>}
        />
    );
};


export const MangaDetailsPage = ({ details, queryOption }: KindPageProps<MangaDetailsContract>) => {
    const { media } = details;

    return (
        <DetailsLayout
            details={details}
            queryOption={queryOption}
            alternateTitle={media.originalName}
            infoGrid={<MangaInfoGrid mediaType={MediaType.MANGA} media={media}/>}
            progressMetadata={{ kind: MediaType.MANGA, chapters: media.chapters }}
            overTitle={<MangaOverTitle mediaType={MediaType.MANGA} media={media}/>}
            underTitle={<MangaUnderTitle mediaType={MediaType.MANGA} media={media}/>}
        />
    );
};

import type {ReactNode} from "react";
import type {ColumnDef} from "@tanstack/react-table";
import {MediaType} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {formatRating} from "@/lib/utils/ratings-formatting";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {TypedMediaTable} from "@/lib/client/components/media/base/TypedMediaTable";
import type {ColumnConfigProps} from "@/lib/client/components/media/base/BaseListTable";
import {TvListItem} from "@/lib/client/components/media/tv/TvListItem";
import {MovieListItem} from "@/lib/client/components/media/movies/MovieListItem";
import {GameListItem} from "@/lib/client/components/media/games/GameListItem";
import {BookListItem} from "@/lib/client/components/media/books/BookListItem";
import {MangaListItem} from "@/lib/client/components/media/manga/MangaListItem";
import {getTvColumns} from "@/lib/client/components/media/tv/TvListColumns";
import {getMoviesColumns} from "@/lib/client/components/media/movies/MoviesListColumns";
import {getGamesColumns} from "@/lib/client/components/media/games/GamesListColumns";
import {getBooksColumns} from "@/lib/client/components/media/books/BooksListColumns";
import {getMangaColumns} from "@/lib/client/components/media/manga/MangaListColumns";
import type {UserMediaItem} from "@/lib/types/query.options.types";
import type {FamilyListItemProps} from "@/lib/client/components/media/family-component.types";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import type {
    AnimeListPage,
    BookListArgs,
    BookListPage,
    GameListArgs,
    GameListPage,
    MangaListArgs,
    MangaListPage,
    MovieListArgs,
    MovieListPage,
    SeriesListPage,
    TvListArgs,
} from "@/lib/contracts/media/lists";


interface FamilyListViewProps<P, A extends TvListArgs | MovieListArgs | GameListArgs | BookListArgs | MangaListArgs> {
    page: P;
    filters: A;
    isCurrent: boolean;
    isGrid: boolean;
    queryOption: ReturnType<typeof mediaListOptions>;
    onChangePage: (filters: { page: number }) => void;
}

type SharedListViewProps<T extends UserMediaItem, A extends TvListArgs | MovieListArgs | GameListArgs | BookListArgs | MangaListArgs> = FamilyListViewProps<{
    items: T[];
    pagination: SeriesListPage["pagination"];
}, A> & {
    kind: T["kind"];
    getColumns: (props: ColumnConfigProps) => ColumnDef<T>[];
    renderCard: (item: T, props: Omit<FamilyListItemProps<T["kind"]>, "userMedia">) => ReactNode;
};


const SharedListView = <T extends UserMediaItem, A extends TvListArgs | MovieListArgs | GameListArgs | BookListArgs | MangaListArgs>({
    page,
    kind,
    filters,
    isCurrent,
    isGrid,
    queryOption,
    getColumns,
    renderCard,
    onChangePage,
}: SharedListViewProps<T, A>) => {
    const { currentUser } = useAuth();
    const isConnected = !!currentUser;
    const allStatuses = statusUtils.byMediaType(kind);
    const isMediaTypeActive = currentUser?.settings.some((setting) => setting.mediaType === kind && setting.active) ?? false;
    const cardProps = { isCurrent, isConnected, isMediaTypeActive, allStatuses, mediaType: kind, queryOption };

    if (!isGrid) {
        return (
            <TypedMediaTable
                filters={filters}
                mediaType={kind}
                isCurrent={isCurrent}
                results={page}
                queryOption={queryOption}
                getColumns={getColumns}
                onChangePage={onChangePage}
            />
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4 lg:grid-cols-5 sm:gap-5">
                {page.items.map((item) =>
                    <div key={item.mediaId}>{renderCard(item, {
                        ...cardProps,
                        rating: formatRating(item.ratingSystem, item.rating),
                    })}</div>
                )}
            </div>
            <div className="mt-8">
                <Pagination
                    currentPage={page.pagination.page}
                    totalPages={page.pagination.totalPages}
                    onChangePage={(pageNumber) => onChangePage({ page: pageNumber })}
                />
            </div>
        </>
    );
};


export const TvListView = (props: FamilyListViewProps<SeriesListPage | AnimeListPage, TvListArgs>) => {
    if (props.page.kind === MediaType.SERIES) {
        return (
            <SharedListView
                {...props}
                page={props.page}
                kind={MediaType.SERIES}
                getColumns={(columnProps) => getTvColumns<typeof MediaType.SERIES>(columnProps)}
                renderCard={(userMedia, cardProps) => <TvListItem {...cardProps} mediaType={MediaType.SERIES} userMedia={userMedia}/>}
            />
        );
    }

    return (
        <SharedListView
            {...props}
            page={props.page}
            kind={MediaType.ANIME}
            getColumns={(columnProps) => getTvColumns<typeof MediaType.ANIME>(columnProps)}
            renderCard={(userMedia, cardProps) => <TvListItem {...cardProps} mediaType={MediaType.ANIME} userMedia={userMedia}/>}
        />
    );
};


export const MovieListView = (props: FamilyListViewProps<MovieListPage, MovieListArgs>) => (
    <SharedListView
        {...props}
        page={props.page}
        kind={MediaType.MOVIES}
        getColumns={getMoviesColumns}
        renderCard={(userMedia, cardProps) => <MovieListItem {...cardProps} mediaType={MediaType.MOVIES} userMedia={userMedia}/>}
    />
);

export const GameListView = (props: FamilyListViewProps<GameListPage, GameListArgs>) => (
    <SharedListView
        {...props}
        page={props.page}
        kind={MediaType.GAMES}
        getColumns={getGamesColumns}
        renderCard={(userMedia, cardProps) => <GameListItem {...cardProps} mediaType={MediaType.GAMES} userMedia={userMedia}/>}
    />
);

export const BookListView = (props: FamilyListViewProps<BookListPage, BookListArgs>) => (
    <SharedListView
        {...props}
        page={props.page}
        kind={MediaType.BOOKS}
        getColumns={getBooksColumns}
        renderCard={(userMedia, cardProps) => <BookListItem {...cardProps} mediaType={MediaType.BOOKS} userMedia={userMedia}/>}
    />
);

export const MangaListView = (props: FamilyListViewProps<MangaListPage, MangaListArgs>) => (
    <SharedListView
        {...props}
        page={props.page}
        kind={MediaType.MANGA}
        getColumns={getMangaColumns}
        renderCard={(userMedia, cardProps) => <MangaListItem {...cardProps} mediaType={MediaType.MANGA} userMedia={userMedia}/>}
    />
);

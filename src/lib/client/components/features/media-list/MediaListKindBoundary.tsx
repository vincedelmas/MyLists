import {MediaType} from "@/lib/utils/enums";
import type {MediaListArgs} from "@/lib/schemas";
import {assertNever} from "@/lib/utils/assert-never";
import type {MediaListPage} from "@/lib/contracts/media/lists";
import {bookListArgsSchema, gameListArgsSchema, mangaListArgsSchema, movieListArgsSchema, tvListArgsSchema} from "@/lib/contracts/media/lists";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import {BookListView, GameListView, MangaListView, MovieListView, TvListView} from "@/lib/client/components/features/media-list/KindListViews";


interface MediaListFamilyBoundaryProps {
    isGrid: boolean;
    isCurrent: boolean;
    page: MediaListPage;
    queryOption: ReturnType<typeof mediaListOptions>;
    onChangePage: (filters: { page: number }) => void;
    filters: MediaListArgs & { view?: "grid" | "list" };
}


export const MediaListKindBoundary = ({ page, filters, isCurrent, isGrid, queryOption, onChangePage }: MediaListFamilyBoundaryProps) => {
    const { view: _view, ...listFilters } = filters;
    const shared = { isCurrent, isGrid, queryOption, onChangePage };

    switch (page.kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return <TvListView {...shared} filters={tvListArgsSchema.parse(listFilters)} page={page}/>;
        case MediaType.MOVIES:
            return <MovieListView {...shared} filters={movieListArgsSchema.parse(listFilters)} page={page}/>;
        case MediaType.GAMES:
            return <GameListView {...shared} filters={gameListArgsSchema.parse(listFilters)} page={page}/>;
        case MediaType.BOOKS:
            return <BookListView {...shared} filters={bookListArgsSchema.parse(listFilters)} page={page}/>;
        case MediaType.MANGA:
            return <MangaListView {...shared} filters={mangaListArgsSchema.parse(listFilters)} page={page}/>;
        default:
            return assertNever(page, "media list family");
    }
};

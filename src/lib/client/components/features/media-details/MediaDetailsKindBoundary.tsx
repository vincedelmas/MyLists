import {MediaType} from "@/lib/utils/enums";
import {assertNever} from "@/lib/utils/assert-never";
import type {MediaDetailsPage} from "@/lib/contracts/media/details";
import type {UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {BookDetailsPage, GameDetailsPage, MangaDetailsPage, MovieDetailsPage, TvDetailsPage,} from "@/lib/client/components/features/media-details/KindDetailsPages";


interface MediaDetailsFamilyBoundaryProps {
    details: MediaDetailsPage;
    queryOption: UserMediaQueryOption;
}


export const MediaDetailsKindBoundary = ({ details, queryOption }: MediaDetailsFamilyBoundaryProps) => {
    switch (details.kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return <TvDetailsPage details={details} queryOption={queryOption}/>;
        case MediaType.MOVIES:
            return <MovieDetailsPage details={details} queryOption={queryOption}/>;
        case MediaType.GAMES:
            return <GameDetailsPage details={details} queryOption={queryOption}/>;
        case MediaType.BOOKS:
            return <BookDetailsPage details={details} queryOption={queryOption}/>;
        case MediaType.MANGA:
            return <MangaDetailsPage details={details} queryOption={queryOption}/>;
        default:
            return assertNever(details, "media details family");
    }
};

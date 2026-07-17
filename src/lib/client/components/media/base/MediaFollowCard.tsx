import {MediaType} from "@/lib/utils/enums";
import {formatRating} from "@/lib/utils/ratings-formatting";
import {MediaFollowsDetails} from "@/lib/types/query.options.types";
import {CommunityActivityItem} from "@/lib/contracts/media/community";
import {TvFollowCard} from "@/lib/client/components/media/tv/TvFollowCard";
import {MovieFollowCard} from "@/lib/client/components/media/movies/MovieFollowCard";
import {GameFollowCard} from "@/lib/client/components/media/games/GameFollowCard";
import {BookFollowCard} from "@/lib/client/components/media/books/BookFollowCard";
import {MangaFollowCard} from "@/lib/client/components/media/manga/MangaFollowCard";
import {assertNever} from "@/lib/utils/assert-never";


interface MediaFollowCardProps {
    showComment?: boolean;
    followData: MediaFollowsDetails[number] | CommunityActivityItem;
}


export const MediaFollowCard = ({ followData, showComment }: MediaFollowCardProps) => {
    const rating = formatRating(followData.ratingSystem, followData.userMedia.rating);

    switch (followData.kind) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return <TvFollowCard rating={rating} followData={followData} showComment={showComment}/>;
        case MediaType.MOVIES:
            return <MovieFollowCard rating={rating} followData={followData} showComment={showComment}/>;
        case MediaType.GAMES:
            return <GameFollowCard rating={rating} followData={followData} showComment={showComment}/>;
        case MediaType.BOOKS:
            return <BookFollowCard rating={rating} followData={followData} showComment={showComment}/>;
        case MediaType.MANGA:
            return <MangaFollowCard rating={rating} followData={followData} showComment={showComment}/>;
        default:
            return assertNever(followData, "follow-card family");
    }
};

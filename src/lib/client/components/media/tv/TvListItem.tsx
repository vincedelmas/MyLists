import {MediaType, TvMediaType} from "@/lib/utils/enums";
import {TvSeasonPopover} from "@/lib/client/components/media/tv/TvSeasonPopover";
import {MediaListCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


type TvListItemProps<T extends MediaType> = MediaListCardProps<T>;


export const TvListItem = (props: TvListItemProps<TvMediaType>) => {
    return (
        <BaseMediaListItem
            {...props}
            ratingDisplay={
                <TvSeasonPopover
                    kind="rating"
                    mediaType={props.mediaType}
                    value={props.userMedia.rating}
                    userId={props.userMedia.userId}
                    mediaId={props.userMedia.mediaId}
                    ratingSystem={props.userMedia.ratingSystem}
                />
            }
            redoDisplay={
                <TvSeasonPopover
                    kind="redo"
                    mediaType={props.mediaType}
                    value={props.userMedia.redo}
                    userId={props.userMedia.userId}
                    mediaId={props.userMedia.mediaId}
                    ratingSystem={props.userMedia.ratingSystem}
                />
            }
            mediaDetailsDisplay={
                <DisplayEpsAndSeasons
                    status={props.userMedia.status}
                    currentSeason={props.userMedia.currentSeason}
                    currentEpisode={props.userMedia.currentEpisode}
                />
            }
        />
    );
};

import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/utils/enums";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {MediaListCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


type TvListItemProps<T extends MediaType> = MediaListCardProps<T>;


export const TvListItem = (props: TvListItemProps<TvMediaType>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={
                props.userMedia.redo.reduce((a, c) => a + c, 0) > 0 &&
                <DisplayTvRedo
                    redoValues={props.userMedia.redo}
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

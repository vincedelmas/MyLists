import {TvMediaType} from "@/lib/types/media-kind.types";
import {KindListItemProps} from "@/lib/client/components/media/family-component.types";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


export const TvListItem = (props: KindListItemProps<TvMediaType>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={
                props.userMedia.rewatches.length > 0 &&
                <DisplayTvRedo
                    rewatches={props.userMedia.rewatches}
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

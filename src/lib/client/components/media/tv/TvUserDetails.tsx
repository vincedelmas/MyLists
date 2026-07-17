import {Status} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {UpdateTvRedo} from "@/lib/client/components/media/tv/UpdateTvRedo";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {UpdateSeasonsEps} from "@/lib/client/components/media/tv/UpdateSeasonsEps";
import {KindEntryEditorProps} from "@/lib/client/components/media/family-component.types";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type TvUserDetailsProps = KindEntryEditorProps<TvMediaType> & {
    seasons: {
        seasonNumber: number;
        episodeCount: number;
    }[];
};


export const TvUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions, seasons }: TvUserDetailsProps) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />
            {(userMedia.status !== Status.PLAN_TO_WATCH && userMedia.status !== Status.RANDOM) &&
                <UpdateSeasonsEps
                    seasons={seasons}
                    currentSeason={userMedia.currentSeason}
                    currentEpisode={userMedia.currentEpisode}
                    onUpdateMutation={updateUserMediaMutation}
                />
            }
            {userMedia.status !== Status.PLAN_TO_WATCH &&
                <div className="flex justify-between items-center">
                    <div>Rating</div>
                    <UpdateRating
                        rating={userMedia.rating}
                        disabled={mutationOptions?.backlogMode}
                        onUpdateMutation={updateUserMediaMutation}
                    />
                </div>
            }
            {!(userMedia.status === Status.PLAN_TO_WATCH || userMedia.status === Status.RANDOM) &&
                <div className="flex justify-between items-center">
                    <div>Re-watched</div>
                    <UpdateTvRedo
                        rewatches={userMedia.rewatches}
                        seasons={seasons}
                        onUpdateMutation={updateUserMediaMutation}
                    />
                </div>
            }
        </>
    );
};

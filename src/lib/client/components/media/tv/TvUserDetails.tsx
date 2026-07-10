import {MediaType, Status} from "@/lib/utils/enums";
import {useQueryClient} from "@tanstack/react-query";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {UpdateTvRedo} from "@/lib/client/components/media/tv/UpdateTvRedo";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {UpdateSeasonsEps} from "@/lib/client/components/media/tv/UpdateSeasonsEps";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type TvUserDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaUserDetails"]>[number];


export const TvUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: TvUserDetailsProps<TvMediaType>) => {
    const queryClient = useQueryClient();
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);
    const mediaData = getMediaData()!;

    function getMediaData() {
        if (queryOption.queryKey[0] === "details") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            return apiData?.media;
        }
        else if (queryOption.queryKey[0] === "userList") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            return apiData?.results.items.find((m) => m.mediaId === userMedia.mediaId);
        }
    }

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />
            {(userMedia.status !== Status.PLAN_TO_WATCH && userMedia.status !== Status.RANDOM) &&
                <UpdateSeasonsEps
                    epsPerSeason={mediaData.epsPerSeason!}
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
                        redoValues={userMedia.redo2}
                        onUpdateMutation={updateUserMediaMutation}
                    />
                </div>
            }
        </>
    );
};

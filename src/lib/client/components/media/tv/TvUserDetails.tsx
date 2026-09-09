import {useState} from "react";
import {Pencil} from "lucide-react";
import {useQueryClient} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {UpdateTvRedo} from "@/lib/client/components/media/tv/UpdateTvRedo";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {MediaType, Status, TvMediaType, UpdateType} from "@/lib/utils/enums";
import {RatingSelect} from "@/lib/client/components/media/base/RatingSelect";
import {TvSeasonEditor} from "@/lib/client/components/media/tv/TvSeasonEditor";
import {UpdateSeasonsEps} from "@/lib/client/components/media/tv/UpdateSeasonsEps";
import {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type TvUserDetailsProps<T extends MediaType> = MediaUserDetailsProps<T>;


export const TvUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: TvUserDetailsProps<TvMediaType>) => {
    const queryClient = useQueryClient();
    const [ratingsOpen, setRatingsOpen] = useState(false);

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

                    <ButtonGroup className="w-34">
                        <RatingSelect
                            bulk={true}
                            rating={userMedia.rating}
                            disabled={mutationOptions?.backlogMode || updateUserMediaMutation.isPending}
                            onChange={rating => updateUserMediaMutation.mutate({ payload: { type: UpdateType.RATING, rating } })}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-input/30"
                            onClick={() => setRatingsOpen(true)}
                            disabled={mutationOptions?.backlogMode || updateUserMediaMutation.isPending}
                        >
                            <Pencil/>
                        </Button>
                    </ButtonGroup>

                    <TvSeasonEditor
                        mode="rating"
                        open={ratingsOpen}
                        mediaType={mediaType}
                        userId={userMedia.userId}
                        mediaId={userMedia.mediaId}
                        onOpenChange={setRatingsOpen}
                        mutation={updateUserMediaMutation}
                    />
                </div>
            }
            {!(userMedia.status === Status.PLAN_TO_WATCH || userMedia.status === Status.RANDOM) &&
                <div className="flex justify-between items-center">
                    <div>Re-watched</div>
                    <UpdateTvRedo
                        redo={userMedia.redo}
                        mediaType={mediaType}
                        userId={userMedia.userId}
                        mediaId={userMedia.mediaId}
                        onUpdateMutation={updateUserMediaMutation}
                    />
                </div>
            }
        </>
    );
};

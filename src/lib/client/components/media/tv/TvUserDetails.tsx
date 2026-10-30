import {useState} from "react";
import {Pencil} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {UpdateTvRedo} from "@/lib/client/components/media/tv/UpdateTvRedo";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {MediaType, Status, TvMediaType, UpdateType} from "@/lib/utils/enums";
import {RatingSelect} from "@/lib/client/components/media/base/RatingSelect";
import {TvSeasonEditor} from "@/lib/client/components/media/tv/TvSeasonEditor";
import {UpdateSeasonsEps} from "@/lib/client/components/media/tv/UpdateSeasonsEps";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type TvUserDetailsProps<T extends MediaType> = MediaUserDetailsProps<T>;


export const TvUserDetails = ({ userMedia, mediaType, media, mutationOptions }: TvUserDetailsProps<TvMediaType>) => {
    const [ratingsOpen, setRatingsOpen] = useState(false);
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />

            {(userMedia.status !== Status.PLAN_TO_WATCH && userMedia.status !== Status.RANDOM) &&
                <UpdateSeasonsEps
                    epsPerSeason={media.epsPerSeason!}
                    currentSeason={userMedia.currentSeason}
                    currentEpisode={userMedia.currentEpisode}
                    onUpdateMutation={updateUserMediaMutation}
                />
            }

            {userMedia.status !== Status.PLAN_TO_WATCH &&
                <div className="flex justify-between items-center">
                    <div>Rating</div>

                    <MediaSaveFeedback
                        mutation={updateUserMediaMutation}
                        field={["rating", "seasonRating"]}
                        disabled={mutationOptions?.backlogMode}
                    >
                        {saveDisabled =>
                            <ButtonGroup className="w-34">
                                <RatingSelect
                                    bulk={true}
                                    disabled={saveDisabled}
                                    rating={userMedia.rating}
                                    onChange={rating => updateUserMediaMutation.mutate({ payload: { type: UpdateType.RATING, rating } })}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-input/30"
                                    disabled={saveDisabled}
                                    onClick={() => setRatingsOpen(true)}
                                >
                                    <Pencil/>
                                </Button>
                            </ButtonGroup>
                        }
                    </MediaSaveFeedback>

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

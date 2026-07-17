import {MediaType, Status} from "@/lib/utils/enums";
import {FamilyEntryEditorProps} from "@/lib/client/components/media/family-component.types";
import {UpdateRepeatCount} from "@/lib/client/components/media/base/UpdateRepeatCount";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


export const MoviesUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: FamilyEntryEditorProps<typeof MediaType.MOVIES>) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />
            {userMedia.status !== Status.PLAN_TO_WATCH &&
                <>
                    <div className="flex justify-between items-center">
                        <div>Rating</div>
                        <UpdateRating
                            rating={userMedia.rating}
                            disabled={mutationOptions?.backlogMode}
                            onUpdateMutation={updateUserMediaMutation}
                        />
                    </div>
                    <UpdateRepeatCount
                        name={"Re-watched"}
                        count={userMedia.rewatchCount}
                        family="movie"
                        mutation={updateUserMediaMutation}
                    />
                </>
            }
        </>
    );
};

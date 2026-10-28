import React from "react";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {UpdateRedo} from "@/lib/client/components/media/base/UpdateRedo";
import {UpdateInput} from "@/lib/client/components/media/base/UpdateInput";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type MangaUserDetailsProps<T extends MediaType> = MediaUserDetailsProps<T>;


export const MangaUserDetails = ({ userMedia, mediaType, media, mutationOptions }: MangaUserDetailsProps<typeof MediaType.MANGA>) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />
            {userMedia.status !== Status.PLAN_TO_READ &&
                <>
                    <div className="flex justify-between items-center">
                        <div>Chapters</div>
                        <UpdateInput
                            total={media.chapters}
                            payloadName={"currentChapter"}
                            updateType={UpdateType.CHAPTER}
                            initValue={userMedia.currentChapter}
                            updateInput={updateUserMediaMutation}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <div>Rating</div>
                        <UpdateRating
                            rating={userMedia.rating}
                            disabled={mutationOptions?.backlogMode}
                            onUpdateMutation={updateUserMediaMutation}
                        />
                    </div>
                </>
            }
            {(userMedia.status !== Status.PLAN_TO_READ && media.chapters) &&
                <UpdateRedo
                    name={"Re-read"}
                    redo={userMedia.redo}
                    updateRedo={updateUserMediaMutation}
                />
            }
        </>
    );
};

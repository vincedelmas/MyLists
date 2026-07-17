import React from "react";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {FamilyEntryEditorProps} from "@/lib/client/components/media/family-component.types";
import {UpdateRepeatCount} from "@/lib/client/components/media/base/UpdateRepeatCount";
import {UpdateInput} from "@/lib/client/components/media/base/UpdateInput";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type MangaUserDetailsProps = FamilyEntryEditorProps<typeof MediaType.MANGA> & { chapters: number | null };


export const MangaUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions, chapters }: MangaUserDetailsProps) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                completable={!!chapters}
                updateStatus={updateUserMediaMutation}
            />
            {userMedia.status !== Status.PLAN_TO_READ &&
                <>
                    <div className="flex justify-between items-center">
                        <div>Chapters</div>
                        <UpdateInput
                            total={chapters}
                            updateType={UpdateType.CHAPTER}
                            initValue={userMedia.currentChapter}
                            updateInput={updateUserMediaMutation}
                            key={userMedia.currentChapter ?? "null"}
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
            {(userMedia.status !== Status.PLAN_TO_READ && chapters) &&
                <UpdateRepeatCount
                    name={"Re-read"}
                    count={userMedia.rereadCount}
                    family="reading"
                    mutation={updateUserMediaMutation}
                />
            }
        </>
    );
};

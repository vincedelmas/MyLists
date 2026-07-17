import React from "react";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {FamilyEntryEditorProps} from "@/lib/client/components/media/family-component.types";
import {UpdateRepeatCount} from "@/lib/client/components/media/base/UpdateRepeatCount";
import {UpdateInput} from "@/lib/client/components/media/base/UpdateInput";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type BooksUserDetailsProps = FamilyEntryEditorProps<typeof MediaType.BOOKS> & { pages: number };


export const BooksUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions, pages }: BooksUserDetailsProps) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);

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
                        <div>Pages</div>
                        <UpdateInput
                            total={pages}
                            updateType={UpdateType.PAGE}
                            initValue={userMedia.currentPage}
                            key={userMedia.currentPage ?? "null"}
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
            {userMedia.status !== Status.PLAN_TO_READ &&
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

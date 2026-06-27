import React from "react";
import {useQueryClient} from "@tanstack/react-query";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {UpdateRedo} from "@/lib/client/components/media/base/UpdateRedo";
import {UpdateInput} from "@/lib/client/components/media/base/UpdateInput";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type MangaUserDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaUserDetails"]>[0];


export const MangaUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: MangaUserDetailsProps<typeof MediaType.MANGA>) => {
    const queryClient = useQueryClient();
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);
    const mediaData = getMediaData()!;

    function getMediaData() {
        if (queryOption.queryKey[0] === "details") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            if (apiData && "chapters" in apiData.media) {
                return apiData.media;
            }
        }
        else if (queryOption.queryKey[0] === "userList") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            return apiData?.results.items.find((m) => "chapters" in m && m.mediaId === userMedia.mediaId);
        }
    }

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                completable={!!mediaData.chapters}
                updateStatus={updateUserMediaMutation}
            />
            {userMedia.status !== Status.PLAN_TO_READ &&
                <>
                    <div className="flex justify-between items-center">
                        <div>Chapters</div>
                        <UpdateInput
                            total={mediaData.chapters}
                            payloadName={"currentChapter"}
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
            {(userMedia.status !== Status.PLAN_TO_READ && mediaData.chapters) &&
                <UpdateRedo
                    name={"Re-read"}
                    redo={userMedia.redo}
                    updateRedo={updateUserMediaMutation}
                />
            }
        </>
    );
};

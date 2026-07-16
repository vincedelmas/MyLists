import React from "react";
import {useQueryClient} from "@tanstack/react-query";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {UpdateRedo} from "@/lib/client/components/media/base/UpdateRedo";
import {UpdateInput} from "@/lib/client/components/media/base/UpdateInput";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


type BooksUserDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaUserDetails"]>[0];


export const BooksUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: BooksUserDetailsProps<typeof MediaType.BOOKS>) => {
    const queryClient = useQueryClient();
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);
    const mediaData = getMediaData()!;

    function getMediaData(): { pages: number } | undefined {
        if (queryOption.queryKey[0] === "details") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            if (apiData && "pages" in apiData.media) {
                return apiData.media;
            }
        }
        else if (queryOption.queryKey[0] === "userList") {
            const apiData = queryClient.getQueryData(queryOption.queryKey);
            const media = apiData?.results.items.find((item) => item.mediaId === userMedia.mediaId);
            return media && "pages" in media ? media : undefined;
        }
    }

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
                            total={mediaData.pages}
                            payloadName={"actualPage"}
                            updateType={UpdateType.PAGE}
                            initValue={userMedia.actualPage}
                            key={userMedia.actualPage ?? "null"}
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
                <UpdateRedo
                    name={"Re-read"}
                    redo={userMedia.redo}
                    updateRedo={updateUserMediaMutation}
                />
            }
        </>
    );
};

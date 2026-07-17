import React from "react";
import {MediaType, Status} from "@/lib/utils/enums";
import {KindEntryEditorProps} from "@/lib/client/components/media/family-component.types";
import {UpdateRating} from "@/lib/client/components/media/base/UpdateRating";
import {UpdateStatus} from "@/lib/client/components/media/base/UpdateStatus";
import {UpdatePlatform} from "@/lib/client/components/media/games/UpdatePlatform";
import {UpdatePlaytime} from "@/lib/client/components/media/games/UpdatePlaytime";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


export const GamesUserDetails = ({ userMedia, mediaType, queryOption, mutationOptions }: KindEntryEditorProps<typeof MediaType.GAMES>) => {
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, mutationOptions);

    return (
        <>
            <UpdateStatus
                mediaType={mediaType}
                status={userMedia.status}
                updateStatus={updateUserMediaMutation}
            />
            <UpdatePlatform
                mediaId={userMedia.mediaId}
                platform={userMedia.platform}
                disabled={mutationOptions?.backlogMode}
                updatePlatform={updateUserMediaMutation}
            />
            {userMedia.status !== Status.PLAN_TO_PLAY &&
                <>
                    <UpdatePlaytime
                        key={userMedia.playtime ?? 0}
                        playtimeInMin={userMedia.playtime ?? 0}
                        updatePlaytime={updateUserMediaMutation}
                    />
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
        </>
    );
};

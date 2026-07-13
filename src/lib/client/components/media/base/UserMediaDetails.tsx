import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {historyOptions} from "@/lib/client/react-query/query-options";
import {TagsLists} from "@/lib/client/components/media/base/TagsLists";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {UpdateComment} from "@/lib/client/components/media/base/UpdateComment";
import {HistoryDetails} from "@/lib/client/components/media/base/HistoryDetails";
import {UpdateFavorite} from "@/lib/client/components/media/base/UpdateFavorite";
import {BacklogModeSystem} from "@/lib/client/components/media/base/BacklogModeSystem";
import {CustomCoverTabContent} from "@/lib/client/components/media/base/CustomCoverTab";
import {UserMediaSpecificDetails} from "@/lib/client/components/media/base/UserMediaSpecificDetails";
import {
    useRemoveMediaFromListMutation,
    UserMediaQueryOption,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaDetailsProps {
    mediaType: MediaType;
    queryOption: UserMediaQueryOption;
    userMedia: UserMedia | UserMediaItem;
}


export const UserMediaDetails = ({ userMedia, mediaType, queryOption }: UserMediaDetailsProps) => {
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const history = useQuery(historyOptions(mediaType, userMedia.mediaId)).data;
    const removeMediaFromListMutation = useRemoveMediaFromListMutation(queryOption);
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(queryOption, { noErrorToast: true });
    const [activeTab, setActiveTab] = useState<"progress" | "history" | "custom">("progress");
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, {
        backlogMode,
        loggedAt: backlogMode ? backlogDate : undefined,
    });

    const handleRemoveMediaFromList = async () => {
        if (!await confirm({
            confirmLabel: "Remove",
            variant: "destructive",
            title: `Remove this ${mediaType}?`,
            description: `This ${mediaType} will be removed from your list.`,
        })) return;

        removeMediaFromListMutation.mutate({ data: { mediaType, mediaId: userMedia.mediaId } }, {
            onSuccess: () => {
                queryClient.removeQueries({ queryKey: historyOptions(mediaType, userMedia.mediaId).queryKey });
            },
        });
    };

    const tabs: TabItem<"progress" | "history" | "custom">[] = [
        {
            id: "progress",
            isAccent: true,
            label: "Progress",
        },
        {
            id: "history",
            label: `History (${history?.length})`,
        },
        {
            id: "custom",
            label: "Custom",
        }
    ]

    return (
        <Card className="bg-popover w-full">
            <TabHeader tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} className="px-2.5">
                <UpdateFavorite
                    disabled={backlogMode}
                    isFavorite={userMedia.favorite}
                    updateFavorite={updateUserMediaMutation}
                />
            </TabHeader>

            {activeTab === "progress" ?
                <div className="space-y-2 px-4 mt-1">
                    <BacklogModeSystem
                        date={backlogDate}
                        enabled={backlogMode}
                        onDateChange={setBacklogDate}
                        onEnabledChange={setBacklogMode}
                        disabled={updateUserMediaMutation.isPending}
                    />

                    <div className={(backlogMode && !backlogDate) ? "pointer-events-none opacity-40 space-y-2" : "space-y-2"}>
                        <UserMediaSpecificDetails
                            mediaType={mediaType}
                            userMedia={userMedia}
                            queryOption={queryOption}
                            mutationOptions={{ backlogMode, loggedAt: backlogMode ? backlogDate : undefined }}
                        />
                    </div>

                    <UpdateComment
                        disabled={backlogMode}
                        content={userMedia.comment}
                        updateComment={updateUserMediaMutation}
                    />

                    <div className={backlogMode ? "pointer-events-none opacity-40" : ""}>
                        <TagsLists
                            mediaType={mediaType}
                            queryOption={queryOption}
                            mediaId={userMedia.mediaId}
                            tags={userMedia?.tags ?? []}
                        />
                    </div>

                </div>
                :
                activeTab === "custom" ?
                    <CustomCoverTabContent
                        mediaType={mediaType}
                        userMedia={userMedia}
                        onUpdateMutation={updateCustomCoverMutation}
                    />
                    :
                    <div className="overflow-y-auto scrollbar-thin max-h-83 px-1">
                        <HistoryDetails
                            mediaType={mediaType}
                            history={history ?? []}
                            mediaId={userMedia.mediaId}
                        />
                    </div>
            }

            <Button variant="destructive" className="w-full mt-4" onClick={handleRemoveMediaFromList}>
                Remove from your list
            </Button>
        </Card>
    );
};

import {useId, useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Card} from "@/lib/client/components/ui/card";
import {Button} from "@/lib/client/components/ui/button";
import {Switch} from "@/lib/client/components/ui/switch";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {historyOptions} from "@/lib/client/react-query/query-options";
import {TagsLists} from "@/lib/client/components/media/base/TagsLists";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {UpdateComment} from "@/lib/client/components/media/base/UpdateComment";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {HistoryDetails} from "@/lib/client/components/media/base/HistoryDetails";
import {UpdateFavorite} from "@/lib/client/components/media/base/UpdateFavorite";
import {Field, FieldLabel, FieldDescription} from "@/lib/client/components/ui/field";
import {BacklogModeSystem} from "@/lib/client/components/media/base/BacklogModeSystem";
import {CustomCoverTabContent} from "@/lib/client/components/media/base/CustomCoverTab";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/lib/client/components/ui/tabs";
import {UserMediaSpecificDetails} from "@/lib/client/components/media/base/UserMediaSpecificDetails";
import {
    useRemoveMediaFromListMutation,
    UserMediaQueryOption,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation,
    useUpdateUserMediaNotificationsMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaDetailsProps {
    preview?: boolean;
    mediaType: MediaType;
    queryOption: UserMediaQueryOption;
    userMedia: UserMedia | UserMediaItem;
}


export const UserMediaDetails = ({ userMedia, mediaType, queryOption, preview = false }: UserMediaDetailsProps) => {
    const confirm = useConfirm();
    const notificationId = useId();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const removeMediaFromListMutation = useRemoveMediaFromListMutation(queryOption);
    const notificationsMutation = useUpdateUserMediaNotificationsMutation(queryOption);
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(queryOption, { noErrorToast: true });
    const history = useQuery({ ...historyOptions(mediaType, userMedia.mediaId), enabled: !preview }).data;
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

    return (
        <Tabs defaultValue="progress" render={<Card className="bg-popover w-full p-3"/>}>
            <div className="flex items-center justify-between border-b">
                <TabsList aria-label="Media details" className="flex-1 border-b-0">
                    <TabsTrigger value="progress" accent className="px-2.5">
                        Progress
                    </TabsTrigger>
                    <TabsTrigger value="history" className="px-2.5">
                        History ({history?.length})
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="px-2.5">
                        Custom
                    </TabsTrigger>
                </TabsList>
                <div className="flex shrink-0 items-center px-2">
                    <UpdateFavorite
                        disabled={backlogMode}
                        isFavorite={userMedia.favorite}
                        updateFavorite={updateUserMediaMutation}
                    />
                </div>
            </div>

            <TabsContent value="progress" className="space-y-2 px-4 mt-1">
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
            </TabsContent>

            <TabsContent value="custom" className="flex flex-col gap-4">
                {getMediaDefinition(mediaType).releaseNotifications &&
                    <Field orientation="horizontal" data-disabled={notificationsMutation.isPending || preview}>
                        <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor={notificationId}>
                                Release notifications
                            </FieldLabel>
                            <FieldDescription>
                                {currentUser?.settings.find(s => s.mediaType === mediaType)?.releaseNotificationsEnabled === false
                                    ? "Release notifications for this media type are paused in your Settings. This preference will apply when you enable them."
                                    : "Notify me about upcoming releases for this title."}
                            </FieldDescription>
                        </div>
                        <Switch
                            id={notificationId}
                            checked={userMedia.releaseNotificationsEnabled}
                            disabled={notificationsMutation.isPending || preview}
                            onCheckedChange={(releaseNotificationsEnabled) => notificationsMutation.mutate({
                                data: { mediaType, mediaId: userMedia.mediaId, releaseNotificationsEnabled },
                            })}
                        />
                    </Field>
                }

                <CustomCoverTabContent
                    mediaType={mediaType}
                    userMedia={userMedia}
                    onUpdateMutation={updateCustomCoverMutation}
                />
            </TabsContent>

            <TabsContent value="history" className="overflow-y-auto scrollbar-thin max-h-83 px-1">
                <HistoryDetails
                    mediaType={mediaType}
                    history={history ?? []}
                    mediaId={userMedia.mediaId}
                />
            </TabsContent>

            <Button variant="destructive" className="w-full mt-4" onClick={handleRemoveMediaFromList}>
                Remove from your list
            </Button>
        </Tabs>
    );
};

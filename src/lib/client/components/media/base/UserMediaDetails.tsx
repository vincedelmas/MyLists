import {useId, useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Ellipsis, Image, Trash} from "lucide-react";
import {Card} from "@/lib/client/components/ui/card";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Switch} from "@/lib/client/components/ui/switch";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import type {UserMedia} from "@/lib/types/query.options.types";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {historyOptions} from "@/lib/client/react-query/query-options";
import {TagsLists} from "@/lib/client/components/media/base/TagsLists";
import {UpdateComment} from "@/lib/client/components/media/base/UpdateComment";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {HistoryDetails} from "@/lib/client/components/media/base/HistoryDetails";
import {UpdateFavorite} from "@/lib/client/components/media/base/UpdateFavorite";
import {AutoSaveFeedback} from "@/lib/client/components/general/AutoSaveFeedback";
import {Field, FieldLabel, FieldDescription} from "@/lib/client/components/ui/field";
import {BacklogModeSystem} from "@/lib/client/components/media/base/BacklogModeSystem";
import {CustomCoverTabContent} from "@/lib/client/components/media/base/CustomCoverTab";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/lib/client/components/ui/tabs";
import type {MediaUserDetailsProps} from "@/lib/client/components/media/media-config.types";
import {UserMediaSpecificDetails} from "@/lib/client/components/media/base/UserMediaSpecificDetails";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";
import {
    useRemoveMediaFromListMutation,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation,
    useUpdateUserMediaNotificationsMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


const addedDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });


interface UserMediaDetailsProps {
    preview?: boolean;
    mediaType: MediaType;
    userMedia: UserMedia;
    source?: "list_dialog" | "details";
    media: MediaUserDetailsProps<MediaType>["media"];
}


export const UserMediaDetails = ({ userMedia, mediaType, media, preview = false, source = "details" }: UserMediaDetailsProps) => {
    const confirm = useConfirm();
    const notificationId = useId();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const [activeTab, setActiveTab] = useState("progress");

    const removeMediaFromListMutation = useRemoveMediaFromListMutation(mediaType, userMedia.mediaId);
    const notificationsMutation = useUpdateUserMediaNotificationsMutation(mediaType, userMedia.mediaId);
    const history = useQuery({ ...historyOptions(mediaType, userMedia.mediaId), enabled: !preview }).data;
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(mediaType, userMedia.mediaId, { noErrorToast: true });

    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, {
        source,
        backlogMode,
        loggedAt: backlogMode ? backlogDate : undefined,
    });

    const handleRemoveMediaFromList = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Remove",
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
        <Tabs value={activeTab} onValueChange={setActiveTab} render={<Card className="bg-popover p-3"/>}>
            <header className="flex items-center justify-between gap-3 px-2 pt-1">
                <div className="min-w-0">
                    <h3 className="text-base leading-snug font-semibold">
                        Your Activity
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        In your list since{" "}
                        {userMedia.addedAt ? addedDateFormatter.format(dateFromUTCInput(userMedia.addedAt)) : DEFAULT_DASH_FALLBACK}.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <UpdateFavorite
                        disabled={backlogMode}
                        isFavorite={userMedia.favorite}
                        updateFavorite={updateUserMediaMutation}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="hover"/>}>
                            <Ellipsis/>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => setActiveTab("custom")}>
                                    <Image data-icon="inline-start"/> Customize
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    disabled={removeMediaFromListMutation.isPending} onClick={handleRemoveMediaFromList}
                                >
                                    <Trash data-icon="inline-start"/> Remove from your list
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <TabsList className="-mt-2">
                <TabsTrigger value="progress" className="px-2.5">
                    Progress
                </TabsTrigger>
                <TabsTrigger value="history" className="px-2.5">
                    History{" "}
                    <Badge variant="secondary" className="h-4 rounded px-1.5 text-[10px]">
                        {history?.length ?? 0}
                    </Badge>
                </TabsTrigger>
                <TabsTrigger value="custom" className="px-2.5">
                    Custom
                </TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-2 px-2 mt-1">
                <BacklogModeSystem
                    date={backlogDate}
                    enabled={backlogMode}
                    onDateChange={setBacklogDate}
                    onEnabledChange={setBacklogMode}
                    disabled={updateUserMediaMutation.isPending}
                />

                <div className={(backlogMode && !backlogDate) ? "pointer-events-none opacity-40 space-y-2" : "space-y-2"}>
                    <UserMediaSpecificDetails
                        media={media}
                        mediaType={mediaType}
                        userMedia={userMedia}
                        mutationOptions={{ source, backlogMode, loggedAt: backlogMode ? backlogDate : undefined }}
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
                        mediaId={userMedia.mediaId}
                        tags={userMedia?.tags ?? []}
                    />
                </div>
            </TabsContent>

            <TabsContent value="custom" className="flex flex-col gap-4">
                {getMediaDefinition(mediaType).releaseNotifications &&
                    <Field orientation="horizontal" data-disabled={preview}>
                        <div className="flex flex-col gap-1">
                            <FieldLabel htmlFor={notificationId}>
                                Release notifications
                            </FieldLabel>
                            <FieldDescription>
                                {currentUser?.settings.find(s => s.mediaType === mediaType)?.releaseNotificationsEnabled === false
                                    ? "Release notifications for this media type are paused in your Settings. " +
                                    "This preference will apply when you enable them."
                                    : "Notify me about upcoming releases for this title."}
                            </FieldDescription>
                        </div>
                        <AutoSaveFeedback mutation={notificationsMutation} acknowledged={true} disabled={preview}>
                            {saveDisabled => (
                                <Switch
                                    id={notificationId}
                                    disabled={saveDisabled}
                                    checked={userMedia.releaseNotificationsEnabled}
                                    onCheckedChange={(releaseNotificationsEnabled) => notificationsMutation.mutate({
                                        data: { mediaType, mediaId: userMedia.mediaId, releaseNotificationsEnabled },
                                    })}
                                />
                            )}
                        </AutoSaveFeedback>
                    </Field>
                }

                <CustomCoverTabContent
                    mediaType={mediaType}
                    userMedia={userMedia}
                    onUpdateMutation={updateCustomCoverMutation}
                />
            </TabsContent>

            <TabsContent value="history" className="overflow-y-auto scrollbar-thin max-h-92 px-2">
                <HistoryDetails
                    mediaType={mediaType}
                    history={history ?? []}
                    mediaId={userMedia.mediaId}
                />
            </TabsContent>

            <footer className="mx-2 flex items-center justify-end gap-3 border-t mt-1 pt-2 text-[10px] text-muted-foreground">
                {activeTab === "custom"
                    ? "Cover changes need saving"
                    : "Changes save automatically"
                }
            </footer>
        </Tabs>
    );
};

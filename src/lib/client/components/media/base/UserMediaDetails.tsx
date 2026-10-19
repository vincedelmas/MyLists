import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {historyOptions} from "@/lib/client/react-query/query-options";
import {TagsLists} from "@/lib/client/components/media/base/TagsLists";
import {ExtractUserMediaByType} from "@/lib/types/query.options.types";
import type {UserMediaProgressDetails} from "@/lib/types/user-media.types";
import {UpdateComment} from "@/lib/client/components/media/base/UpdateComment";
import {HistoryDetails} from "@/lib/client/components/media/base/HistoryDetails";
import {UpdateFavorite} from "@/lib/client/components/media/base/UpdateFavorite";
import {BacklogModeSystem} from "@/lib/client/components/media/base/BacklogModeSystem";
import {CustomCoverTabContent} from "@/lib/client/components/media/base/CustomCoverTab";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/lib/client/components/ui/tabs";
import {UserMediaSpecificDetails} from "@/lib/client/components/media/base/UserMediaSpecificDetails";
import {
    useRemoveMediaFromListMutation,
    UserMediaQueryOption,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaDetailsProps<T extends MediaType> {
    preview?: boolean;
    listEdit?: boolean;
    mediaType: T;
    userMedia: NoInfer<ExtractUserMediaByType<T>>;
    media: NoInfer<UserMediaProgressDetails<T>>;
    queryOption: UserMediaQueryOption;
}


export const UserMediaDetails = <T extends MediaType>({ media, userMedia, mediaType, queryOption, preview = false, listEdit = false }: UserMediaDetailsProps<T>) => {
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const removeMediaFromListMutation = useRemoveMediaFromListMutation(queryOption);
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(queryOption, { noErrorToast: true });
    const history = useQuery({ ...historyOptions(mediaType, userMedia.mediaId), enabled: !preview }).data;
    const updateUserMediaMutation = useUpdateUserMediaMutation(mediaType, userMedia.mediaId, queryOption, {
        backlogMode,
        listEdit,
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
        <Tabs defaultValue="progress" render={<Card className={cn("bg-popover w-full p-3", listEdit && "h-full")}/>}>
            <div className="flex shrink-0 items-center justify-between border-b">
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

            <div className={cn("grid", listEdit && "min-h-0 flex-1 grid-rows-[minmax(0,1fr)]")}>
                <TabsContent
                    hidden={false}
                    value="progress"
                    keepMounted={true}
                    className={cn("col-start-1 row-start-1 space-y-2 px-4 mt-1 inert:invisible inert:opacity-0",
                        listEdit && "overflow-y-auto scrollbar-thin")}
                >
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
                            queryOption={queryOption}
                            mutationOptions={{ backlogMode, listEdit, loggedAt: backlogMode ? backlogDate : undefined }}
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

                <TabsContent value="custom" className={cn("col-start-1 row-start-1", listEdit && "overflow-y-auto scrollbar-thin")}>
                    <CustomCoverTabContent
                        mediaType={mediaType}
                        userMedia={userMedia}
                        onUpdateMutation={updateCustomCoverMutation}
                    />
                </TabsContent>

                <TabsContent value="history" className={cn("col-start-1 row-start-1 overflow-y-auto scrollbar-thin px-1", !listEdit && "max-h-83")}>
                    <HistoryDetails
                        mediaType={mediaType}
                        history={history ?? []}
                        mediaId={userMedia.mediaId}
                    />
                </TabsContent>
            </div>

            <Button variant="destructive" className="w-full shrink-0 mt-4" onClick={handleRemoveMediaFromList}>
                Remove from your list
            </Button>
        </Tabs>
    );
};

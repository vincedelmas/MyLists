import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {assertNever} from "@/lib/utils/assert-never";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {historyOptions} from "@/lib/client/react-query/query-options";
import {TagsLists} from "@/lib/client/components/media/base/TagsLists";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {TabHeader, TabItem} from "@/lib/client/components/general/TabHeader";
import {TvUserDetails} from "@/lib/client/components/media/tv/TvUserDetails";
import {UpdateComment} from "@/lib/client/components/media/base/UpdateComment";
import {HistoryDetails} from "@/lib/client/components/media/base/HistoryDetails";
import {UpdateFavorite} from "@/lib/client/components/media/base/UpdateFavorite";
import {BooksUserDetails} from "@/lib/client/components/media/books/BookUserDetails";
import {MangaUserDetails} from "@/lib/client/components/media/manga/MangaUserDetails";
import {GamesUserDetails} from "@/lib/client/components/media/games/GamesUserDetails";
import {BacklogModeSystem} from "@/lib/client/components/media/base/BacklogModeSystem";
import {CustomCoverTabContent} from "@/lib/client/components/media/base/CustomCoverTab";
import {MoviesUserDetails} from "@/lib/client/components/media/movies/MoviesUserDetails";
import type {KindProgressMetadata} from "@/lib/client/components/media/family-component.types";
import {
    UpdateUserMediaMutationOptions,
    useRemoveMediaFromListMutation,
    UserMediaQueryOption,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaDetailsProps {
    queryOption: UserMediaQueryOption;
    userMedia: UserMedia | UserMediaItem;
    progressMetadata: KindProgressMetadata;
}


export const UserMediaDetails = ({ userMedia, queryOption, progressMetadata }: UserMediaDetailsProps) => {
    const confirm = useConfirm();
    const mediaType = userMedia.kind;
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const history = useQuery(historyOptions(mediaType, userMedia.mediaId)).data;
    const removeMediaFromListMutation = useRemoveMediaFromListMutation(queryOption);
    const [activeTab, setActiveTab] = useState<"progress" | "history" | "custom">("progress");
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(mediaType, userMedia.mediaId, queryOption, { noErrorToast: true });
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
                        <KindProgressEditor
                            userMedia={userMedia}
                            queryOption={queryOption}
                            progressMetadata={progressMetadata}
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


interface KindProgressEditorProps {
    queryOption: UserMediaQueryOption;
    userMedia: UserMedia | UserMediaItem;
    progressMetadata: KindProgressMetadata;
    mutationOptions: UpdateUserMediaMutationOptions;
}


const KindProgressEditor = ({ userMedia, queryOption, progressMetadata, mutationOptions }: KindProgressEditorProps) => {
    switch (userMedia.kind) {
        case MediaType.SERIES: {
            if (progressMetadata.kind !== MediaType.SERIES) return;
            return (
                <TvUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.SERIES}
                    mutationOptions={mutationOptions}
                    seasons={progressMetadata.seasons}
                />);
        }
        case MediaType.ANIME: {
            if (progressMetadata.kind !== MediaType.ANIME) return;
            return (
                <TvUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.ANIME}
                    mutationOptions={mutationOptions}
                    seasons={progressMetadata.seasons}
                />);
        }
        case MediaType.MOVIES:
            if (progressMetadata.kind !== MediaType.MOVIES) return;
            return (
                <MoviesUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.MOVIES}
                    mutationOptions={mutationOptions}
                />
            );
        case MediaType.GAMES:
            if (progressMetadata.kind !== MediaType.GAMES) return;
            return (
                <GamesUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.GAMES}
                    mutationOptions={mutationOptions}
                />
            );
        case MediaType.BOOKS:
            if (progressMetadata.kind !== MediaType.BOOKS) return;
            return (
                <BooksUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.BOOKS}
                    pages={progressMetadata.pages}
                    mutationOptions={mutationOptions}
                />
            );
        case MediaType.MANGA:
            if (progressMetadata.kind !== MediaType.MANGA) return;
            return (
                <MangaUserDetails
                    userMedia={userMedia}
                    queryOption={queryOption}
                    mediaType={MediaType.MANGA}
                    mutationOptions={mutationOptions}
                    chapters={progressMetadata.chapters}
                />
            );
        default:
            return assertNever(userMedia, "media entry family");
    }
};

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
import {TvUserDetails} from "@/lib/client/components/media/tv/TvUserDetails";
import {MoviesUserDetails} from "@/lib/client/components/media/movies/MoviesUserDetails";
import {GamesUserDetails} from "@/lib/client/components/media/games/GamesUserDetails";
import {BooksUserDetails} from "@/lib/client/components/media/books/BookUserDetails";
import {MangaUserDetails} from "@/lib/client/components/media/manga/MangaUserDetails";
import type {FamilyProgressMetadata} from "@/lib/client/components/media/family-component.types";
import {assertNever} from "@/lib/utils/assert-never";
import {
    useRemoveMediaFromListMutation,
    UpdateUserMediaMutationOptions,
    UserMediaQueryOption,
    useUpdateCustomCoverMutation,
    useUpdateUserMediaMutation
} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaDetailsProps {
    userMedia: UserMedia | UserMediaItem;
    progressMetadata: FamilyProgressMetadata;
    queryOption: UserMediaQueryOption;
}


export const UserMediaDetails = ({ userMedia, queryOption, progressMetadata }: UserMediaDetailsProps) => {
    const mediaType = userMedia.kind;
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const [backlogDate, setBacklogDate] = useState("");
    const [backlogMode, setBacklogMode] = useState(false);
    const history = useQuery(historyOptions(mediaType, userMedia.mediaId)).data;
    const removeMediaFromListMutation = useRemoveMediaFromListMutation(queryOption);
    const updateCustomCoverMutation = useUpdateCustomCoverMutation(
        mediaType,
        userMedia.mediaId,
        queryOption,
        { noErrorToast: true },
    );
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
                        <FamilyProgressEditor
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


interface FamilyProgressEditorProps {
    userMedia: UserMedia | UserMediaItem;
    progressMetadata: FamilyProgressMetadata;
    queryOption: UserMediaQueryOption;
    mutationOptions: UpdateUserMediaMutationOptions;
}


const FamilyProgressEditor = ({ userMedia, queryOption, progressMetadata, mutationOptions }: FamilyProgressEditorProps) => {
    switch (userMedia.kind) {
        case MediaType.SERIES: {
            if (progressMetadata.kind !== MediaType.SERIES) throw new Error("Series progress metadata does not match its entry.");
            return <TvUserDetails mediaType={MediaType.SERIES} userMedia={userMedia} queryOption={queryOption}
                mutationOptions={mutationOptions} seasons={progressMetadata.seasons}/>;
        }
        case MediaType.ANIME: {
            if (progressMetadata.kind !== MediaType.ANIME) throw new Error("Anime progress metadata does not match its entry.");
            return <TvUserDetails mediaType={MediaType.ANIME} userMedia={userMedia} queryOption={queryOption}
                mutationOptions={mutationOptions} seasons={progressMetadata.seasons}/>;
        }
        case MediaType.MOVIES:
            if (progressMetadata.kind !== MediaType.MOVIES) throw new Error("Movie progress metadata does not match its entry.");
            return <MoviesUserDetails mediaType={MediaType.MOVIES} userMedia={userMedia} queryOption={queryOption} mutationOptions={mutationOptions}/>;
        case MediaType.GAMES:
            if (progressMetadata.kind !== MediaType.GAMES) throw new Error("Game progress metadata does not match its entry.");
            return <GamesUserDetails mediaType={MediaType.GAMES} userMedia={userMedia} queryOption={queryOption} mutationOptions={mutationOptions}/>;
        case MediaType.BOOKS:
            if (progressMetadata.kind !== MediaType.BOOKS) throw new Error("Book progress metadata does not match its entry.");
            return <BooksUserDetails mediaType={MediaType.BOOKS} userMedia={userMedia} queryOption={queryOption}
                mutationOptions={mutationOptions} pages={progressMetadata.pages}/>;
        case MediaType.MANGA:
            if (progressMetadata.kind !== MediaType.MANGA) throw new Error("Manga progress metadata does not match its entry.");
            return <MangaUserDetails mediaType={MediaType.MANGA} userMedia={userMedia} queryOption={queryOption}
                mutationOptions={mutationOptions} chapters={progressMetadata.chapters}/>;
        default:
            return assertNever(userMedia, "media entry family");
    }
};

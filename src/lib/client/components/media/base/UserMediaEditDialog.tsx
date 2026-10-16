import {MediaType} from "@/lib/utils/enums";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaDetailsOptions, mediaListOptions} from "@/lib/client/react-query/query-options";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Button} from "@/lib/client/components/ui/button";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface UserMediaEditDialogProps {
    loadDetails?: boolean;
    onEdited?: () => Promise<void>;
    dialogOpen: boolean;
    mediaType: MediaType;
    userMedia: UserMediaItem;
    onOpenChange: (open: boolean) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const UserMediaEditDialog = ({ dialogOpen, userMedia, mediaType, queryOption, onOpenChange, onEdited, loadDetails = false }: UserMediaEditDialogProps) => {
    const queryClient = useQueryClient();
    if (!userMedia) return null;

    const onDialogOpenChange = async (open: boolean) => {
        onOpenChange(open);
        if (open) return;

        // A save outlive the dialog. Refresh only once those edits have settled
        const mutationCache = queryClient.getMutationCache();
        const pendingEdits = mutationCache.findAll({ mutationKey: ["userMediaEdit", mediaType], status: "pending" });
        if (pendingEdits.length > 0) {
            await new Promise<void>((resolve) => {
                const unsubscribe = mutationCache.subscribe(() => {
                    if (pendingEdits.every((mutation) => mutation.state.status !== "pending")) {
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }

        await queryClient.invalidateQueries({ queryKey: ["userList", mediaType, queryOption.queryKey[2]] });
        await onEdited?.();
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="w-108 max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>
                        {userMedia.mediaName}
                    </DialogTitle>
                    <DialogDescription>
                        Here you can edit your media details
                    </DialogDescription>
                </DialogHeader>
                <div className="w-full flex items-center justify-center max-sm:mb-8 max-sm:px-2">
                    {loadDetails ?
                        <MediaDetailsEditor mediaType={mediaType} mediaId={userMedia.mediaId} enabled={dialogOpen}/>
                        :
                        <UserMediaDetails
                            userMedia={userMedia}
                            mediaType={mediaType}
                            queryOption={queryOption}
                        />
                    }
                </div>
            </DialogContent>
        </Dialog>
    );
};


const MediaDetailsEditor = ({ mediaType, mediaId, enabled }: { mediaType: MediaType; mediaId: number; enabled: boolean }) => {
    const queryOption = mediaDetailsOptions(mediaType, mediaId);
    const details = useQuery({ ...queryOption, enabled });
    if (details.isPending) return <Spinner/>;
    if (details.isError) {
        return (
            <div className="flex flex-col items-center gap-3">
                <p>Could not load this title's details.</p>
                <Button variant="outline" onClick={() => void details.refetch()} disabled={details.isFetching}>
                    Try again
                </Button>
            </div>
        );
    }
    if (!details.data.userMedia) return <p>This title is no longer in your list.</p>;

    return <UserMediaDetails mediaType={mediaType} userMedia={details.data.userMedia} queryOption={queryOption}/>;
};

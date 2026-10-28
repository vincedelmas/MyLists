import {useEffect, useRef} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {createUserMediaCache} from "@/lib/client/components/media/user-media-cache";
import {historyOptions, mediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface UserMediaEditDialogProps {
    mediaId: number;
    mediaName: string;
    dialogOpen: boolean;
    mediaType: MediaType;
    onEdited?: () => Promise<void>;
    onOpenChange: (open: boolean) => void;
}


export const UserMediaEditDialog = ({ dialogOpen, mediaId, mediaName, mediaType, onOpenChange, onEdited }: UserMediaEditDialogProps) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const session = useRef<ReturnType<ReturnType<typeof createUserMediaCache>["startEditing"]> | null>(null);

    useEffect(() => {
        if (!dialogOpen) return;

        const editing = createUserMediaCache(queryClient, currentUser!.name, mediaType, mediaId).startEditing();
        session.current = editing;

        return editing.stop;
    }, [dialogOpen, queryClient, currentUser?.name, mediaType, mediaId]);

    const onDialogOpenChange = async (open: boolean) => {
        onOpenChange(open);
        if (open) return;

        if (await session.current!.finish()) {
            await onEdited?.();
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogContent className="min-h-[min(20rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] w-108 grid-rows-[auto_1fr] overflow-y-auto max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>
                        {mediaName}
                    </DialogTitle>
                    <DialogDescription>
                        Here you can edit your media details
                    </DialogDescription>
                </DialogHeader>
                <div className="flex w-full items-center justify-center">
                    <MediaDetailsEditor
                        mediaId={mediaId}
                        enabled={dialogOpen}
                        mediaType={mediaType}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};


const MediaDetailsEditor = ({ mediaType, mediaId, enabled }: { mediaType: MediaType; mediaId: number; enabled: boolean }) => {
    const queryOption = mediaDetailsOptions(mediaType, mediaId);
    const details = useQuery({ ...queryOption, enabled });
    useQuery({ ...historyOptions(mediaType, mediaId), enabled });

    if (details.isPending) {
        return <Spinner aria-label="Loading media editor" className="size-10"/>;
    }

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

    if (!details.data.userMedia) {
        return <p>This title is no longer in your list.</p>;
    }

    return (
        <UserMediaDetails
            source="list_dialog"
            mediaType={mediaType}
            media={details.data.media}
            userMedia={details.data.userMedia}
        />
    );
};

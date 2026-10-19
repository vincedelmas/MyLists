import {Suspense} from "react";
import {MediaType} from "@/lib/utils/enums";
import {CatchBoundary} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {QueryErrorResetBoundary, useQueryClient} from "@tanstack/react-query";
import {UserMediaSection} from "@/lib/client/components/media/base/UserMediaSection";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface UserMediaEditDialogProps {
    dialogOpen: boolean;
    mediaType: MediaType;
    userMedia: UserMediaItem;
    onEdited?: () => Promise<void>;
    onOpenChange: (open: boolean) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const UserMediaEditDialog = ({ dialogOpen, userMedia, mediaType, queryOption, onOpenChange, onEdited }: UserMediaEditDialogProps) => {
    const queryClient = useQueryClient();
    if (!userMedia) return null;

    const onDialogOpenChange = async (open: boolean) => {
        onOpenChange(open);
        if (open) return;

        // A save outlive dialog. Refresh only once edits have settled
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
                    <QueryErrorResetBoundary>
                        {({ reset: resetQuery }) =>
                            <CatchBoundary
                                getResetKey={() => dialogOpen}
                                errorComponent={({ reset }) => (
                                    <div className="flex flex-col items-center gap-3">
                                        <p>Could not load this title's details.</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                resetQuery();
                                                reset();
                                            }}
                                        >
                                            Try again
                                        </Button>
                                    </div>
                                )}
                            >
                                <Suspense fallback={<Spinner/>}>
                                    {dialogOpen &&
                                        <UserMediaSection
                                            listEdit={true}
                                            mediaType={mediaType}
                                            mediaId={userMedia.mediaId}
                                        />
                                    }
                                </Suspense>
                            </CatchBoundary>
                        }
                    </QueryErrorResetBoundary>
                </div>
            </DialogContent>
        </Dialog>
    );
};

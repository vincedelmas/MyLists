import {MediaType} from "@/lib/utils/enums";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface UserMediaEditDialogProps {
    dialogOpen: boolean;
    mediaType: MediaType;
    userMedia: UserMediaItem;
    onOpenChange: (open: boolean) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const UserMediaEditDialog = ({ dialogOpen, userMedia, mediaType, queryOption, onOpenChange }: UserMediaEditDialogProps) => {
    if (!userMedia) return null;

    return (
        <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
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
                    <UserMediaDetails
                        userMedia={userMedia}
                        mediaType={mediaType}
                        queryOption={queryOption}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

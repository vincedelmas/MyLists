import {toast} from "sonner";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {CoverImageFormInput} from "@/lib/schemas";
import {LoaderCircle, PencilLine} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";
import {CoverImageForm} from "@/lib/client/components/media/base/CoverImageForm";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface BookCoverEditDialogProps {
    mediaId: number;
    mediaName: string;
}


export const BookCoverEditDialog = ({ mediaId, mediaName }: BookCoverEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const updateCoverMutation = useUpdateBookCoverMutation(mediaId, { noErrorToast: true });

    const updateCover = ({ imageUrl, imageFile }: CoverImageFormInput) => {
        const formData = new FormData();
        formData.append("mediaId", String(mediaId));

        if (imageUrl) formData.append("imageUrl", imageUrl);
        if (imageFile) formData.append("imageFile", imageFile);

        return updateCoverMutation.mutateAsync({ data: formData });
    };

    const handleSuccess = () => {
        setOpen(false);
        toast.success("Cover updated. Thanks for contributing!");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="absolute w-full h-11 justify-center bottom-0 flex items-center gap-2 bg-popover/85
            font-semibold text-sm hover:bg-popover">
                <PencilLine className="size-4"/> Edit
            </DialogTrigger>
            <DialogContent className="w-100 max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>Update this book cover</DialogTitle>
                    <DialogDescription>
                        This book still uses the default cover.
                        Share a real cover by adding a link or uploading a file.
                    </DialogDescription>
                </DialogHeader>
                <CoverImageForm
                    onSubmit={updateCover}
                    onSuccess={handleSuccess}
                >
                    {({ useImageUrl }) =>
                        <SuggestedBookCover
                            open={open}
                            mediaName={mediaName}
                            onUseCover={useImageUrl}
                        />
                    }
                </CoverImageForm>
            </DialogContent>
        </Dialog>
    );
};


interface SuggestedBookCoverProps {
    open: boolean;
    mediaName: string;
    onUseCover: (coverUrl: string) => void;
}


const SuggestedBookCover = ({ open, mediaName, onUseCover }: SuggestedBookCoverProps) => {
    // Using simple suggestion system using openLibrary
    const suggestedCoverUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(mediaName.trim())}-L.jpg?default=false`;
    const { data, isLoading, isError } = useQuery(suggestBookCoverOptions(mediaName, suggestedCoverUrl, open));

    return (
        <>
            <div className="space-y-2">
                <div className="text-sm font-medium">
                    Suggested cover
                </div>
                {data === "available" &&
                    <div className="flex items-center gap-3">
                        <img
                            alt="Suggested cover"
                            src={suggestedCoverUrl}
                            className="h-30 rounded object-cover border"
                        />
                        <Button type="button" variant="outline" onClick={() => onUseCover(suggestedCoverUrl)}>
                            Use suggested cover
                        </Button>
                    </div>
                }
            </div>
            {isLoading &&
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin"/>
                    Looking for a suggested cover...
                </div>
            }
            {(data === "missing" || isError) &&
                <div className="text-sm text-muted-foreground -mt-3">
                    No suggestion found.
                </div>
            }
        </>
    );
};

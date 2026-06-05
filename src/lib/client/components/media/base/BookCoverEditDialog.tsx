import {toast} from "sonner";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import {Button} from "@/lib/client/components/ui/button";
import {displayContainerError} from "@/lib/utils/error-display";
import {Link2, LoaderCircle, PencilLine, UploadCloud} from "lucide-react";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface BookCoverEditDialogProps {
    mediaId: number;
    external: boolean;
    mediaName: string;
    apiId: number | string;
}


export const BookCoverEditDialog = ({ mediaId, apiId, external, mediaName }: BookCoverEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const updateCoverMutation = useUpdateBookCoverMutation(external ? apiId : mediaId, external, { noGlobalErrorToast: true });

    // Using simple suggestion system using openLibrary
    const suggestedCoverUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(mediaName.trim())}-L.jpg?default=false`;
    const suggestedCoverQuery = useQuery(suggestBookCoverOptions(mediaName, suggestedCoverUrl, open));

    const resetForm = () => {
        setImageUrl("");
        setMode("link");
        setImageFile(null);
        setFileInputKey((prev) => prev + 1);
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append("apiId", apiId.toString());

        if (mode === "link") {
            const value = imageUrl.trim();
            if (!value) {
                toast.error("Please provide an image link.");
                return;
            }
            formData.append("imageUrl", value);
        }
        else {
            if (!imageFile) {
                toast.error("Please select an image to upload.");
                return;
            }
            formData.append("imageFile", imageFile);
        }

        updateCoverMutation.mutate({ data: formData }, {
            onSuccess: () => {
                resetForm();
                setOpen(false);
                toast.success("Cover updated. Thanks for contributing!");
            },
        });
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
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant={mode === "link" ? "default" : "outline"}
                            onClick={() => {
                                setMode("link");
                                setImageFile(null);
                                setFileInputKey((prev) => prev + 1);
                            }}
                        >
                            <Link2 className="size-4"/> Image link
                        </Button>
                        <Button
                            variant={mode === "upload" ? "default" : "outline"}
                            onClick={() => {
                                setImageUrl("");
                                setMode("upload");
                            }}
                        >
                            <UploadCloud className="size-4"/> Upload image
                        </Button>
                    </div>
                    {mode === "link" ?
                        <div className="space-y-2">
                            <Label htmlFor="book-cover-url">Image URL</Label>
                            <Input
                                value={imageUrl}
                                id="book-cover-url"
                                placeholder="https://example.com/cover.jpg"
                                onChange={(ev) => setImageUrl(ev.target.value)}
                            />
                        </div>
                        :
                        <div className="space-y-2">
                            <Label htmlFor="book-cover-file">Upload image</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                key={fileInputKey}
                                id="book-cover-file"
                                onChange={(ev) => setImageFile(ev.target.files?.[0] ?? null)}
                            />
                        </div>
                    }

                    {updateCoverMutation.isError &&
                        <div className="text-sm text-destructive">
                            {displayContainerError({ error: updateCoverMutation.error })}
                        </div>
                    }

                    <div className="space-y-2">
                        <Label>Suggested cover</Label>
                        {suggestedCoverQuery.data === "available" &&
                            <div className="flex items-center gap-3">
                                <img
                                    alt="Suggested cover"
                                    src={suggestedCoverUrl}
                                    className="h-30 rounded object-cover border"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setMode("link");
                                        setImageFile(null);
                                        setImageUrl(suggestedCoverUrl);
                                        setFileInputKey((prev) => prev + 1);
                                    }}
                                >
                                    Use suggested cover
                                </Button>
                            </div>
                        }
                    </div>
                    {suggestedCoverQuery.isLoading &&
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <LoaderCircle className="size-4 animate-spin"/>
                            Looking for a suggested cover...
                        </div>
                    }
                    {(suggestedCoverQuery.data === "missing" || suggestedCoverQuery.isError) &&
                        <div className="text-sm text-muted-foreground -mt-3">
                            No suggestion found.
                        </div>
                    }
                    <Button type="submit" onClick={handleSubmit} disabled={updateCoverMutation.isPending}>
                        {updateCoverMutation.isPending ? "Saving..." : "Save cover"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

import {useState} from "react";
import {PencilLine} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {toast} from "@/lib/client/components/ui/toast";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {UpdateBookCoverInput, updateBookCoverSchema} from "@/lib/schemas";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface BookCoverEditDialogProps {
    mediaId: number;
    mediaName: string;
}


export const BookCoverEditDialog = ({ mediaId, mediaName }: BookCoverEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const updateCoverMutation = useUpdateBookCoverMutation(mediaId, { noErrorToast: true });
    const form = useForm<UpdateBookCoverInput>({
        resolver: zodResolver(updateBookCoverSchema),
        defaultValues: {
            mediaId: mediaId,
            imageUrl: undefined,
            imageFile: undefined,
        },
    });

    const resetForm = () => {
        setMode("link");
        form.reset({ mediaId, imageUrl: undefined, imageFile: undefined });
    };

    const useSuggestedCover = (suggestedCoverUrl: string) => {
        setMode("link");
        form.clearErrors(["imageFile", "imageUrl"]);
        form.setValue("imageFile", undefined);
        form.setValue("imageUrl", suggestedCoverUrl, { shouldDirty: true, shouldValidate: true });
    };

    const handleSubmit = (data: UpdateBookCoverInput) => {
        const formData = new FormData();
        formData.append("mediaId", String(data.mediaId));

        if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
        if (data.imageFile) formData.append("imageFile", data.imageFile);

        updateCoverMutation.mutate({ data: formData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                resetForm();
                setOpen(false);
                toast.add({ title: "Cover updated. Thanks for contributing!", type: "success" });
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
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                        <FieldSet disabled={updateCoverMutation.isPending}>
                            <FieldGroup>
                                <CoverSourceFields
                                    mode={mode}
                                    onModeChange={setMode}
                                    disabled={updateCoverMutation.isPending}
                                />
                                <SuggestedBookCover
                                    open={open}
                                    mediaName={mediaName}
                                    onUseCover={useSuggestedCover}
                                />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <FormSubmitButton className="w-full" isLoading={updateCoverMutation.isPending}>
                            Save New Cover
                        </FormSubmitButton>
                    </form>
                </FormProvider>
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
                    <Spinner aria-hidden="true"/>
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

import {useState} from "react";
import {PencilLine} from "lucide-react";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {toast} from "@/lib/client/components/ui/toast";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {UpdateBookCoverInput, updateBookCoverSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {GoogleCoverSearch} from "@/lib/client/components/media/base/GoogleCoverSearch";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {SuggestedBookCover} from "@/lib/client/components/media/base/SuggestedBookCover";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface BookCoverEditDialogProps {
    mediaId: number;
    authors?: string;
    mediaName: string;
}


export const BookCoverEditDialog = ({ mediaId, mediaName, authors }: BookCoverEditDialogProps) => {
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
                                <GoogleCoverSearch
                                    enabled={open}
                                    mediaType="books"
                                    mediaId={mediaId}
                                    authors={authors}
                                    mediaName={mediaName}
                                    onUseCover={useSuggestedCover}
                                    disabled={updateCoverMutation.isPending}
                                />
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

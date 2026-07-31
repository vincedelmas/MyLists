import {toast} from "@/lib/client/components/ui/toast";
import {useId, useState} from "react";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {useQuery} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {FormError} from "@/lib/client/components/forms/FormError";
import {UpdateBookCoverInput, updateBookCoverSchema} from "@/lib/schemas";
import {Link2, LoaderCircle, PencilLine, UploadCloud} from "lucide-react";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


interface BookCoverEditDialogProps {
    mediaId: number;
    mediaName: string;
}


export const BookCoverEditDialog = ({ mediaId, mediaName }: BookCoverEditDialogProps) => {
    const fieldId = useId();
    const [open, setOpen] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
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
        setFileInputKey((prev) => prev + 1);
        form.reset({ mediaId, imageUrl: undefined, imageFile: undefined });
    };

    const setImageLinkMode = () => {
        setMode("link");
        form.clearErrors(["imageFile", "imageUrl"]);
        setFileInputKey((prev) => prev + 1);
        form.setValue("imageFile", undefined);
    };

    const setImageUploadMode = () => {
        setMode("upload");
        form.clearErrors(["imageUrl", "imageFile"]);
        form.setValue("imageUrl", undefined);
    };

    const useSuggestedCover = (suggestedCoverUrl: string) => {
        setMode("link");
        form.clearErrors(["imageFile", "imageUrl"]);
        setFileInputKey((prev) => prev + 1);
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
                toast.add({title: "Cover updated. Thanks for contributing!", type: "success"});
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
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" onClick={setImageLinkMode} variant={mode === "link" ? "emeraldy" : "outline"}>
                                    <Link2 className="size-4"/>{" "}
                                    Image link
                                </Button>
                                <Button type="button" variant={mode === "upload" ? "emeraldy" : "outline"} onClick={setImageUploadMode}>
                                    <UploadCloud className="size-4"/>{" "}
                                    Upload image
                                </Button>
                            </div>
                            {mode === "link" ?
                                <Controller
                                    name="imageUrl"
                                    control={form.control}
                                    render={({field, fieldState}) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={updateCoverMutation.isPending}>
                                            <FieldLabel htmlFor={`${fieldId}-image-url`}>Image URL</FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-image-url`}
                                                value={field.value ?? ""}
                                                placeholder="https://example.com/cover.jpg"
                                                aria-invalid={fieldState.invalid}
                                                onChange={(ev) => field.onChange(ev.target.value.trim() ? ev.target.value : undefined)}
                                            />
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />
                                :
                                <Controller
                                    name="imageFile"
                                    control={form.control}
                                    render={({field: {onChange, onBlur, name, ref}, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid} data-disabled={updateCoverMutation.isPending}>
                                            <FieldLabel htmlFor={`${fieldId}-image-file`}>Upload image</FieldLabel>
                                            <Input
                                                id={`${fieldId}-image-file`}
                                                ref={ref}
                                                type="file"
                                                name={name}
                                                onBlur={onBlur}
                                                accept="image/*"
                                                key={fileInputKey}
                                                aria-invalid={fieldState.invalid}
                                                onChange={(ev) => onChange(ev.target.files?.[0] ?? undefined)}
                                            />
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    )}
                                />
                            }
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

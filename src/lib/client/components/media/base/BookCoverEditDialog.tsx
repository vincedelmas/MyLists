import {toast} from "sonner";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {useAppForm} from "@/lib/client/components/forms/form";
import {handleFormSubmit} from "@/lib/utils/form-error-handler";
import {Link2, LoaderCircle, PencilLine, UploadCloud} from "lucide-react";
import {Field, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";
import {UpdateBookCoverFormInput, updateBookCoverFormSchema} from "@/lib/schemas";
import {useUpdateBookCoverMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface BookCoverEditDialogProps {
    mediaId: number;
    mediaName: string;
}

export const BookCoverEditDialog = ({ mediaId, mediaName }: BookCoverEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const updateCoverMutation = useUpdateBookCoverMutation(mediaId, { noErrorToast: true });
    const defaultValues: UpdateBookCoverFormInput = {
        mediaId,
        imageUrl: undefined,
        imageFile: undefined,
    };
    const form = useAppForm({
        defaultValues,
        validators: {
            onSubmit: updateBookCoverFormSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const formData = new FormData();
            formData.append("mediaId", String(value.mediaId));

            if (value.imageUrl) formData.append("imageUrl", value.imageUrl);
            if (value.imageFile) formData.append("imageFile", value.imageFile);

            const success = await handleFormSubmit(formApi, () => updateCoverMutation.mutateAsync({ data: formData }));

            if (success) {
                setMode("link");
                setFileInputKey((prev) => prev + 1);
                formApi.reset();
                setOpen(false);
                toast.success("Cover updated. Thanks for contributing!");
            }
        },
    });

    const clearCoverErrors = () => {
        (["imageUrl", "imageFile"] as const).forEach((fieldName) => {
            if (!form.getFieldMeta(fieldName)) return;

            form.setFieldMeta(fieldName, (meta) => ({
                ...meta,
                errorMap: { ...meta.errorMap, onSubmit: undefined },
            }));
        });
    };

    const setImageLinkMode = () => {
        setMode("link");
        clearCoverErrors();
        setFileInputKey((prev) => prev + 1);
        form.setFieldValue("imageFile", undefined);
    };

    const setImageUploadMode = () => {
        setMode("upload");
        clearCoverErrors();
        form.setFieldValue("imageUrl", undefined);
    };

    const useSuggestedCover = (suggestedCoverUrl: string) => {
        setMode("link");
        clearCoverErrors();
        setFileInputKey((prev) => prev + 1);
        form.setFieldValue("imageUrl", suggestedCoverUrl);
        form.setFieldValue("imageFile", undefined);
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
                <form.AppForm>
                    <form.FormRoot>
                        <form.FormFieldset className="grid gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" onClick={setImageLinkMode} variant={mode === "link" ? "default" : "outline"}>
                                    <Link2 className="size-4"/>{" "}
                                    Image link
                                </Button>
                                <Button type="button" variant={mode === "upload" ? "default" : "outline"} onClick={setImageUploadMode}>
                                    <UploadCloud className="size-4"/>{" "}
                                    Upload image
                                </Button>
                            </div>
                            {mode === "link" ?
                                <form.AppField name="imageUrl">
                                    {(field) => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor={field.name}>Image URL</FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    aria-invalid={isInvalid}
                                                    onBlur={field.handleBlur}
                                                    value={field.state.value ?? ""}
                                                    placeholder="https://example.com/cover.jpg"
                                                    onChange={ev => field.handleChange(ev.target.value.trim() ? ev.target.value : undefined)}
                                                />
                                                {isInvalid &&
                                                    <FieldError
                                                        errors={field.state.meta.errors}
                                                    />
                                                }
                                            </Field>
                                        );
                                    }}
                                </form.AppField>
                                :
                                <form.AppField name="imageFile">
                                    {(field) => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor={field.name}>Upload image</FieldLabel>
                                                <Input
                                                    type="file"
                                                    id={field.name}
                                                    accept="image/*"
                                                    name={field.name}
                                                    key={fileInputKey}
                                                    aria-invalid={isInvalid}
                                                    onBlur={field.handleBlur}
                                                    onChange={(ev) => field.handleChange(ev.target.files?.[0])}
                                                />
                                                {isInvalid &&
                                                    <FieldError
                                                        errors={field.state.meta.errors}
                                                    />
                                                }
                                            </Field>
                                        );
                                    }}
                                </form.AppField>
                            }
                            <SuggestedBookCover
                                open={open}
                                mediaName={mediaName}
                                onUseCover={useSuggestedCover}
                            />
                            <form.SubmitButton
                                label="Save Cover"
                            />
                        </form.FormFieldset>
                    </form.FormRoot>
                </form.AppForm>
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

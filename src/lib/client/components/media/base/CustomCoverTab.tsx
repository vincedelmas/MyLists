import {useState} from "react";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {ImageOff, Link2, UploadCloud, X} from "lucide-react";
import {FormError} from "@/lib/client/components/forms/FormError";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {UpdateUserCustomCoverInput, updateUserCustomCoverSchema} from "@/lib/schemas";
import {useUpdateCustomCoverMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


interface CustomCoverTabProps {
    mediaType: MediaType;
    userMedia: UserMedia | UserMediaItem;
    onUpdateMutation: ReturnType<typeof useUpdateCustomCoverMutation>;
}


export const CustomCoverTabContent = ({ mediaType, userMedia, onUpdateMutation }: CustomCoverTabProps) => {
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const form = useForm<UpdateUserCustomCoverInput>({
        resolver: zodResolver(updateUserCustomCoverSchema),
        defaultValues: {
            mediaType,
            remove: false,
            imageUrl: undefined,
            imageFile: undefined,
            mediaId: userMedia.mediaId,
        },
    });

    const resetForm = () => {
        setMode("link");
        setFileInputKey((prev) => prev + 1);
        form.reset({
            mediaType,
            remove: false,
            imageUrl: undefined,
            imageFile: undefined,
            mediaId: userMedia.mediaId,
        });
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

    const handleSubmit = (data: UpdateUserCustomCoverInput) => {
        const formData = new FormData();
        formData.append("mediaType", data.mediaType);
        formData.append("mediaId", String(data.mediaId));

        if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
        if (data.imageFile) formData.append("imageFile", data.imageFile);

        onUpdateMutation.mutate({ data: formData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => resetForm(),
        });
    };

    const handleRemove = () => {
        const formData = new FormData();
        formData.append("remove", "true");
        formData.append("mediaType", mediaType);
        formData.append("mediaId", userMedia.mediaId.toString());

        onUpdateMutation.mutate({ data: formData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                resetForm();
            },
        });
    };

    return (
        <div className="space-y-4 px-4 mt-1">
            <div className="flex justify-center items-center">
                {userMedia.customCover ?
                    <div className="relative">
                        <img
                            alt="Custom Cover"
                            src={userMedia.customCover}
                            className="h-52 rounded-md border object-cover"
                        />
                        <Button
                            type="button"
                            size="iconBare"
                            variant="invisible"
                            onClick={handleRemove}
                            title="Remove custom cover"
                            className="absolute -top-2 -right-2.5 rounded-full bg-destructive p-1"
                        >
                            <X className="size-4"/>
                        </Button>
                    </div>
                    :
                    <div className="h-52 w-35 flex flex-col gap-2 px-2 justify-center text-center items-center rounded-md border
                    border-dashed text-sm text-muted-foreground">
                        <ImageOff className="size-6"/>
                        No custom cover set for this media
                    </div>
                }
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant={mode === "link" ? "emeraldy" : "outline"} onClick={setImageLinkMode}>
                    <Link2 className="size-4"/> Cover Link
                </Button>
                <Button type="button" variant={mode === "upload" ? "emeraldy" : "outline"} onClick={setImageUploadMode}>
                    <UploadCloud className="size-4"/> Upload Cover
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6 border-b">
                    <fieldset disabled={onUpdateMutation.isPending} className="space-y-4">
                        {mode === "link" ?
                            <FormField
                                name="imageUrl"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Cover URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ""}
                                                placeholder="https://example.com/cover.jpg"
                                                onChange={(ev) => field.onChange(ev.target.value.trim() ? ev.target.value : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            :
                            <FormField
                                name="imageFile"
                                control={form.control}
                                render={({ field: { onChange, onBlur, name, ref } }) =>
                                    <FormItem>
                                        <FormLabel>Upload Cover</FormLabel>
                                        <FormControl>
                                            <Input
                                                ref={ref}
                                                type="file"
                                                name={name}
                                                onBlur={onBlur}
                                                accept="image/*"
                                                key={fileInputKey}
                                                onChange={(ev) => onChange(ev.target.files?.[0] ?? undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                        }
                    </fieldset>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={onUpdateMutation.isPending}>
                        Save Custom Cover
                    </FormSubmitButton>
                </form>
            </Form>
        </div>
    );
};

import {useState} from "react";
import {ImageOff, X} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {UpdateUserCustomCoverInput, updateUserCustomCoverSchema} from "@/lib/schemas";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {GoogleCoverSearch} from "@/lib/client/components/media/base/GoogleCoverSearch";
import {useUpdateCustomCoverMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface CustomCoverTabProps {
    enabled?: boolean;
    disabled?: boolean;
    mediaName?: string;
    mediaType: MediaType;
    authors?: string | null;
    userMedia: UserMedia | UserMediaItem;
    onUpdateMutation: ReturnType<typeof useUpdateCustomCoverMutation>;
}


export const CustomCoverTabContent = (props: CustomCoverTabProps) => {
    const { mediaType, userMedia, onUpdateMutation, mediaName, authors, enabled = true, disabled = false } = props;

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
        form.reset({
            mediaType,
            remove: false,
            imageUrl: undefined,
            imageFile: undefined,
            mediaId: userMedia.mediaId,
        });
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
        formData.append("mediaType", mediaType);
        formData.append("remove", "true");
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

    const useSuggestedCover = (suggestedCoverUrl: string) => {
        setMode("link");
        form.clearErrors(["imageFile", "imageUrl"]);
        form.setValue("imageFile", undefined);
        form.setValue("imageUrl", suggestedCoverUrl, { shouldDirty: true, shouldValidate: true });
    };

    const isFormDisabled = disabled || onUpdateMutation.isPending;
    const removingCover = onUpdateMutation.isPending
        && onUpdateMutation.variables?.data instanceof FormData
        && onUpdateMutation.variables.data.get("remove") === "true";

    return (
        <div className="space-y-4 px-4 mt-1">
            <div className="flex justify-center items-center">
                {userMedia.customCover ?
                    <div className="relative">
                        <img
                            alt="Custom Cover"
                            src={userMedia.customCover}
                            className="h-65 rounded-md border object-cover"
                        />
                        <LoadingButton
                            size="bare"
                            type="button"
                            variant="ghost"
                            onClick={handleRemove}
                            isLoading={removingCover}
                            title="Remove custom cover"
                            icon={<X className="size-4"/>}
                            disabled={disabled || (onUpdateMutation.isPending && !removingCover)}
                            className="absolute -top-2 -right-2.5 rounded-full bg-destructive p-1"
                        />
                    </div>
                    :
                    <div className="h-65 w-43.5 flex flex-col gap-2 px-3 justify-center text-center items-center rounded-md border
                    border-dashed text-xs text-muted-foreground">
                        <ImageOff className="size-6"/>
                        No custom cover set for this media
                    </div>
                }
            </div>

            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-3">
                    <FieldSet disabled={isFormDisabled}>
                        <FieldGroup>
                            {mediaName &&
                                <GoogleCoverSearch
                                    enabled={enabled}
                                    authors={authors}
                                    mediaType={mediaType}
                                    mediaName={mediaName}
                                    disabled={isFormDisabled}
                                    mediaId={userMedia.mediaId}
                                    onUseCover={useSuggestedCover}
                                />
                            }
                            <CoverSourceFields
                                mode={mode}
                                onModeChange={setMode}
                                disabled={isFormDisabled}
                            />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={onUpdateMutation.isPending && !removingCover} disabled={disabled || removingCover}>
                        Save Custom Cover
                    </FormSubmitButton>
                </form>
            </FormProvider>
        </div>
    );
};

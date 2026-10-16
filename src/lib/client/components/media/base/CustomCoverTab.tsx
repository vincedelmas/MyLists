import {useState} from "react";
import {ImageOff, X} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {UpdateUserCustomCoverInput, updateUserCustomCoverSchema} from "@/lib/schemas";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {useUpdateCustomCoverMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface CustomCoverTabProps {
    mediaType: MediaType;
    userMedia: UserMedia | UserMediaItem;
    onUpdateMutation: ReturnType<typeof useUpdateCustomCoverMutation>;
}


export const CustomCoverTabContent = ({ mediaType, userMedia, onUpdateMutation }: CustomCoverTabProps) => {
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
                            size="bare"
                            type="button"
                            variant="ghost"
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

            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4 border-b pb-6">
                    <FieldSet disabled={onUpdateMutation.isPending}>
                        <FieldGroup>
                            <CoverSourceFields
                                mode={mode}
                                onModeChange={setMode}
                                disabled={onUpdateMutation.isPending}
                            />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={onUpdateMutation.isPending}>
                        Save Custom Cover
                    </FormSubmitButton>
                </form>
            </FormProvider>
        </div>
    );
};

import {useState} from "react";
import {ImageOff, X} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {CoverImageFormInput} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {CoverImageForm} from "@/lib/client/components/media/base/CoverImageForm";
import {useUpdateCustomCoverMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface CustomCoverTabProps {
    mediaType: MediaType;
    userMedia: UserMedia | UserMediaItem;
    onUpdateMutation: ReturnType<typeof useUpdateCustomCoverMutation>;
}


export const CustomCoverTabContent = ({ mediaType, userMedia, onUpdateMutation }: CustomCoverTabProps) => {
    const [coverFormKey, setCoverFormKey] = useState(0);

    const updateCover = ({ imageUrl, imageFile }: CoverImageFormInput) => {
        const formData = new FormData();
        formData.append("mediaType", mediaType);
        formData.append("mediaId", String(userMedia.mediaId));

        if (imageUrl) formData.append("imageUrl", imageUrl);
        if (imageFile) formData.append("imageFile", imageFile);

        return onUpdateMutation.mutateAsync({ data: formData });
    };

    const handleRemove = () => {
        const formData = new FormData();
        formData.append("remove", "true");
        formData.append("mediaType", mediaType);
        formData.append("mediaId", userMedia.mediaId.toString());

        onUpdateMutation.mutate({ data: formData }, {
            onSuccess: () => setCoverFormKey((key) => key + 1),
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

            <CoverImageForm
                key={coverFormKey}
                onSubmit={updateCover}
                className="pb-7 border-b"
            />
        </div>
    );
};

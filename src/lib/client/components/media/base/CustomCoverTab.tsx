import {toast} from "sonner";
import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {Label} from "@/lib/client/components/ui/label";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {ImageOff, Link2, UploadCloud, X} from "lucide-react";
import {UserMedia, UserMediaItem} from "@/lib/types/query.options.types";
import {useUpdateCustomCoverMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface CustomCoverTabContentProps {
    mediaType: MediaType;
    userMedia: UserMedia | UserMediaItem;
    onUpdateMutation: ReturnType<typeof useUpdateCustomCoverMutation>;
}


export const CustomCoverTabContent = ({ mediaType, userMedia, onUpdateMutation }: CustomCoverTabContentProps) => {
    const [imageUrl, setImageUrl] = useState("");
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [imageFile, setImageFile] = useState<File | null>(null);

    const resetForm = () => {
        setImageUrl("");
        setMode("link");
        setImageFile(null);
        setFileInputKey((prev) => prev + 1);
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append("mediaType", mediaType);
        formData.append("mediaId", userMedia.mediaId.toString());

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

        onUpdateMutation.mutate({ data: formData }, {
            onSuccess: () => resetForm(),
        });
    };

    const handleRemove = () => {
        const formData = new FormData();
        formData.append("remove", "true");
        formData.append("mediaType", mediaType);
        formData.append("mediaId", userMedia.mediaId.toString());

        onUpdateMutation.mutate({ data: formData }, {
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
                        <div
                            role="button"
                            onClick={handleRemove}
                            title="Remove custom cover"
                            className="absolute -top-2 -right-2.5 rounded-full bg-destructive p-1"
                        >
                            <X className="size-4"/>
                        </div>
                    </div>
                    :
                    <div className="h-52 w-35 flex flex-col gap-2 px-2 justify-center text-center items-center rounded-md border border-dashed text-sm text-muted-foreground">
                        <ImageOff className="size-6"/>
                        No custom cover set for this media
                    </div>
                }
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant={mode === "link" ? "emeraldy" : "outline"}
                    onClick={() => {
                        setMode("link");
                        setImageFile(null);
                        setFileInputKey((prev) => prev + 1);
                    }}
                >
                    <Link2 className="size-4"/> Cover Link
                </Button>
                <Button
                    variant={mode === "upload" ? "emeraldy" : "outline"}
                    onClick={() => {
                        setImageUrl("");
                        setMode("upload");
                    }}
                >
                    <UploadCloud className="size-4"/> Upload Cover
                </Button>
            </div>

            {mode === "link" ?
                <div className="space-y-2">
                    <Label htmlFor="custom-cover-url">Cover URL</Label>
                    <Input
                        value={imageUrl}
                        id="custom-cover-url"
                        placeholder="https://example.com/cover.jpg"
                        onChange={(ev) => setImageUrl(ev.target.value)}
                    />
                </div>
                :
                <div className="space-y-2">
                    <Label htmlFor="custom-cover-file">Upload Cover</Label>
                    <Input
                        type="file"
                        accept="image/*"
                        key={fileInputKey}
                        id="custom-cover-file"
                        onChange={(ev) => setImageFile(ev.target.files?.[0] ?? null)}
                    />
                </div>
            }

            <div className="pb-6 border-b">
                <Button type="button" onClick={handleSubmit} disabled={onUpdateMutation.isPending}>
                    Save Custom Cover
                </Button>
            </div>
        </div>
    );
};

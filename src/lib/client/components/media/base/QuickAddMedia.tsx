import React from "react";
import {CirclePlus} from "lucide-react";
import {captureEvent} from "@/lib/client/analytics";
import {MediaType, Status} from "@/lib/utils/enums";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface QuickAddMediaProps {
    mediaId: number;
    mediaType: MediaType;
    isMediaTypeActive: boolean;
    onAdded?: () => Promise<void>;
    allStatuses: readonly Status[];
}


export const QuickAddMedia = ({ mediaType, mediaId, isMediaTypeActive, allStatuses, onAdded }: QuickAddMediaProps) => {
    const addToListMutation = useAddMediaToListMutation("quick_add");

    const loading = useDelayedLoading(addToListMutation.isPending);
    const pending = addToListMutation.isPending || loading;

    const addMediaToUser = (status: Status) => {
        addToListMutation.mutate({ data: { mediaType, status, mediaId } }, { onSuccess: onAdded });
    };

    return (
        <Popover onOpenChange={open => {
            if (open) captureEvent("media_add_opened", {
                media_type: mediaType, source: "quick_add", is_media_type_active: isMediaTypeActive,
            });
        }}>
            <PopoverTrigger
                render={
                    <LoadingButton
                        size="bare"
                        type="button"
                        variant="ghost"
                        aria-label="Add media to list"
                        isLoading={addToListMutation.isPending}
                        className="opacity-70 hover:opacity-100"
                        icon={<CirclePlus data-icon="inline-start"/>}
                    />
                }
            />
            <PopoverContent
                align="end"
                data-save-feedback={pending && !loading ? "waiting" : undefined}
                className={isMediaTypeActive ? "w-40 p-2 text-sm gap-0" : "w-65 p-3"}
            >
                {isMediaTypeActive ?
                    <>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-3 mb-2">
                            Add to your list
                        </div>
                        {allStatuses.map((status) =>
                            <LoadingButton
                                size="sm"
                                key={status}
                                variant="hover"
                                className="w-full justify-start font-normal"
                                onClick={() => addMediaToUser(status)}
                                disabled={pending && addToListMutation.variables?.data.status !== status}
                                isLoading={addToListMutation.isPending && addToListMutation.variables?.data.status === status}
                            >
                                {status}
                            </LoadingButton>
                        )}
                    </>
                    :
                    <DisabledMediaListNotice
                        compact={true}
                        mediaType={mediaType}
                    />
                }
            </PopoverContent>
        </Popover>
    );
};

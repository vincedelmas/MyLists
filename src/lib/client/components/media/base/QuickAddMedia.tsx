import {captureEvent} from "@/lib/client/analytics";
import React from "react";
import {CirclePlus} from "lucide-react";
import {MediaType, Status} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
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
                    <Button
                        size="bare"
                        type="button"
                        variant="ghost"
                        aria-label="Add media to list"
                        className="opacity-70 hover:opacity-100"
                    />
                }
            >
                <CirclePlus data-icon="inline-start"/>
            </PopoverTrigger>
            <PopoverContent align="end" className={isMediaTypeActive ? "w-40 p-2 text-sm gap-0" : "w-65 p-3"}>
                {isMediaTypeActive ?
                    <>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-3 mb-2">
                            Add to your list
                        </div>
                        {allStatuses.map((status) =>
                            <Button
                                size="sm"
                                key={status}
                                variant="hover"
                                onClick={() => addMediaToUser(status)}
                                className="w-full justify-start font-normal"
                            >
                                {status}
                            </Button>
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

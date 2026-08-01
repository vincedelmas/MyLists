import {CirclePlus} from "lucide-react";
import {MediaType, Status} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import React from "react";


interface QuickAddMediaProps {
    mediaId: number;
    mediaType: MediaType;
    allStatuses: Status[];
    isMediaTypeActive: boolean;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const QuickAddMedia = ({ mediaType, mediaId, isMediaTypeActive, allStatuses, queryOption }: QuickAddMediaProps) => {
    const addToListMutation = useAddMediaToListMutation(queryOption);

    const addMediaToUser = (status: Status) => {
        addToListMutation.mutate({ data: { mediaType, status, mediaId } });
    };

    return (
        <Popover>
            <PopoverTrigger render={<Button size="bare" variant="ghost" className="absolute right-2 top-2 z-10"/>}>
                <CirclePlus className="opacity-60 group-hover:opacity-90"/>
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

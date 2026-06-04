import {CirclePlus} from "lucide-react";
import {MediaType, Status} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface QuickAddMediaProps {
    mediaId: number;
    mediaType: MediaType;
    allStatuses: Status[];
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const QuickAddMedia = ({ mediaType, mediaId, allStatuses, queryOption }: QuickAddMediaProps) => {
    const addToListMutation = useAddMediaToListMutation(queryOption);

    const addMediaToUser = (status: Status) => {
        addToListMutation.mutate({ data: { mediaType, status, mediaId } });
    };

    return (
        <Popover>
            <PopoverTrigger className="opacity-70 hover:opacity-90 transition-opacity">
                <CirclePlus className="size-4"/>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 py-2 px-2 text-sm">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-3 mb-2">
                    Add to your list
                </div>
                {allStatuses.map((status) =>
                    <Button key={status} variant="ghost" size="sm" className="w-full justify-start font-normal" onClick={() => addMediaToUser(status)}>
                        {status}
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
};
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {CircleCheck, Settings2} from "lucide-react";
import {statusUtils} from "@/lib/utils/media-mapping";
import {Button} from "@/lib/client/components/ui/button";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";


export type ColumnConfigProps = {
    isCurrent: boolean;
    isConnected: boolean;
    mediaType: MediaType;
    isMediaTypeActive: boolean;
    onEdit: (mediaId: number) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const getBaseColumns = <T extends UserMediaItem>(props: ColumnConfigProps): ColumnDef<T>[] => {
    const { isCurrent, isConnected, isMediaTypeActive, mediaType, queryOption, onEdit } = props;

    return [
        {
            id: "name",
            header: "Name",
            cell: ({ row: { original } }) => (
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: original.mediaId }}>
                    <div className="flex items-center gap-3">
                        {original.mediaName}
                        {!isCurrent && isMediaTypeActive && original.common &&
                            <CircleCheck
                                className="h-4 w-4 text-green-500"
                            />
                        }
                    </div>
                </Link>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
        },
        {
            id: "actions",
            cell: ({ row: { original } }) => {
                if (!isConnected) return null;
                if (isCurrent) {
                    return (
                        <Button
                            type="button"
                            size="iconBare"
                            variant="invisible"
                            onClick={() => onEdit(original.mediaId)}
                            className="flex w-full items-center justify-center"
                        >
                            <Settings2 className="w-4 h-4 opacity-70"/>
                        </Button>
                    );
                }
                if (!isMediaTypeActive || !original.common) {
                    return (
                        <div className="flex items-center justify-center">
                            <QuickAddMedia
                                mediaType={mediaType}
                                queryOption={queryOption}
                                mediaId={original.mediaId}
                                isMediaTypeActive={isMediaTypeActive}
                                allStatuses={statusUtils.byMediaType(mediaType)}
                            />
                        </div>
                    );
                }
                return null;
            },
        },
    ];
}

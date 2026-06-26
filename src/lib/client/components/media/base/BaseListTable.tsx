import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {statusUtils} from "@/lib/utils/media-mapping";
import {CircleCheck, Settings2} from "lucide-react";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {mediaListOptions} from "@/lib/client/react-query/query-options";


export type ColumnConfigProps = {
    isCurrent: boolean;
    isConnected: boolean;
    mediaType: MediaType;
    onEdit: (mediaId: number) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const getBaseColumns = <T extends UserMediaItem>({ isCurrent, isConnected, mediaType, queryOption, onEdit }: ColumnConfigProps): ColumnDef<T>[] => [
    {
        id: "name",
        header: "Name",
        cell: ({ row: { original } }) => (
            <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: original.mediaId }}>
                <div className="flex items-center gap-3">
                    {original.mediaName}
                    {!isCurrent && original.common && <CircleCheck className="h-4 w-4 text-green-500"/>}
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
                    <div role="button" className="flex items-center justify-center" onClick={() => onEdit(original.mediaId)}>
                        <Settings2 className="w-4 h-4 opacity-70"/>
                    </div>
                );
            }
            if (!original.common) {
                return (
                    <div className="flex items-center justify-center">
                        <QuickAddMedia
                            mediaType={mediaType}
                            queryOption={queryOption}
                            mediaId={original.mediaId}
                            allStatuses={statusUtils.byMediaType(mediaType)}
                        />
                    </div>
                );
            }
            return null;
        },
    },
];

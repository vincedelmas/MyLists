import {Link} from "@tanstack/react-router";
import {UpdateType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDateTime} from "@/lib/utils/formatting/date";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {ContinueAction} from "@/lib/client/components/continue/ContinueAction";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import type {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";


export const ContinueTable = ({ items, readOnly = false }: { items: ContinueItem[]; readOnly?: boolean }) => {
    const columns: ColumnDef<typeof mediaTableFeatures, ContinueItem>[] = [
        {
            id: "name",
            header: "Name",
            cell: ({ row: { original } }) => (
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType: original.mediaType, mediaId: original.mediaId }}>
                    {original.mediaName}
                </Link>
            ),
        },
        {
            id: "mediaType",
            header: "Media type",
            cell: ({ row: { original } }) => (
                <div className="flex items-center gap-2">
                    <MediaTypeIcon mediaType={original.mediaType}/>
                    <MediaTypeText mediaType={original.mediaType}/>
                </div>
            ),
        },
        {
            id: "progress",
            header: "Progress",
            cell: ({ row: { original } }) => (
                <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                    <span className="tabular-nums">
                        {getMediaConfig(original.mediaType).continue.getProgress(original).label}
                    </span>
                    {getMediaDefinition(original.mediaType).continue.getUpdate(original)?.type === UpdateType.STATUS &&
                        <Badge variant="secondary">
                            Mark complete
                        </Badge>
                    }
                </div>
            ),
        },
        {
            id: "lastUpdated",
            header: "Last updated",
            cell: ({ row: { original } }) => formatDateTime(original.lastUpdated ?? original.addedAt),
        },
    ];

    if (!readOnly) {
        columns.push({
            id: "actions",
            header: "Update progress",
            cell: ({ row: { original } }) => <ContinueAction item={original} showLabel/>,
        });
    }

    const table = useTable({
        columns,
        data: items,
        getRowId: toItemKey,
        manualPagination: true,
        features: mediaTableFeatures,
    });

    return (
        <DataTable
            table={table}
            ariaLabel="Continue titles"
        />
    );
};

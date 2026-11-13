import {Link} from "@tanstack/react-router";
import {toItemKey} from "@/lib/utils/media/item-key";
import {formatDate} from "@/lib/utils/formatting/date";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {MediaListIndicator} from "@/lib/client/components/media/base/MediaListIndicator";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {CollectionResultsProps} from "@/lib/client/components/collections/CollectionResults";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";


type TableItem = CollectionResultsProps["items"][number];


export const CollectionResultsTable = ({ items, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES }: CollectionResultsProps) => {
    const mediaTypes = [...new Set(items.map(item => item.mediaType))];
    const columns: ColumnDef<typeof mediaTableFeatures, TableItem>[] = [];

    if (items.some(item => item.rank !== undefined)) {
        columns.push({
            id: "rank",
            header: "Rank",
            cell: ({ row: { original } }) => `#${original.rank}`,
        });
    }

    columns.push({
        id: "name",
        header: "Name",
        cell: ({ row: { original } }) => (
            <Link to="/details/$mediaType/$mediaId" params={{ mediaType: original.mediaType, mediaId: original.mediaId }}>
                {original.mediaName}
            </Link>
        ),
    });

    if (mediaTypes.length > 1) {
        columns.push({
            id: "mediaType",
            header: "Media type",
            cell: ({ row: { original } }) => (
                <div className="flex items-center gap-2">
                    <MediaTypeIcon mediaType={original.mediaType}/>
                    <MediaTypeText mediaType={original.mediaType}/>
                </div>
            ),
        });
    }

    columns.push({
        id: "releaseDate",
        header: "Released",
        cell: ({ row: { original } }) => formatDate(original.releaseDate),
    });

    if (isConnected) {
        columns.push({
            id: "actions",
            header: "Your list",
            cell: ({ row: { original } }) => original.inUserList ?
                <MediaListIndicator mediaName={original.mediaName} presentation="icon"/>
                :
                <QuickAddMedia
                    onAdded={onEdited}
                    mediaId={original.mediaId}
                    mediaType={original.mediaType}
                    allStatuses={getMediaDefinition(original.mediaType).statuses}
                    isMediaTypeActive={activeMediaTypes.includes(original.mediaType)}
                />,
        });
    }

    if (items.some(item => item.annotation)) {
        columns.push({
            header: "Note",
            id: "annotation",
            cell: ({ row: { original } }) => original.annotation &&
                <DisplayComment
                    content={original.annotation}
                />,
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
            ariaLabel="Media results"
        />
    );
};

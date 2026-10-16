import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {toItemKey} from "@/lib/utils/media/item-key";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDate} from "@/lib/utils/formatting/date";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {flexRender, useTable, type ColumnDef} from "@tanstack/react-table";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import type {MediaListResultsProps} from "@/lib/client/components/media/base/MediaListResults";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";

export const MediaListResultsTable = ({ items, username, isCurrent, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES }: MediaListResultsProps) => {
    const mediaTypes = [...new Set(items.map(item => item.mediaType))];
    const tableItems = items.map(item => ({ ...item, ...item.userMedia }));

    type TableItem = typeof tableItems[number];
    const [editingItem, setEditingItem] = useState<MediaListResultsProps["items"][number] | null>(null);

    const columnsByType = new Map(mediaTypes.map(mediaType => [mediaType, mediaConfig[mediaType].mediaListColumns({
        mediaType,
        isCurrent,
        isConnected,
        isMediaTypeActive: activeMediaTypes.includes(mediaType),
        queryOption: mediaListOptions(mediaType, username, { page: 1, perPage: 25 }),
        onEdit: mediaId => setEditingItem(items.find(item => item.mediaType === mediaType && item.mediaId === mediaId)!),
    }) as ColumnDef<typeof mediaTableFeatures, TableItem>[]]));

    const definitions = new Map([...columnsByType.values()]
        .flat().map(column => [column.id ?? ("accessorKey" in column ? column.accessorKey : ""), column]));
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
            <Link
                to="/details/$mediaType/$mediaId"
                params={{ mediaType: original.mediaType, mediaId: original.mediaId }}
            >
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

    if (items.some(item => !item.userMedia)) {
        columns.push({
            id: "releaseDate",
            header: "Released",
            cell: ({ row: { original } }) => formatDate(original.releaseDate),
        });
    }

    const personalColumns = isConnected || items.some(item => item.userMedia)
        ? ["status", "progress", "information", ...(isConnected ? ["actions"] : [])]
        : [];

    for (const id of personalColumns) {
        const definition = definitions.get(id);
        if (!definition) continue;

        columns.push({
            ...definition,
            cell: context => {
                const item = context.row.original;
                if (!item.userMedia) {
                    if (id === "status") return (
                        <Badge variant="secondary">
                            Not in list
                        </Badge>
                    );

                    if (id !== "actions") {
                        return DEFAULT_DASH_FALLBACK;
                    }

                    return (
                        <QuickAddMedia
                            mediaId={item.mediaId}
                            mediaType={item.mediaType}
                            allStatuses={getMediaDefinition(item.mediaType).statuses}
                            isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                            queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                        />
                    );
                }

                const column = columnsByType.get(item.mediaType)!
                    .find(column => (column.id ?? ("accessorKey" in column ? column.accessorKey : "")) === id);

                return column?.cell
                    ? flexRender(column.cell, context)
                    : id === "status" ? item.userMedia.status : DEFAULT_DASH_FALLBACK;
            },
        });
    }

    if (items.some(item => item.annotation)) {
        columns.push({
            header: "Note",
            id: "annotation",
            cell: ({ row: { original } }) => original.annotation && <DisplayComment content={original.annotation}/>,
        });
    }

    const table = useTable({
        columns,
        data: tableItems,
        getRowId: toItemKey,
        manualPagination: true,
        features: mediaTableFeatures,
    });

    return (
        <>
            <DataTable
                table={table}
                ariaLabel="Media results"
            />

            {editingItem?.userMedia &&
                <UserMediaEditDialog
                    dialogOpen={true}
                    loadDetails={true}
                    onEdited={onEdited}
                    userMedia={editingItem.userMedia}
                    mediaType={editingItem.mediaType}
                    onOpenChange={() => setEditingItem(null)}
                    queryOption={mediaListOptions(editingItem.mediaType, username, { page: 1, perPage: 25 })}
                />
            }
        </>
    );
};

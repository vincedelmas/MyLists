import {useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {flexRender, useTable, type ColumnDef} from "@tanstack/react-table";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import type {smartViewOptions} from "@/lib/client/react-query/query-options/smart-views.options";


type SmartListItem = Awaited<ReturnType<NonNullable<ReturnType<typeof smartViewOptions>["queryFn"]>>>["results"]["items"][number];

interface SmartListResultsProps {
    isOwner: boolean;
    username: string;
    items: SmartListItem[];
    display: "grid" | "table";
}


export const SmartListResults = (props: SmartListResultsProps) => {
    const { items, display, isOwner, username } = props;
    const queryClient = useQueryClient();

    const handleEdited = async () => {
        await queryClient.invalidateQueries({ queryKey: ["smart-views"] });
    };

    if (display === "table") {
        return (
            <SmartListTable
                {...props}
                onEdited={handleEdited}
            />
        );
    }

    return (
        <MediaListGrid>
            {items.map(item =>
                <MediaListItem
                    userMedia={item}
                    showMediaType={true}
                    isCurrent={isOwner}
                    isConnected={isOwner}
                    loadEditDetails={true}
                    onEdited={handleEdited}
                    isMediaTypeActive={true}
                    mediaType={item.mediaType}
                    key={`${item.mediaType}-${item.mediaId}`}
                    allStatuses={getMediaDefinition(item.mediaType).statuses}
                    queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                />
            )}
        </MediaListGrid>
    );
};


const SmartListTable = ({ items, isOwner, username, onEdited }: SmartListResultsProps & { onEdited: () => Promise<void> }) => {
    const mediaTypes = [...new Set(items.map(item => item.mediaType))];
    const [editingItem, setEditingItem] = useState<SmartListItem | null>(null);

    const columnsByType = new Map(mediaTypes.map(mt => [mt, mediaConfig[mt].mediaListColumns({
        mediaType: mt,
        isCurrent: isOwner,
        isConnected: isOwner,
        isMediaTypeActive: true,
        queryOption: mediaListOptions(mt, username, { page: 1, perPage: 25 }),
        onEdit: mediaId => setEditingItem(items.find(item => item.mediaType === mt && item.mediaId === mediaId)!),
    }) as ColumnDef<typeof mediaTableFeatures, SmartListItem>[]]));

    const columnDefinitions = new Map([...columnsByType.values()]
        .flat().map(column => [column.id ?? ("accessorKey" in column ? column.accessorKey : ""), column]));

    const columns: ColumnDef<typeof mediaTableFeatures, SmartListItem>[] = ["name", "status", "progress", "information", ...(isOwner ? ["actions"] : [])]
        .filter(id => columnDefinitions.has(id))
        .map(id => {
            const column = columnDefinitions.get(id)!;
            return {
                ...column,
                cell: context => {
                    const mediaCol = columnsByType.get(context.row.original.mediaType)!
                        .find(col => (col.id ?? ("accessorKey" in col ? col.accessorKey : "")) === id);

                    return mediaCol?.cell
                        ? flexRender(mediaCol.cell, context)
                        : id === "status" ? context.row.original.status : null;
                },
            };
        });

    if (mediaTypes.length > 1) {
        columns.splice(1, 0, {
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

    const table = useTable({
        columns,
        data: items,
        manualPagination: true,
        features: mediaTableFeatures,
        getRowId: item => `${item.mediaType}-${item.mediaId}`,
    });

    return (
        <>
            <DataTable
                table={table}
                ariaLabel="Media results"
            />

            {editingItem &&
                <UserMediaEditDialog
                    dialogOpen={true}
                    loadDetails={true}
                    onEdited={onEdited}
                    userMedia={editingItem}
                    mediaType={editingItem.mediaType}
                    onOpenChange={() => setEditingItem(null)}
                    queryOption={mediaListOptions(editingItem.mediaType, username, { page: 1, perPage: 25 })}
                />
            }
        </>
    );
};

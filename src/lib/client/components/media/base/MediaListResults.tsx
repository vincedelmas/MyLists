import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {flexRender, useTable, type ColumnDef} from "@tanstack/react-table";
import type {MediaType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDate} from "@/lib/utils/formatting/date";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import type {UserMediaItem} from "@/lib/types/query.options.types";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardSignals,
    MediaCardTitle,
} from "@/lib/client/components/media/base/MediaCard";


interface MediaListResultItem {
    mediaId: number;
    mediaType: MediaType;
    mediaName: string;
    imageCover: string;
    userMedia: UserMediaItem | null;
    rank?: number;
    annotation?: string | null;
    releaseDate?: string | null;
}


interface MediaListResultsProps {
    username: string;
    isCurrent: boolean;
    isConnected: boolean;
    items: MediaListResultItem[];
    display: "grid" | "table";
    activeMediaTypes?: readonly MediaType[];
    onEdited: () => Promise<void>;
}


export const MediaListResults = (props: MediaListResultsProps) => {
    const { items, display, username, isCurrent, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES } = props;

    if (display === "table") return <MediaListResultsTable {...props}/>;

    return (
        <MediaListGrid>
            {items.map(item => item.userMedia ?
                <MediaListItem
                    key={toItemKey(item)}
                    mediaType={item.mediaType}
                    userMedia={item.userMedia}
                    rank={item.rank}
                    annotation={item.annotation}
                    showMediaType={true}
                    loadEditDetails={true}
                    onEdited={onEdited}
                    isCurrent={isCurrent}
                    isConnected={isConnected}
                    isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                    allStatuses={getMediaDefinition(item.mediaType).statuses}
                    queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                />
                :
                <MediaCard key={toItemKey(item)} item={item} mediaType={item.mediaType}>
                    <MediaCardLeftCorner>
                        <MediaTypeIcon mediaType={item.mediaType}/>
                        {item.rank !== undefined ? `#${item.rank}` : <MediaTypeText mediaType={item.mediaType}/>}
                    </MediaCardLeftCorner>
                    {isConnected &&
                        <MediaCardRightCorner>
                            <QuickAddMedia
                                mediaType={item.mediaType}
                                mediaId={item.mediaId}
                                isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                                allStatuses={getMediaDefinition(item.mediaType).statuses}
                                queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                            />
                        </MediaCardRightCorner>
                    }
                    <MediaCardFooter>
                        <MediaCardTitle lines={2}>{item.mediaName}</MediaCardTitle>
                        <MediaCardMeta>
                            <MediaCardDetails>
                                <MediaReleaseDate date={item.releaseDate ?? null}/>
                            </MediaCardDetails>
                            {item.annotation &&
                                <MediaCardSignals>
                                    <span role="group" aria-label="Collection note">
                                        <DisplayComment content={item.annotation}/>
                                    </span>
                                </MediaCardSignals>
                            }
                        </MediaCardMeta>
                    </MediaCardFooter>
                </MediaCard>,
            )}
        </MediaListGrid>
    );
};


const MediaListResultsTable = ({ items, username, isCurrent, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES }: MediaListResultsProps) => {
    const [editingItem, setEditingItem] = useState<MediaListResultItem | null>(null);
    const mediaTypes = [...new Set(items.map(item => item.mediaType))];
    const tableItems = items.map(item => ({ ...item, ...item.userMedia }));
    type TableItem = typeof tableItems[number];

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
                    if (id === "status") return <Badge variant="secondary">Not in list</Badge>;
                    if (id !== "actions") return DEFAULT_DASH_FALLBACK;
                    return (
                        <QuickAddMedia
                            mediaType={item.mediaType}
                            mediaId={item.mediaId}
                            isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                            allStatuses={getMediaDefinition(item.mediaType).statuses}
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
            id: "annotation",
            header: "Note",
            cell: ({ row: { original } }) => original.annotation && <DisplayComment content={original.annotation}/>,
        });
    }

    const table = useTable({
        columns,
        data: tableItems,
        features: mediaTableFeatures,
        manualPagination: true,
        getRowId: toItemKey,
    });

    return (
        <>
            <DataTable table={table} ariaLabel="Media results"/>
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

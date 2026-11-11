import {Check} from "lucide-react";
import {Link} from "@tanstack/react-router";
import type {MediaType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {formatDate} from "@/lib/utils/formatting/date";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardLeftCorner, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


interface MediaBrowseItem {
    title: string;
    mediaId: number;
    inUserList: boolean;
    mediaType: MediaType;
    imageCover: string | null;
    releaseDate: string | null;
}


interface MediaBrowseResultsProps {
    showMembership?: boolean;
    items: MediaBrowseItem[];
    display: "grid" | "table";
}


export const MediaBrowseResults = ({ items, display, showMembership = false }: MediaBrowseResultsProps) => {
    if (display === "table") {
        return (
            <MediaBrowseTable
                items={items}
                showMembership={showMembership}
            />
        );
    }

    return (
        <MediaListGrid>
            {items.map(item =>
                <MediaCard
                    key={toItemKey(item)}
                    mediaType={item.mediaType}
                    item={{ mediaId: item.mediaId, mediaName: item.title, imageCover: item.imageCover ?? undefined }}
                >
                    <MediaCardLeftCorner>
                        <MediaTypeIcon mediaType={item.mediaType}/>
                        <MediaTypeText mediaType={item.mediaType}/>
                    </MediaCardLeftCorner>
                    <MediaCardFooter>
                        <MediaCardTitle title={item.title} className="flex items-center gap-1.5 tracking-tight">
                            <span className="truncate">
                                {item.title}
                            </span>
                            {item.inUserList &&
                                <Check aria-label="In your list" className="ml-auto size-4 shrink-0 text-brand"/>
                            }
                        </MediaCardTitle>
                        <MediaCardMeta>
                            <MediaCardDetails>
                                <MediaReleaseDate date={item.releaseDate}/>
                            </MediaCardDetails>
                        </MediaCardMeta>
                    </MediaCardFooter>
                </MediaCard>
            )}
        </MediaListGrid>
    );
};


const MediaBrowseTable = ({ items, showMembership }: Omit<MediaBrowseResultsProps, "display">) => {
    const columns: ColumnDef<typeof mediaTableFeatures, MediaBrowseItem>[] = [
        {
            id: "name",
            header: "Name",
            cell: ({ row: { original } }) => (
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType: original.mediaType, mediaId: original.mediaId }}>
                    {original.title}
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
            id: "releaseDate",
            header: "Released",
            cell: ({ row: { original } }) => formatDate(original.releaseDate),
        },
    ];

    if (showMembership) {
        columns.push({
            id: "inUserList",
            header: "In your list",
            cell: ({ row: { original } }) => original.inUserList ? "Yes" : "No",
        });
    }

    const table = useTable({
        data: items,
        columns,
        features: mediaTableFeatures,
        manualPagination: true,
        getRowId: toItemKey,
    });

    return <DataTable table={table} ariaLabel="Media results" className="min-w-0"/>;
};

import {Link} from "@tanstack/react-router";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import type {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/formatting/date";
import {toItemKey} from "@/lib/utils/media/item-key";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardTitle,
} from "@/lib/client/components/media/base/MediaCard";


interface MediaBrowseItem {
    title: string;
    mediaId: number;
    mediaType: MediaType;
    inUserList: boolean;
    imageCover: string | null;
    releaseDate: string | null;
}


interface MediaBrowseResultsProps {
    showMembership?: boolean;
    items: MediaBrowseItem[];
    display: "grid" | "table";
}


export const MediaBrowseResults = ({ items, display, showMembership = false }: MediaBrowseResultsProps) => {
    if (display === "table") return <MediaBrowseTable items={items} showMembership={showMembership}/>;

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                    {item.inUserList &&
                        <MediaCardRightCorner>
                            <DisplayInUserListCheck/>
                        </MediaCardRightCorner>
                    }
                    <MediaCardFooter>
                        <MediaCardTitle lines={2}>
                            {item.title}
                        </MediaCardTitle>
                        <MediaCardMeta>
                            <MediaCardDetails>
                                <MediaReleaseDate date={item.releaseDate}/>
                            </MediaCardDetails>
                        </MediaCardMeta>
                    </MediaCardFooter>
                </MediaCard>
            )}
        </div>
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

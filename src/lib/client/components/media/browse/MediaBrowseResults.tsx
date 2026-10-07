import {Link} from "@tanstack/react-router";
import {Heart} from "lucide-react";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import {formatDate} from "@/lib/utils/formatting/date";
import {Badge} from "@/lib/client/components/ui/badge";
import type {MediaType, Status} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardSignals,
    MediaCardTitle
} from "@/lib/client/components/media/base/MediaCard";


interface MediaBrowseItem {
    title: string;
    rank?: number;
    mediaId: number;
    mediaType: MediaType;
    inUserList?: boolean;
    status?: Status | null;
    rating?: number | null;
    addedAt?: string | null;
    imageCover: string | null;
    favorite?: boolean | null;
    annotation?: string | null;
    releaseDate?: string | null;
    lastUpdated?: string | null;
}


interface MediaBrowseResultsProps {
    personal?: boolean;
    showMembership?: boolean;
    items: MediaBrowseItem[];
    display: "grid" | "table";
}


export const MediaBrowseResults = ({ items, display, personal = true, showMembership = false }: MediaBrowseResultsProps) => {
    const annotated = items.some(item => item.annotation);
    const ranked = items.some(item => item.rank !== undefined);
    const columns: ColumnDef<typeof mediaTableFeatures, MediaBrowseItem>[] = [];

    if (ranked) {
        columns.push({
            id: "rank",
            header: "Rank",
            cell: ({ row: { original } }) => `#${original.rank}`,
        });
    }

    columns.push(
        {
            id: "name",
            header: "Name",
            cell: ({ row: { original } }) => (
                <Link
                    to="/details/$mediaType/$mediaId"
                    params={{ mediaType: original.mediaType, mediaId: original.mediaId }}
                >
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
    );

    if (showMembership) {
        columns.push({
            id: "inUserList",
            header: "In your list",
            cell: ({ row: { original } }) => original.inUserList ? "Yes" : "No",
        });
    }

    if (personal) {
        columns.push(
            {
                id: "status",
                header: "Status",
                cell: ({ row: { original } }) => original.status
                    ? <Badge variant="secondary">{original.status}</Badge>
                    : original.inUserList === false ? "Not in list" : DEFAULT_DASH_FALLBACK,
            },
            {
                id: "information",
                header: "Information",
                cell: ({ row: { original } }) => (
                    <div className="flex items-center gap-3">
                        {original.rating != null
                            ? <DisplayRating rating={original.rating}/>
                            : <span className="text-muted-foreground">{DEFAULT_DASH_FALLBACK}</span>
                        }
                        {original.favorite &&
                            <Heart
                                role="img"
                                aria-label="Favorite"
                                className="size-4 fill-favorite text-favorite"
                            />
                        }
                    </div>
                ),
            },
            {
                id: "addedAt",
                header: "Added",
                cell: ({ row: { original } }) => formatDate(original.addedAt),
            },
            {
                id: "lastUpdated",
                header: "Updated",
                cell: ({ row: { original } }) => formatDate(original.lastUpdated),
            },
        );
    }

    if (annotated) {
        columns.push({
            id: "annotation",
            header: "Note",
            cell: ({ row: { original } }) => original.annotation && <DisplayComment content={original.annotation}/>,
        });
    }

    const table = useTable({
        data: items,
        columns,
        features: mediaTableFeatures,
        manualPagination: true,
        getRowId: item => `${item.mediaType}-${item.mediaId}`,
    });

    if (display === "table") {
        return <DataTable table={table} ariaLabel="Media results" className="min-w-0"/>;
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map(item =>
                <MediaCard
                    mediaType={item.mediaType}
                    key={`${item.mediaType}-${item.mediaId}`}
                    item={{ mediaId: item.mediaId, mediaName: item.title, imageCover: item.imageCover ?? undefined }}
                >
                    <MediaCardLeftCorner>
                        {item.rank !== undefined ?
                            <>
                                <MediaTypeIcon mediaType={item.mediaType}/>
                                #{item.rank}
                            </>
                            :
                            <>
                                <MediaTypeIcon mediaType={item.mediaType}/>
                                <MediaTypeText mediaType={item.mediaType}/>
                            </>
                        }
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
                                {personal && item.status
                                    ? <span>{item.status}</span>
                                    : <MediaReleaseDate date={item.releaseDate ?? null}/>
                                }
                            </MediaCardDetails>
                            {item.annotation &&
                                <MediaCardSignals>
                                    <DisplayComment
                                        content={item.annotation}
                                    />
                                </MediaCardSignals>
                            }
                        </MediaCardMeta>
                        {personal &&
                            <div className="flex items-center justify-between gap-2 pt-1">
                                {item.rating != null
                                    ? <DisplayRating rating={item.rating}/>
                                    : <span/>
                                }

                                {item.favorite &&
                                    <Badge variant="overlay">
                                        <Heart aria-label="Favorite"/>
                                    </Badge>}
                            </div>
                        }
                    </MediaCardFooter>
                </MediaCard>
            )}
        </div>
    );
};

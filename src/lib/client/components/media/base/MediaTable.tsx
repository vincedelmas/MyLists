import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaListArgs} from "@/lib/schemas";
import {useTable} from "@tanstack/react-table";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {ListPagination, UserMediaItem} from "@/lib/types/query.options.types";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";


interface MediaTableProps {
    isCurrent: boolean;
    mediaType: MediaType;
    filters: MediaListArgs;
    queryOption: ReturnType<typeof mediaListOptions>;
    onChangePage: (filters: Partial<MediaListArgs>) => void;
    results: {
        items: UserMediaItem[];
        pagination: ListPagination;
    };
}


const MediaTable = ({ filters, isCurrent, mediaType, results, queryOption, onChangePage }: MediaTableProps) => {
    const { currentUser } = useAuth();
    const isConnected = !!currentUser;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const { pagination, onPaginationChange } = useTablePagination({
        pageSize: 25,
        page: filters.page,
        onPageChange: (page) => onChangePage({ page }),
    });

    const handleEdit = (mediaId: number) => {
        setEditingId(mediaId);
        setDialogOpen(true);
    };

    const listColumns = mediaConfig[mediaType]
        .mediaListColumns({ isCurrent, isConnected, isMediaTypeActive, mediaType, queryOption, onEdit: handleEdit });

    const table = useTable({
        onPaginationChange,
        manualPagination: true,
        data: results.items ?? [],
        columns: listColumns as any,
        features: mediaTableFeatures,
        rowCount: results.pagination.totalItems ?? 0,
        state: { pagination },
    });

    const getCurrentEditingItem = () => {
        if (!editingId) return null;
        return results.items.find((item) => item.mediaId === editingId);
    };

    return (
        <>
            <DataTable
                table={table}
                getCellStyle={(cell) => ({ width: getColumnWidth(cell.column.id) })}
            />
            <div className="mt-3">
                <TablePagination
                    table={table}
                />
            </div>
            <UserMediaEditDialog
                mediaType={mediaType}
                dialogOpen={dialogOpen}
                queryOption={queryOption}
                userMedia={getCurrentEditingItem()!}
                onOpenChange={() => {
                    setEditingId(null);
                    setDialogOpen(false);
                }}
            />
        </>
    );
};


export default MediaTable;


function getColumnWidth(colId: string) {
    const columnWidths: Record<string, string> = {
        "Name": "auto",
        "status": "auto",
        "Progress": "auto",
        "Information": "250px",
        "actions": "80px",
    };
    return columnWidths[colId] || "auto";
}

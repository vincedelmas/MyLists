import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaListArgs} from "@/lib/schemas";
import {useTable} from "@tanstack/react-table";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {ListPagination, UserMediaItem} from "@/lib/types/query.options.types";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";


interface MediaTableProps {
    isCurrent: boolean;
    mediaType: MediaType;
    filters: MediaListArgs;
    onChangePage: (filters: Partial<MediaListArgs>) => void;
    results: {
        items: UserMediaItem[];
        pagination: ListPagination;
    };
}


const columnWidths: Record<string, string> = {
    actions: "80px",
    information: "250px",
};


const MediaTable = ({ filters, isCurrent, mediaType, results, onChangePage }: MediaTableProps) => {
    const { currentUser } = useAuth();
    const isConnected = !!currentUser;
    const [editingId, setEditingId] = useState<number | null>(null);
    const editingItem = results.items.find(item => item.mediaId === editingId);
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const { pagination, onPaginationChange } = useTablePagination({
        pageSize: results.pagination.perPage,
        page: filters.page,
        onPageChange: (page) => onChangePage({ page }),
    });

    const listColumns = mediaConfig[mediaType]
        .mediaListColumns({ isCurrent, isConnected, isMediaTypeActive, mediaType, onEdit: setEditingId });

    const table = useTable({
        onPaginationChange,
        data: results.items,
        manualPagination: true,
        columns: listColumns as any,
        features: mediaTableFeatures,
        rowCount: results.pagination.totalItems,
        state: { pagination },
    });

    return (
        <>
            <DataTable
                table={table}
                getCellStyle={(cell) => ({ width: columnWidths[cell.column.id] ?? "auto" })}
            />
            <div className="mt-3">
                <TablePagination
                    table={table}
                />
            </div>
            {editingItem &&
                <UserMediaEditDialog
                    dialogOpen={true}
                    mediaType={mediaType}
                    mediaId={editingItem.mediaId}
                    mediaName={editingItem.mediaName}
                    onOpenChange={() => setEditingId(null)}
                />
            }
        </>
    );
};


export default MediaTable;

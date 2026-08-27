import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {DisplayPlaytime} from "@/lib/client/components/media/games/DisplayPlaytime";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {CommonInfoTableCell} from "@/lib/client/components/media/base/CommonInfoTableCell";
import {ColumnConfigProps, getBaseColumns} from "@/lib/client/components/media/base/BaseListTable";


export const getGamesColumns = (props: ColumnConfigProps): ColumnDef<typeof mediaTableFeatures, ExtractListByType<typeof MediaType.GAMES>>[] => {
    const base = getBaseColumns<ExtractListByType<typeof MediaType.GAMES>>(props);

    base.splice(2, 0, {
        id: "progress",
        header: "Progress",
        cell: ({ row: { original } }) => (
            <DisplayPlaytime
                status={original.status}
                playtime={original.playtime}
            />
        )
    });

    base.splice(3, 0, {
        id: "information",
        header: "Information",
        cell: ({ row: { original } }) => (
            <div className="flex items-center gap-3">
                <CommonInfoTableCell
                    userMedia={original}
                />
            </div>
        ),
    });

    return base;
};

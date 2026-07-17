import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {CommonInfoTableCell} from "@/lib/client/components/media/base/CommonInfoTableCell";
import {ColumnConfigProps, getBaseColumns} from "@/lib/client/components/media/base/BaseListTable";


export const getMangaColumns = (props: ColumnConfigProps): ColumnDef<ExtractListByType<typeof MediaType.MANGA>>[] => {
    const base = getBaseColumns<ExtractListByType<typeof MediaType.MANGA>>(props);

    base.splice(2, 0, {
        id: "information",
        header: "Information",
        cell: ({ row: { original } }) => {
            return (
                <div className="flex items-center gap-3">
                    <CommonInfoTableCell
                        userMedia={original}
                    />
                    {original.rereadCount > 0 &&
                        <DisplayRedoValue
                            redoValue={original.rereadCount}
                        />
                    }
                </div>
            );
        },
    });

    return base;
};

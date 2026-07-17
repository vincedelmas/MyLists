import {ColumnDef} from "@tanstack/react-table";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {CommonInfoTableCell} from "@/lib/client/components/media/base/CommonInfoTableCell";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";
import {ColumnConfigProps, getBaseColumns} from "@/lib/client/components/media/base/BaseListTable";


export const getTvColumns = <T extends TvMediaType>(props: ColumnConfigProps): ColumnDef<ExtractListByType<T>>[] => {
    const base = getBaseColumns<ExtractListByType<T>>(props);

    base.splice(2, 0, {
        id: "progress",
        header: "Progress",
        cell: ({ row: { original } }) => (
            <DisplayEpsAndSeasons
                status={original.status}
                currentSeason={original.currentSeason}
                currentEpisode={original.currentEpisode}
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
                {original.rewatches.length > 0 && <DisplayTvRedo rewatches={original.rewatches}/>} 
            </div>
        ),
    });

    return base;
};

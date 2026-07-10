import {ColumnDef} from "@tanstack/react-table";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {CommonInfoTableCell} from "@/lib/client/components/media/base/CommonInfoTableCell";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";
import {ColumnConfigProps, getBaseColumns} from "@/lib/client/components/media/base/BaseListTable";


export const getTvColumns = (props: ColumnConfigProps): ColumnDef<ExtractListByType<TvMediaType>>[] => {
    const base = getBaseColumns<ExtractListByType<TvMediaType>>(props);

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
                {original.redo2.reduce((a, c) => a + c, 0) > 0 && <DisplayTvRedo redoValues={original.redo2}/>}
            </div>
        ),
    });

    return base;
};

import {Link} from "@tanstack/react-router";
import {History, Settings2} from "lucide-react";
import {formatDate} from "@/lib/utils/formatting/date";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import type {ActivityPeriod} from "@/lib/schemas/activity.schema";
import {toActivityDisplayValue} from "@/lib/utils/media/activity";
import type {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {formatMinutes, formatNumber} from "@/lib/utils/formatting/number";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {useTable, type ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";


interface MonthlyActivityTableProps {
    canEdit: boolean;
    view: ActivityPeriod;
    showMediaType: boolean;
    rows: MonthlyActivityEditor[];
    onEdit: (row: MonthlyActivityEditor) => void;
    onOccurrences: (row: MonthlyActivityEditor) => void;
}


export function MonthlyActivityTable({ rows, view, canEdit, showMediaType, onEdit, onOccurrences }: MonthlyActivityTableProps) {
    const isYearly = view === "year";
    const showActions = canEdit || isYearly;

    const columns: ColumnDef<typeof mediaTableFeatures, MonthlyActivityEditor>[] = [{
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
    }];

    if (showMediaType) {
        columns.push({
            id: "mediaType",
            header: "Media type",
            cell: ({ row: { original } }) => (
                <span className="flex items-center gap-1.5 capitalize">
                    <MediaTypeIcon mediaType={original.mediaType}/>
                    <MediaTypeText mediaType={original.mediaType}/>
                </span>
            ),
        });
    }

    columns.push(
        {
            id: "progress",
            header: "Progress",
            cell: ({ row: { original } }) => {
                const { unit } = getMediaDefinition(original.mediaType).progress;
                const progress = toActivityDisplayValue(original.mediaType, original.progressGained);

                return <span className="tabular-nums">{formatNumber(progress)} {unit.short}</span>;
            },
        },
        {
            id: "time",
            header: "Time",
            cell: ({ row: { original } }) => <span className="tabular-nums">{formatMinutes(original.timeGained)}</span>,
        },
        {
            id: "activity",
            header: isYearly ? "Latest activity" : "Activity",
            cell: ({ row: { original } }) => {
                const latest = original.occurrences?.[0] ?? original;

                return (
                    <div className="flex items-center gap-1.5">
                        {latest.hidden ?
                            <Badge variant="outline">Hidden</Badge>
                            :
                            <>
                                {latest.hadCompletion &&
                                    <Badge variant="success">Completed</Badge>
                                }
                                {latest.redoGained > 0 && (!isYearly || !latest.hadCompletion) &&
                                    <Badge variant="secondary">
                                        Re-experienced {latest.redoGained > 1 ? `×${latest.redoGained}` : ""}
                                    </Badge>
                                }
                                {latest.progressGained > 0 && (!isYearly || (!latest.hadCompletion && latest.redoGained === 0)) &&
                                    <Badge variant="outline">Progressed</Badge>
                                }
                            </>
                        }
                    </div>
                );
            },
        },
        {
            id: "lastActivityAt",
            header: "Last recorded",
            cell: ({ row: { original } }) => formatDate(original.lastActivityAt),
        },
    );

    if (showActions) {
        columns.push({
            id: "actions",
            header: "Actions",
            cell: ({ row: { original } }) => (
                <div className="flex justify-end">
                    {!isYearly && canEdit &&
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(original)}
                            aria-label={`Edit Monthly Activity for ${original.mediaName}`}
                        >
                            <Settings2 data-icon="inline-start"/>
                            Edit
                        </Button>
                    }
                    {isYearly && original.occurrences && original.occurrences.length > 1 &&
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOccurrences(original)}
                            aria-label={`View yearly activity for ${original.mediaName}`}
                        >
                            <History data-icon="inline-start"/>
                            {original.occurrences.length} months
                        </Button>
                    }
                </div>
            ),
        });
    }

    const table = useTable({
        data: rows,
        columns,
        features: mediaTableFeatures,
        manualPagination: true,
        getRowId: row => String(row.id),
    });

    return <DataTable table={table} ariaLabel="Recorded activity" className="mt-5 min-w-0"/>;
}

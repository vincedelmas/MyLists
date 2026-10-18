import {useState} from "react";
import {capitalize} from "@/lib/utils/formatting/text";
import {getDifficultyColors} from "@/lib/client/theme";
import {AchievementDifficulty} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Award, Pencil, SlidersHorizontal} from "lucide-react";
import type {Achievement} from "@/lib/types/achievements.types";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {type ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";
import {AchievementEditDialog, type AchievementEdit} from "@/lib/client/components/admin/achievements/AchievementEditDialog";


const features = tableFeatures({ rowPaginationFeature });


export function AchievementDirectory({ achievements }: { achievements: Achievement[] }) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState<AchievementEdit | null>(null);
    const { pagination, onPaginationChange } = useTablePagination({ page, pageSize: 25, onPageChange: setPage });

    const query = search.trim().toLowerCase();
    const items = achievements.filter(ach => `${ach.name} ${ach.description} ${ach.mediaType}`.toLowerCase().includes(query));

    const columns: ColumnDef<typeof features, Achievement>[] = [
        {
            accessorKey: "name",
            header: "Achievement",
            cell: ({ row: { original } }) => (
                <div className="flex min-w-56 max-w-96 flex-col gap-1 whitespace-normal">
                    <span className="font-medium">
                        {original.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {original.description}
                    </span>
                </div>
            ),
        },
        {
            header: "Media",
            accessorKey: "mediaType",
            cell: ({ row: { original } }) => (
                <span className="flex items-center gap-2 capitalize">
                    <MainThemeIcon type={original.mediaType}/>
                    {original.mediaType}
                </span>
            ),
        },
        ...Object.values(AchievementDifficulty).map(difficulty => ({
            id: difficulty,
            header: () => (
                <span className={getDifficultyColors(difficulty)}>
                    {capitalize(difficulty)}
                </span>
            ),
            cell: ({ row: { original } }) => {
                const tier = original.tiers.find(tier => tier.difficulty === difficulty);
                return (
                    <span className="tabular-nums">
                        {tier ? formatNumber(tier.criteria.count) : DEFAULT_DASH_FALLBACK}
                    </span>
                );
            },
        } satisfies ColumnDef<typeof features, Achievement>)),
        {
            id: "actions",
            header: "Actions",
            cell: ({ row: { original } }) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Edit details for ${original.name}`}
                        onClick={() => setEditing({ achievement: original, mode: "details" })}
                    >
                        <Pencil data-icon="inline-start"/> Details
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={!original.tiers.length}
                        aria-label={`Edit tiers for ${original.name}`}
                        onClick={() => setEditing({ achievement: original, mode: "tiers" })}
                    >
                        <SlidersHorizontal data-icon="inline-start"/> Tiers
                    </Button>
                </div>
            ),
        },
    ];

    const table = useTable({
        columns,
        features,
        onPaginationChange,
        manualPagination: true,
        rowCount: items.length,
        data: items.slice((page - 1) * 25, page * 25),
        state: { pagination },
    });

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-4" aria-label="Achievement definitions">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SearchInput
                    value={search}
                    className="w-full sm:max-w-80"
                    aria-label="Search achievements"
                    placeholder="Search achievements…"
                    onChange={ev => {
                        setSearch(ev.target.value);
                        setPage(1);
                    }}
                />
                <span className="text-xs text-muted-foreground">
                    {formatNumber(items.length)} of {formatNumber(achievements.length)} achievements
                </span>
            </div>
            <DataTable
                table={table}
                ariaLabel="Achievement definitions"
                emptyMessage={
                    <EmptyState
                        icon={Award}
                        message={query ? "No achievements match your search." : "No achievement definitions yet."}
                    />
                }
            />
            <TablePagination
                table={table}
            />
            {editing &&
                <AchievementEditDialog
                    {...editing}
                    onClose={() => setEditing(null)}
                />
            }
        </section>
    );
}

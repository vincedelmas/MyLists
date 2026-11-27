import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Award, Gem, Lock, Star} from "lucide-react";
import {AchievementCategory} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import type {AdminAchievementRow} from "@/lib/types/achievements.types";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {ACHIEVEMENT_CATEGORY_LABELS, getAchievementRarityTier} from "@/lib/utils/achievements";
import {type ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


const features = tableFeatures({ rowPaginationFeature });


const CATEGORY_OPTIONS = [
    { value: "all", label: "All categories" },
    ...Object.values(AchievementCategory).map((category) => ({
        value: category,
        label: ACHIEVEMENT_CATEGORY_LABELS[category],
    })),
];


export function AchievementDirectory({ achievements }: { achievements: AdminAchievementRow[] }) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const { pagination, onPaginationChange } = useTablePagination({ page, pageSize: 25, onPageChange: setPage });

    const query = search.trim().toLowerCase();
    const items = achievements.filter((ach) => {
        if (categoryFilter !== "all" && ach.category !== categoryFilter) return false;
        if (!query) return true;
        return `${ach.name} ${ach.description} ${ach.codeName} ${ach.category}`.toLowerCase().includes(query);
    });

    const columns: ColumnDef<typeof features, AdminAchievementRow>[] = [
        {
            accessorKey: "name",
            header: "Achievement",
            cell: ({ row: { original } }) => (
                <div className="flex min-w-64 max-w-md items-center gap-3 whitespace-normal">
                    <AchievementBadge
                        unlocked
                        size="xs"
                        icon={original.icon}
                        shape={original.shape}
                        rarity={original.rarity}
                        pattern={original.pattern}
                        category={original.category}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">
                                {original.name}
                            </span>
                            {original.secret &&
                                <Badge variant="outline" className="gap-1 border-brand/40 text-[10px] text-brand">
                                    <Lock className="size-2.5"/>
                                    Secret
                                </Badge>
                            }
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {original.description}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                            {original.codeName}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Category",
            accessorKey: "category",
            cell: ({ row: { original } }) => (
                <Badge variant="outline">
                    {ACHIEVEMENT_CATEGORY_LABELS[original.category]}
                </Badge>
            ),
        },
        {
            header: "Target",
            accessorKey: "target",
            cell: ({ row: { original } }) => (
                <span className="tabular-nums">{formatNumber(original.target)}</span>
            ),
        },
        {
            header: "Unlocked",
            accessorKey: "unlockedCount",
            cell: ({ row: { original } }) => (
                <span className="tabular-nums">
                    {formatNumber(original.unlockedCount)}
                    <span className="text-muted-foreground"> / {formatNumber(original.eligibleUsers)}</span>
                </span>
            ),
        },
        {
            header: "Rarity",
            accessorKey: "rarity",
            cell: ({ row: { original } }) => {
                const tier = getAchievementRarityTier(original.rarity);
                const hasRarity = original.rarity !== null && original.rarity > 0;
                return (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 font-semibold tabular-nums",
                            tier === "ultra" && hasRarity && "text-platinum",
                            tier === "rare" && hasRarity && "text-gold",
                            !hasRarity && "text-muted-foreground",
                        )}
                    >
                        {tier === "ultra" && hasRarity && <Gem className="size-3"/>}
                        {tier === "rare" && hasRarity && <Star className="size-3 fill-current"/>}
                        {hasRarity ? formatPercent(original.rarity) : "0%"}
                    </span>
                );
            },
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
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-4" aria-label="Achievement analytics">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 max-sm:w-full">
                    <SearchInput
                        value={search}
                        className="w-full sm:w-72"
                        aria-label="Search achievements"
                        placeholder="Search by name, description, or code…"
                        onChange={(ev) => {
                            setSearch(ev.target.value);
                            setPage(1);
                        }}
                    />
                    <Select
                        items={CATEGORY_OPTIONS}
                        value={categoryFilter}
                        onValueChange={(value) => {
                            if (value) {
                                setCategoryFilter(value);
                                setPage(1);
                            }
                        }}
                    >
                        <SelectTrigger aria-label="Filter by category" className="w-44">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {CATEGORY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <span className="text-xs text-muted-foreground">
                    {formatNumber(items.length)} of {formatNumber(achievements.length)} achievements
                </span>
            </div>
            <DataTable
                table={table}
                ariaLabel="Achievement catalog analytics"
                emptyMessage={
                    <EmptyState
                        icon={Award}
                        message={query || categoryFilter !== "all" ? "No achievements match your filter." : "No achievements seeded yet. Click Sync catalog above."}
                    />
                }
            />
            <TablePagination table={table}/>
        </section>
    );
}

import {X} from "lucide-react";
import {Fragment} from "react";
import {MediaType} from "@/lib/utils/enums";
import type {MediaListArgs} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";
import {getMediaFilterDefinitions, getMediaFilterGroups} from "@/lib/client/components/media/browse/media-filter.utils";


export type MediaBrowseFilterKey = Exclude<keyof MediaBrowseFilters, "page" | "sorting">;


export type MediaBrowseFilterScope = {
    mediaType: MediaType;
    field: MediaMetadataFilterKey;
};


interface AppliedFilterGroup {
    key: string;
    label: string;
    alternatives?: boolean;
    items: {
        key: string;
        label: string;
        removeLabel: string;
        onRemove: () => void;
    }[];
}


interface AppliedFiltersProps {
    total: number;
    page?: number;
    canReset: boolean;
    totalPages: number;
    itemLabel?: string;
    resetLabel: string;
    onReset: () => void;
    groups: AppliedFilterGroup[];
}


const AppliedFilters = (props: AppliedFiltersProps) => {
    const { page = 1, total, totalPages, itemLabel, groups, resetLabel, canReset, onReset } = props;

    return (
        <div className="flex min-h-6 items-center justify-between gap-3" role="group" aria-label="Browsing results and filters">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex h-6 shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatNumber(total)}
                    </span>
                    {" "}{itemLabel ?? (total === 1 ? "title" : "titles")}
                </span>

                {groups.length > 0 && <span className="h-4 shrink-0 border-l" aria-hidden="true"/>}

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                    {groups.map(group =>
                        <div key={group.key} className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {group.label}
                            </span>
                            {group.items.map((item, index) =>
                                <Fragment key={item.key}>
                                    <Badge variant="outline" className="h-auto max-w-full">
                                        <span className="truncate">
                                            {item.label}
                                        </span>
                                        <Button
                                            size="bare"
                                            type="button"
                                            variant="ghost"
                                            onClick={item.onRemove}
                                            aria-label={item.removeLabel}
                                        >
                                            <X data-icon="inline-end" aria-hidden="true"/>
                                        </Button>
                                    </Badge>

                                    {group.alternatives && index < group.items.length - 1 &&
                                        <span className="px-0.5 text-[10px] font-medium text-muted-foreground">
                                            OR
                                        </span>
                                    }
                                </Fragment>
                            )}
                        </div>
                    )}

                    {canReset &&
                        <Button size="xs" type="button" variant="ghost" onClick={onReset} className="-ml-1.5">
                            {resetLabel}
                        </Button>
                    }
                </div>
            </div>

            {totalPages > 1 &&
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    Page {page} / {totalPages}
                </span>
            }
        </div>
    );
};


interface BrowseAppliedFiltersProps {
    total: number;
    totalPages: number;
    itemLabel?: string;
    onReset: () => void;
    filters: MediaBrowseFilters;
    additionalGroups?: AppliedFilterGroup[];
    onRemove: (key: MediaBrowseFilterKey, value?: string, scope?: MediaBrowseFilterScope) => void;
}


export const BrowseAppliedFilters = (props: BrowseAppliedFiltersProps) => {
    const { filters, total, totalPages, itemLabel, onRemove, onReset, additionalGroups = [] } = props;
    const groups: AppliedFilterGroup[] = [];

    if (filters.search) {
        groups.push({
            key: "search",
            label: "Search",
            items: [{
                key: "search",
                label: filters.search,
                onRemove: () => onRemove("search"),
                removeLabel: `Remove Search: ${filters.search}`,
            }],
        });
    }

    if (filters.mediaType) {
        const label = filters.mediaType === "series" ? "TV series" : capitalize(filters.mediaType);

        groups.push({
            key: "mediaType", label: "Type", items: [{
                key: "mediaType", label, removeLabel: `Remove ${filters.mediaType === "series" ? "TV series" : filters.mediaType}`,
                onRemove: () => onRemove("mediaType"),
            }],
        });
    }

    if (filters.status) {
        groups.push({
            key: "status", label: "Status", items: [{
                key: "status", label: capitalize(filters.status), removeLabel: `Remove ${filters.status}`,
                onRemove: () => onRemove("status"),
            }],
        });
    }

    if (filters.library) {
        const label = filters.library === "in" ? "In my list" : "Not in my list";
        groups.push({
            key: "library", label: "List", items: [{
                key: "library", label, removeLabel: `Remove ${label}`, onRemove: () => onRemove("library"),
            }],
        });
    }

    for (const key of ["genres", "tags"] as const) {
        if (filters[key]?.length) {
            groups.push({
                key, label: key, alternatives: true,
                items: filters[key].map(value => ({
                    key: value, label: value, removeLabel: `Remove ${key === "genres" ? "Genre" : "Tag"}: ${value}`,
                    onRemove: () => onRemove(key, value),
                })),
            });
        }
    }

    if (filters.favorite) {
        groups.push({
            key: "favorite", label: "Misc", items: [{
                key: "favorite", label: "Favorites", removeLabel: "Remove Favorites only", onRemove: () => onRemove("favorite"),
            }],
        });
    }

    if (filters.comment) {
        groups.push({
            key: "comment", label: "Misc", items: [{
                key: "comment", label: "Commented", removeLabel: "Remove Comments only", onRemove: () => onRemove("comment"),
            }],
        });
    }

    for (const group of getMediaFilterGroups(filters.mediaFilters)) {
        groups.push({
            key: `${group.mediaType}.${group.field}`,
            label: group.label,
            alternatives: true,
            items: group.items.map(item => ({
                key: item.value,
                label: item.label,
                removeLabel: `Remove ${group.label}: ${item.label}`,
                onRemove: () => onRemove("mediaFilters", item.value, { mediaType: group.mediaType, field: group.field }),
            })),
        });
    }

    if (filters.minRating !== undefined) {
        const label = `Rated at least ${filters.minRating} / 10`;
        groups.push({
            key: "minRating", label: "Rating", items: [{
                key: "minRating", label, removeLabel: `Remove ${label}`, onRemove: () => onRemove("minRating"),
            }],
        });
    }

    groups.push(...additionalGroups);

    return (
        <AppliedFilters
            total={total}
            groups={groups}
            onReset={onReset}
            page={filters.page}
            itemLabel={itemLabel}
            totalPages={totalPages}
            resetLabel="Reset filters"
            canReset={groups.length > 0 || (filters.sorting !== undefined && filters.sorting !== "default")}
        />
    );
};


interface ListAppliedFiltersProps {
    totalItems: number;
    totalPages: number;
    mediaType: MediaType;
    filters: MediaListArgs & { view?: "grid" | "list" };
    onFilterRemove: (filters: Partial<MediaListArgs>) => void;
}


export const ListAppliedFilters = ({ mediaType, filters, totalItems, totalPages, onFilterRemove }: ListAppliedFiltersProps) => {
    const {
        page,
        view: _view,
        status: _status,
        search: _search,
        userId: _userId,
        perPage: _perPage,
        sorting: _sorting,
        currentUserId: _currentUserId,
        ...rawFilters
    } = filters;

    const groups: AppliedFilterGroup[] = [];
    const resetFilters: Partial<MediaListArgs> = {};
    const miscItems: AppliedFilterGroup["items"] = [];
    const metadataFilters = getMediaFilterDefinitions(mediaType);

    for (const [key, value] of Object.entries(rawFilters)) {
        const filterKey = key as keyof typeof rawFilters;

        if (Array.isArray(value) && value.length > 0) {
            resetFilters[filterKey] = undefined;
            const definition = metadataFilters.find(filter => filter.key === key);

            groups.push({
                key,
                label: key,
                alternatives: true,
                items: value.map(item => ({
                    key: item,
                    removeLabel: `Remove ${item} filter`,
                    onRemove: () => onFilterRemove({ [filterKey]: [item] }),
                    label: definition?.render ? definition.render(item) : capitalize(item),
                })),
            });
        }
        else if (value === true) {
            resetFilters[filterKey] = undefined;

            const label = key === "favorite"
                ? "Favorites"
                : key === "comment"
                    ? "Commented"
                    : "No Common";

            miscItems.push({
                key,
                label,
                removeLabel: `Remove ${label} filter`,
                onRemove: () => onFilterRemove({ [filterKey]: false }),
            });
        }
    }

    if (miscItems.length > 0) {
        groups.push({ key: "misc", label: "Misc", items: miscItems });
    }

    return (
        <AppliedFilters
            page={page}
            groups={groups}
            total={totalItems}
            resetLabel="Clear all"
            totalPages={totalPages}
            canReset={groups.length > 0}
            itemLabel={capitalize(mediaType)}
            onReset={() => onFilterRemove({ ...resetFilters, search: "" })}
        />
    );
};

import {X} from "lucide-react";
import {Fragment} from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaListArgs} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/number-formatting";
import {capitalize, formatLocaleName} from "@/lib/utils/text-formatting";


interface AppliedFiltersProps {
    totalItems: number;
    mediaType: MediaType;
    filters: MediaListArgs & { view?: "grid" | "list" };
    onFilterRemove: (filters: Partial<MediaListArgs>) => void;
}


export const AppliedFilters = ({ mediaType, filters, totalItems, onFilterRemove }: AppliedFiltersProps) => {
    const { page: _p, sorting: _s, status: _st, search: _se, view: _v, ...rawFilters } = filters;

    const booleanKeys = ["favorite", "comment", "hideCommon"];
    const localFilters = rawFilters as Partial<MediaListArgs>;
    const miscFilters = Object.entries(localFilters).filter(([key]) => booleanKeys.includes(key));
    const normalFilters = Object.entries(localFilters).filter(([key]) => !booleanKeys.includes(key));
    const hasFilters = Object.keys(localFilters).length > 0;

    const removeFilter = <K extends keyof MediaListArgs>(filterKey: K, filterValue: any) => {
        onFilterRemove({ [filterKey]: Array.isArray(localFilters[filterKey]) ? [filterValue] : null });
    };

    const removeAllFilters = () => {
        const resetFilters = Object.keys(localFilters).reduce<Partial<MediaListArgs>>((acc, key) => {
            const typedKey = key as keyof MediaListArgs;

            if (Array.isArray(localFilters[typedKey])) {
                acc[typedKey] = [] as any;
            }
            else {
                acc[typedKey] = undefined;
            }
            return acc;
        }, {});

        onFilterRemove({ ...resetFilters, search: "" });
    };

    return (
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 py-4">
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatNumber(totalItems)}
                </span>
                <span className="text-xs text-muted-foreground">
                    {capitalize(mediaType)}
                </span>
            </div>
            {hasFilters && <div className="h-4 w-px bg-border" aria-hidden="true"/>}
            {normalFilters.map(([key, value]) =>
                <div key={key} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {key}
                    </span>

                    {Array.isArray(value)
                        ? value.map((item, index) =>
                            <Fragment key={`${key}-${item}`}>
                                <Badge variant="outline" className="capitalize">
                                    {key === "langs"
                                        ? formatLocaleName(
                                            item,
                                            mediaType === MediaType.SERIES || mediaType === MediaType.ANIME ? "region" : "language"
                                        )
                                        : item
                                    }
                                    <Button
                                        size="bare"
                                        type="button"
                                        variant="ghost"
                                        aria-label={`Remove ${String(item)} filter`}
                                        onClick={() => removeFilter(key as keyof MediaListArgs, item)}
                                    >
                                        <X className="size-3"/>
                                    </Button>
                                </Badge>
                                {index < value.length - 1 &&
                                    <span className="px-0.5 text-[10px] font-medium text-muted-foreground">OR</span>
                                }
                            </Fragment>
                        )
                        :
                        <Badge variant="outline" className="capitalize">
                            {String(value)}
                            <Button
                                size="bare"
                                type="button"
                                variant="ghost"
                                aria-label={`Remove ${key} filter`}
                                onClick={() => removeFilter(key as keyof MediaListArgs, value)}
                            >
                                <X className="size-3"/>
                            </Button>
                        </Badge>
                    }
                </div>
            )}

            {miscFilters.length > 0 &&
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Misc
                    </span>
                    {miscFilters.map(([key, value]) => {
                        if (value !== true) return null;

                        const keyName = key === "favorite" ? "Favorites" : key === "comment" ? "Commented"
                            : key === "hideCommon" ? "No Common" : String(value);

                        return (
                            <Badge key={key} variant="outline">
                                {keyName}
                                <Button
                                    size="bare"
                                    type="button"
                                    variant="ghost"
                                    aria-label={`Remove ${keyName} filter`}
                                    onClick={() => removeFilter(key as keyof MediaListArgs, value)}
                                >
                                    <X className="size-3"/>
                                </Button>
                            </Badge>
                        );
                    })}
                </div>
            }

            {hasFilters &&
                <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={removeAllFilters}
                    className="text-xs text-muted-foreground"
                >
                    Clear all
                </Button>
            }
        </div>
    );
};

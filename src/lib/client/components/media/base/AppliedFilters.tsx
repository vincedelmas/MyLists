import {X} from "lucide-react";
import {Fragment} from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaListArgs} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
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
        <div className="flex flex-wrap items-center gap-2 min-h-10.5 my-4">
            <div className="text-muted-foreground">
                {totalItems} {capitalize(mediaType)}
            </div>
            {Object.keys(localFilters).length > 0 &&
                <div className="text-muted-foreground ml-2 mr-2">|</div>
            }
            <>
                {normalFilters.map(([key, value]) =>
                    <div key={key} className="flex items-center flex-wrap gap-1 rounded-md border border-border/30
                        px-2 py-1 bg-muted/10 shadow-sm">
                        <div className="mr-1 capitalize text-sm font-medium text-muted-foreground">
                            {key}
                        </div>

                        <div className="flex items-center flex-wrap gap-1">
                            {Array.isArray(value) ?
                                value.map((item, i) =>
                                    <Fragment key={`${key}-${item}`}>
                                        <Badge
                                            variant="secondary"
                                            className="h-8 px-3 text-sm gap-1 rounded-full border border-border/50
                                            bg-secondary hover:bg-secondary/90 transition max-w-50"
                                        >
                                            {key === "langs" ? formatLocaleName(
                                                    item,
                                                    mediaType === MediaType.SERIES || mediaType === MediaType.ANIME ? "region" : "language"
                                                )
                                                : item
                                            }
                                            <div
                                                role="button"
                                                className="hover:opacity-80 -mr-1"
                                                onClick={() => removeFilter(key as keyof MediaListArgs, item)}
                                            >
                                                <X className="size-4"/>
                                            </div>
                                        </Badge>
                                        {i < value.length - 1 &&
                                            <span className="text-muted-foreground text-xs font-medium px-1.5">
                                                OR
                                            </span>
                                        }
                                    </Fragment>
                                )
                                :
                                <Badge
                                    variant="secondary"
                                    className="h-8 px-3 text-sm gap-1 rounded-full border border-border/50 bg-secondary
                                        hover:bg-secondary/90 transition"
                                >
                                    {String(value)}
                                    <div
                                        role="button"
                                        className="hover:opacity-80 -mr-1"
                                        onClick={() => removeFilter(key as keyof MediaListArgs, value)}
                                    >
                                        <X className="size-4"/>
                                    </div>
                                </Badge>
                            }
                        </div>
                    </div>
                )}
                {miscFilters.length > 0 &&
                    <div className="flex items-center flex-wrap gap-1 rounded-md border border-border/30 px-2 py-1 bg-muted/10 shadow-sm">
                        <div className="mr-1 capitalize text-sm font-medium text-muted-foreground">
                            misc
                        </div>

                        <div className="flex items-center flex-wrap gap-1">
                            {miscFilters.map(([key, value]) => {
                                if (value !== true) return null;

                                const keyName = key === "favorite" ? "Favorites" : key === "comment" ? "Commented"
                                    : key === "hideCommon" ? "No Common" : String(value);

                                return (
                                    <Badge
                                        key={key}
                                        variant="secondary"
                                        className="h-8 px-3 text-sm gap-1 rounded-full border border-border/50 bg-secondary
                                        hover:bg-secondary/90 transition"
                                    >
                                        {keyName}
                                        <div
                                            role="button"
                                            className="hover:opacity-80 -mr-1"
                                            onClick={() => removeFilter(key as keyof MediaListArgs, value)}
                                        >
                                            <X className="size-4"/>
                                        </div>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                }
                {Object.keys(localFilters).length > 0 &&
                    <div role="button" className="ml-2" onClick={() => removeAllFilters()}>
                        <div className="text-muted-foreground">
                            Clear All
                        </div>
                    </div>
                }
            </>
        </div>
    );
};

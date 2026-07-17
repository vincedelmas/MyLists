import {X} from "lucide-react";
import type {MediaListArgs} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {capitalize, formatLocaleName} from "@/lib/utils/text-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";


interface AppliedFiltersProps {
    totalItems: number;
    mediaType: MediaType;
    filters: MediaListArgs & { view?: "grid" | "list" };
    onFilterRemove: (filters: Partial<MediaListArgs>) => void;
}


export const AppliedFilters = ({ mediaType, filters, totalItems, onFilterRemove }: AppliedFiltersProps) => {
    const hasMiscFilters = filters.favorite === true || filters.comment === true || filters.hideCommon === true;
    const hasArrayFilters = [
        filters.genres,
        filters.tags,
        filters.langs,
        filters.directors,
        filters.publishers,
        filters.actors,
        filters.authors,
        filters.companies,
        filters.networks,
        filters.creators,
        filters.platforms,
    ].some((values) => values && values.length > 0);
    const hasFilters = hasMiscFilters || hasArrayFilters;

    const removeAllFilters = () => onFilterRemove({
        search: "",
        favorite: false,
        comment: false,
        hideCommon: false,
        genres: [],
        tags: [],
        langs: [],
        directors: [],
        publishers: [],
        actors: [],
        authors: [],
        companies: [],
        networks: [],
        creators: [],
        platforms: [],
    });

    return (
        <div className="flex flex-wrap items-center gap-2 min-h-10.5 my-4">
            <div className="text-muted-foreground">
                {totalItems} {capitalize(mediaType)}
            </div>
            {hasFilters && <div className="text-muted-foreground ml-2 mr-2">|</div>}

            <AppliedValueGroup title="genres" values={filters.genres}
                onRemove={(value) => onFilterRemove({ genres: [value] })}/>
            <AppliedValueGroup title="tags" values={filters.tags}
                onRemove={(value) => onFilterRemove({ tags: [value] })}/>
            <AppliedValueGroup
                title="langs"
                values={filters.langs}
                formatValue={(value) => formatLocaleName(
                    value,
                    mediaType === MediaType.SERIES || mediaType === MediaType.ANIME ? "region" : "language",
                )}
                onRemove={(value) => onFilterRemove({ langs: [value] })}
            />
            <AppliedValueGroup title="directors" values={filters.directors}
                onRemove={(value) => onFilterRemove({ directors: [value] })}/>
            <AppliedValueGroup title="publishers" values={filters.publishers}
                onRemove={(value) => onFilterRemove({ publishers: [value] })}/>
            <AppliedValueGroup title="actors" values={filters.actors}
                onRemove={(value) => onFilterRemove({ actors: [value] })}/>
            <AppliedValueGroup title="authors" values={filters.authors}
                onRemove={(value) => onFilterRemove({ authors: [value] })}/>
            <AppliedValueGroup title="companies" values={filters.companies}
                onRemove={(value) => onFilterRemove({ companies: [value] })}/>
            <AppliedValueGroup title="networks" values={filters.networks}
                onRemove={(value) => onFilterRemove({ networks: [value] })}/>
            <AppliedValueGroup title="creators" values={filters.creators}
                onRemove={(value) => onFilterRemove({ creators: [value] })}/>
            <AppliedValueGroup title="platforms" values={filters.platforms}
                onRemove={(value) => onFilterRemove({ platforms: [value] })}/>

            {hasMiscFilters &&
                <div className="flex items-center flex-wrap gap-1 rounded-md border border-border/30 px-2 py-1 bg-muted/10 shadow-sm">
                    <div className="mr-1 capitalize text-sm font-medium text-muted-foreground">misc</div>
                    <div className="flex items-center flex-wrap gap-1">
                        {filters.favorite === true &&
                            <AppliedBooleanBadge label="Favorites" onRemove={() => onFilterRemove({ favorite: false })}/>
                        }
                        {filters.comment === true &&
                            <AppliedBooleanBadge label="Commented" onRemove={() => onFilterRemove({ comment: false })}/>
                        }
                        {filters.hideCommon === true &&
                            <AppliedBooleanBadge label="No Common" onRemove={() => onFilterRemove({ hideCommon: false })}/>
                        }
                    </div>
                </div>
            }

            {hasFilters &&
                <Button type="button" size="bare" variant="invisible" onClick={removeAllFilters}
                    className="ml-2 text-muted-foreground">
                    Clear All
                </Button>
            }
        </div>
    );
};


interface AppliedValueGroupProps<T extends string> {
    title: string;
    values?: T[];
    formatValue?: (value: T) => string;
    onRemove: (value: T) => void;
}


const AppliedValueGroup = <T extends string,>({ title, values, formatValue, onRemove }: AppliedValueGroupProps<T>) => {
    if (!values || values.length === 0) return null;

    return (
        <div className="flex items-center flex-wrap gap-1 rounded-md border border-border/30 px-2 py-1 bg-muted/10 shadow-sm">
            <div className="mr-1 capitalize text-sm font-medium text-muted-foreground">{title}</div>
            <div className="flex items-center flex-wrap gap-1">
                {values.map((value, index) =>
                    <div key={value} className="contents">
                        <Badge
                            variant="secondary"
                            className="h-8 px-3 text-sm gap-1 rounded-full border border-border/50 bg-secondary hover:bg-secondary/90 transition max-w-50"
                        >
                            {formatValue ? formatValue(value) : value}
                            <Button type="button" size="iconBare" variant="invisible" className="hover:opacity-80 -mr-1"
                                onClick={() => onRemove(value)}>
                                <X className="size-4"/>
                            </Button>
                        </Badge>
                        {index < values.length - 1 &&
                            <span className="text-muted-foreground text-xs font-medium px-1.5">OR</span>
                        }
                    </div>
                )}
            </div>
        </div>
    );
};


interface AppliedBooleanBadgeProps {
    label: string;
    onRemove: () => void;
}


const AppliedBooleanBadge = ({ label, onRemove }: AppliedBooleanBadgeProps) => (
    <Badge
        variant="secondary"
        className="h-8 px-3 text-sm gap-1 rounded-full border border-border/50 bg-secondary hover:bg-secondary/90 transition"
    >
        {label}
        <Button type="button" size="iconBare" variant="invisible" className="hover:opacity-80 -mr-1" onClick={onRemove}>
            <X className="size-4"/>
        </Button>
    </Badge>
);

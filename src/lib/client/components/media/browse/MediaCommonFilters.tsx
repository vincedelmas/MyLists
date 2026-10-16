import type {MediaCommonFilterKey, MediaCommonFilters} from "@/lib/media-definitions/definition.registry";
import {MediaFilterCheckbox, MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


interface MediaGenreFilterProps {
    availableFilters: ReadonlySet<MediaCommonFilterKey>;
    options: readonly string[];
    selected: readonly string[];
    maxSelected?: number;
    onChange: (genres: string[]) => void;
}


export const MediaGenreFilter = ({ availableFilters, options, selected, maxSelected, onChange }: MediaGenreFilterProps) => availableFilters.has("genres") && (
    <MediaFilterCheckboxGroup
        title="Genres"
        items={options}
        selected={selected}
        maxSelected={maxSelected}
        onChange={onChange}
    />
);


type PersonalFilters = Pick<MediaCommonFilters, "favorite" | "comment">;


interface MediaPersonalFiltersProps {
    availableFilters: ReadonlySet<MediaCommonFilterKey>;
    filters: PersonalFilters;
    favoriteLabel?: string;
    commentLabel?: string;
    onChange: (filters: PersonalFilters) => void;
}


export const MediaPersonalFilters = ({ availableFilters, filters, favoriteLabel = "Favorites", commentLabel = "Comments", onChange }: MediaPersonalFiltersProps) => (
    <>
        {availableFilters.has("favorite") &&
            <MediaFilterCheckbox
                label={favoriteLabel}
                checked={filters.favorite ?? false}
                onChange={checked => onChange({ favorite: checked ? true : undefined })}
            />
        }
        {availableFilters.has("comment") &&
            <MediaFilterCheckbox
                label={commentLabel}
                checked={filters.comment ?? false}
                onChange={checked => onChange({ comment: checked ? true : undefined })}
            />
        }
    </>
);

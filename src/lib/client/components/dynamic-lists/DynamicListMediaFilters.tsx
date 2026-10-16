import type {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import type {IdNamePair} from "@/lib/types/media-common.types";
import {FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import type {ScopedMediaFilterOptions} from "@/lib/types/media-list.types";
import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import {MediaSpecificFilters} from "@/lib/client/components/media/browse/MediaSpecificFilters";
import {DynamicListTagFilters} from "@/lib/client/components/dynamic-lists/DynamicListTagFilters";
import {DynamicListEditorSection} from "@/lib/client/components/dynamic-lists/DynamicListEditorFields";
import {MediaFilterCheckboxGroup} from "@/lib/client/components/media/browse/MediaFilterCheckboxGroup";


type DynamicListMediaFilterValues = NonNullable<NonNullable<DynamicListSpec["filters"]["mediaFilters"]>[MediaType]>;


interface DynamicListMediaFiltersProps {
    username: string;
    disabled: boolean;
    mediaType: MediaType;
    optionsError: boolean;
    onRetryOptions: () => void;
    errors: Record<string, string>;
    tagNames: Record<number, string>;
    filters: DynamicListMediaFilterValues;
    options?: ScopedMediaFilterOptions<IdNamePair>[MediaType];
    onChange: (filters: Partial<DynamicListMediaFilterValues>) => void;
}


export const DynamicListMediaFilters = (props: DynamicListMediaFiltersProps) => {
    const { username, mediaType, filters, options, tagNames, errors, disabled, optionsError, onRetryOptions, onChange } = props;

    const errorPrefix = `filters.mediaFilters.${mediaType}.`;
    const scopedErrors = Object.fromEntries(Object.entries(errors)
        .filter(([key]) => key.startsWith(errorPrefix))
        .map(([key, error]) => [key.slice(errorPrefix.length), error]));

    return (
        <FieldSet>
            <FieldLegend variant="label" className="sr-only capitalize">
                {capitalize(mediaType)}
            </FieldLegend>
            <DynamicListEditorSection
                title="Media rules"
                description="These rules apply only to this media type. Other types keep their own rules."
            >
                <MediaFilterCheckboxGroup
                    title="Genres"
                    disabled={disabled}
                    error={scopedErrors.genres}
                    selected={filters.genres ?? []}
                    maxSelected={MAX_MEDIA_FILTER_VALUES}
                    items={options?.genres?.map(item => item.name) ?? []}
                    onChange={genres => onChange({ genres: genres.length ? genres : undefined })}
                />

                <DynamicListTagFilters
                    disabled={disabled}
                    tagNames={tagNames}
                    errors={scopedErrors}
                    options={options?.tags ?? []}
                    onChange={tagRules => onChange({ tagRules })}
                    rules={filters.tagRules?.length ? filters.tagRules : undefined}
                />

                <MediaSpecificFilters
                    filters={filters}
                    disabled={disabled}
                    onChange={onChange}
                    errors={scopedErrors}
                    mediaType={mediaType}
                    options={options ?? {}}
                    maxSelected={MAX_MEDIA_FILTER_VALUES}
                    searchSource={{ type: "tracking", username }}
                />

                {optionsError &&
                    <Alert variant="destructive">
                        <AlertDescription>
                            We couldn’t load filter options.
                            <Button size="sm" type="button" variant="ghost" onClick={onRetryOptions}>
                                Try again
                            </Button>
                        </AlertDescription>
                    </Alert>
                }
            </DynamicListEditorSection>
        </FieldSet>
    );
};

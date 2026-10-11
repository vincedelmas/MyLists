import {MediaType, Status} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Separator} from "@/lib/client/components/ui/separator";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import {MediaFilterSearch} from "@/lib/client/components/media/browse/MediaFilterSearch";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {DYNAMIC_LIST_STATUS_OPTIONS} from "@/lib/client/components/dynamic-lists/dynamic-list.config";
import {createMediaBrowseStatusOptions} from "@/lib/client/components/media/browse/media-browse.config";
import {DynamicListEditorSection, DynamicListEditorSelect} from "@/lib/client/components/dynamic-lists/DynamicListEditorFields";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


interface DynamicListCommonFiltersProps {
    fieldId: string;
    disabled: boolean;
    optionsError: boolean;
    genreOptions: string[];
    optionsLoading: boolean;
    onRetryOptions: () => void;
    errors: Record<string, string>;
    mediaTypes: readonly MediaType[];
    filters: DynamicListSpec["filters"];
    onChange: (filters: Partial<DynamicListSpec["filters"]>) => void;
}


export const DynamicListCommonFilters = (props: DynamicListCommonFiltersProps) => {
    const { fieldId, filters, mediaTypes, errors, disabled, genreOptions, optionsLoading, optionsError, onRetryOptions, onChange } = props;

    const availableFilters = getMediaCommonFilterKeys(mediaTypes);
    const statuses = [...new Set([
        ...createMediaBrowseStatusOptions(mediaTypes).flatMap(option => option.value === "all" ? [] : [option.value]),
        ...(filters.statuses ?? []),
    ])];

    const handleStatusChange = (status: Status, checked: boolean) => {
        const statuses = checked
            ? [...(filters.statuses ?? []), status]
            : filters.statuses?.filter(value => value !== status);

        onChange({ statuses: statuses?.length ? statuses : undefined, statusGroup: undefined });
    };

    return (
        <FieldGroup>
            <DynamicListEditorSection number="02" title="Progress & rating" description="Bring together your plans, ongoing titles or finished favorites.">
                <FieldGroup className="grid sm:grid-cols-2">
                    {availableFilters.has("status") &&
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-status`}>
                                Status
                            </FieldLabel>
                            <DynamicListEditorSelect
                                id={`${fieldId}-status`}
                                value={filters.statusGroup ?? "any"}
                                options={DYNAMIC_LIST_STATUS_OPTIONS}
                                onChange={value => onChange({
                                    statuses: undefined,
                                    statusGroup: value === "any" ? undefined : value as DynamicListSpec["filters"]["statusGroup"]
                                })}
                            />
                        </Field>
                    }
                    {(["favorite", "rated", "hasComment"] as const)
                        .filter(key => availableFilters.has(key === "rated" ? "minRating" : key === "hasComment" ? "comment" : key))
                        .map(key =>
                            <Field key={key}>
                                <FieldLabel htmlFor={`${fieldId}-${key}`}>
                                    {key === "favorite" ? "Favorites" : key === "rated" ? "Rating state" : "Comments"}
                                </FieldLabel>
                                <DynamicListEditorSelect
                                    id={`${fieldId}-${key}`}
                                    value={filters[key] === undefined ? "any" : String(filters[key])}
                                    onChange={value => onChange({ [key]: value === "any" ? undefined : value === "true" })}
                                    options={[
                                        { value: "any", label: "All titles" },
                                        {
                                            value: "true", label: key === "favorite"
                                                ? "Favorites only" : key === "rated"
                                                    ? "Rated only" : "With a comment"
                                        },
                                        {
                                            value: "false",
                                            label: key === "favorite" ? "Exclude favorites" : key === "rated"
                                                ? "Unrated only"
                                                : "Without a comment"
                                        },
                                    ]}
                                />
                            </Field>
                        )}
                    {availableFilters.has("minRating") && (["minRating", "maxRating"] as const).map((key, idx) =>
                        <Field key={key} data-invalid={!!errors[`filters.${key}`]}>
                            <FieldLabel htmlFor={`${fieldId}-${key}`}>
                                {idx === 0 ? "Minimum rating / 10" : "Maximum rating / 10"}
                            </FieldLabel>

                            <Input
                                id={`${fieldId}-${key}`}
                                value={filters[key] ?? ""}
                                type="number" min={0} max={10} step={0.5}
                                aria-invalid={!!errors[`filters.${key}`]}
                                placeholder={idx === 0 ? "No minimum" : "No maximum"}
                                onChange={ev => onChange({ [key]: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                            />

                            <FieldError>{errors[`filters.${key}`]}</FieldError>
                        </Field>
                    )}
                </FieldGroup>
                {availableFilters.has("status") &&
                    <details className="rounded-lg border px-4 py-3" open={!!filters.statuses?.length}>
                        <summary className="cursor-pointer text-sm font-medium">
                            Choose specific statuses
                        </summary>
                        <FieldSet className="pt-4">
                            <FieldLegend className="sr-only">
                                Specific statuses
                            </FieldLegend>
                            <FieldDescription>
                                Match any selected status. Selecting one replaces the status group above.
                            </FieldDescription>
                            <FieldGroup className="grid grid-cols-2 gap-3">
                                {statuses.map((status, index) =>
                                    <Field key={status} orientation="horizontal">
                                        <Checkbox
                                            id={`${fieldId}-status-${index}`}
                                            checked={filters.statuses?.includes(status) ?? false}
                                            onCheckedChange={checked => handleStatusChange(status, checked)}
                                        />
                                        <FieldLabel htmlFor={`${fieldId}-status-${index}`}>
                                            {status}
                                        </FieldLabel>
                                    </Field>
                                )}
                            </FieldGroup>
                            <FieldError>{errors["filters.statuses"]}</FieldError>
                        </FieldSet>
                    </details>
                }
            </DynamicListEditorSection>

            {filters.genres?.length ?
                <FieldSet className="rounded-xl border p-4">
                    <FieldLegend variant="label">
                        Rules across all types
                    </FieldLegend>
                    <FieldDescription>
                        These existing genre rules apply to every media type.
                    </FieldDescription>

                    {availableFilters.has("genres") &&
                        <MediaFilterSearch
                            label="Genres"
                            value={filters.genres}
                            options={genreOptions}
                            error={errors["filters.genres"]}
                            maxSelected={MAX_MEDIA_FILTER_VALUES}
                            disabled={disabled || optionsLoading}
                            onChange={values => onChange({ genres: values.length ? values : undefined })}
                        />
                    }

                    {optionsError &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                We couldn’t load filter options. Your selections are still here.{" "}
                                <Button type="button" variant="ghost" size="sm" onClick={onRetryOptions}>
                                    Try again
                                </Button>
                            </AlertDescription>
                        </Alert>
                    }
                </FieldSet>
                :
                null
            }

            <DynamicListEditorSection number="03" title="Dates & time" description="Find older plans, recent additions or titles from a particular era.">
                <FieldGroup className="grid sm:grid-cols-2">
                    {([
                        { key: "addedBefore", label: "Added more than … months ago" },
                        { key: "addedWithin", label: "Added within … months" },
                        { key: "updatedBefore", label: "Not updated for … months" },
                    ] as const).map(({ key, label }) =>
                        <Field key={key} data-invalid={!!(errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`])}>
                            <FieldLabel htmlFor={`${fieldId}-${key}`}>
                                {label}
                            </FieldLabel>
                            <Input
                                placeholder="Any time"
                                id={`${fieldId}-${key}`}
                                value={filters[key]?.monthsAgo ?? ""}
                                type="number" min={1} max={120} step={1}
                                aria-invalid={!!(errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`])}
                                onChange={ev => onChange({ [key]: ev.target.value === "" ? undefined : { monthsAgo: Number(ev.target.value) } })}
                            />
                            <FieldError>
                                {errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`]}
                            </FieldError>
                        </Field>
                    )}
                </FieldGroup>
                <FieldDescription>
                    These periods move with the calendar, so a six-month rule stays six months old.
                </FieldDescription>
                <Separator/>
                <FieldGroup className="grid sm:grid-cols-2">
                    {(["minReleaseYear", "maxReleaseYear"] as const).map((key, index) =>
                        <Field key={key} data-invalid={!!errors[`filters.${key}`]}>
                            <FieldLabel htmlFor={`${fieldId}-${key}`}>
                                {index === 0 ? "First release year" : "Last release year"}
                            </FieldLabel>
                            <Input
                                placeholder="Any year"
                                id={`${fieldId}-${key}`}
                                value={filters[key] ?? ""}
                                type="number" min={1} max={9999} step={1}
                                aria-invalid={!!errors[`filters.${key}`]}
                                onChange={ev => onChange({ [key]: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                            />
                            <FieldError>{errors[`filters.${key}`]}</FieldError>
                        </Field>
                    )}
                </FieldGroup>
            </DynamicListEditorSection>
        </FieldGroup>
    );
};

import {MAX_MEDIA_FILTER_VALUES} from "@/lib/media-definitions/base/media-filters";
import React, {useId, useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {MediaType, Status} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatNumber} from "@/lib/utils/formatting/number";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {Input} from "@/lib/client/components/ui/input";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {THEME_ICONS_MAP} from "@/lib/client/theme";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {Separator} from "@/lib/client/components/ui/separator";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {Layers3, LayoutGrid, List, Save} from "lucide-react";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {dynamicListRules} from "@/lib/client/components/dynamic-lists/dynamic-list.utils";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {dynamicListSpecSchema, type DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {MediaFilterSearch} from "@/lib/client/components/media/browse/MediaFilterSearch";
import {MediaSpecificFilters} from "@/lib/client/components/media/browse/MediaSpecificFilters";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {createMediaBrowseStatusOptions} from "@/lib/client/components/media/browse/media-browse.config";
import {useSaveDynamicListMutation} from "@/lib/client/react-query/query-mutations/dynamic-lists.mutations";
import {dynamicListEditorFiltersOptions, dynamicListSummaryOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";
import {DYNAMIC_LIST_SORT_OPTIONS, DYNAMIC_LIST_STATUS_OPTIONS} from "@/lib/client/components/dynamic-lists/dynamic-list.config";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


interface DynamicListEditorProps {
    listId?: number;
    initialSpec: DynamicListSpec;
    onSaved: (listId: number) => void;
    onCancel: () => void;
    startingPoint?: (disabled: boolean) => React.ReactNode;
}


const DynamicListSelect = ({ id, value, options, onChange }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
}) => (
    <Select items={options} value={value} onValueChange={value => value !== null && onChange(value)}>
        <SelectTrigger id={id} className="w-full">
            <SelectValue/>
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                {options.map(option =>
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                )}
            </SelectGroup>
        </SelectContent>
    </Select>
);


const EditorSection = ({ number, title, description, children }: {
    number: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) => (
    <Card className="overflow-visible">
        <CardHeader>
            <CardTitle>
                <h2 className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-muted-foreground">{number}</span>
                    {title}
                </h2>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <FieldGroup>{children}</FieldGroup>
        </CardContent>
    </Card>
);


export const DynamicListEditor = ({ listId, initialSpec, onSaved, onCancel, startingPoint }: DynamicListEditorProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const [spec, setSpec] = useState(initialSpec);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const saveMutation = useSaveDynamicListMutation(listId);
    useConfirmBlocker({
        when: JSON.stringify(spec) !== JSON.stringify(initialSpec) && !saveMutation.isPending && !saveMutation.isSuccess,
        title: "Discard your changes?",
        description: "Your unsaved list changes will be lost.",
        confirmLabel: "Discard changes",
        variant: "destructive",
    });
    const countSpec = useMemo<DynamicListSpec>(() => ({
        version: 1,
        display: "grid",
        title: "Dynamic list",
        filters: spec.filters,
        mediaTypes: spec.mediaTypes,
        sort: { field: "addedAt", direction: "desc" },
    }), [spec.filters, spec.mediaTypes]);
    const debouncedCountSpec = useDebounce(countSpec, 300);
    const countValidation = dynamicListSpecSchema.safeParse(debouncedCountSpec);
    const countQuery = useQuery({
        ...dynamicListSummaryOptions(debouncedCountSpec),
        enabled: countValidation.success,
    });
    const filterOptions = useQuery({
        ...dynamicListEditorFiltersOptions(spec.mediaTypes),
        enabled: spec.mediaTypes === "all" || spec.mediaTypes.length > 0,
    });

    const validation = dynamicListSpecSchema.safeParse(spec);
    const rules = dynamicListRules(spec);
    const activeMediaTypes = getActiveMediaTypes(currentUser!.settings);
    const filterMediaTypes = spec.mediaTypes === "all" ? activeMediaTypes : spec.mediaTypes;
    const availableFilters = getMediaCommonFilterKeys(filterMediaTypes);
    const statuses = [...new Set([
        ...createMediaBrowseStatusOptions(filterMediaTypes).flatMap(option => option.value === "all" ? [] : [option.value]),
        ...(spec.filters.statuses ?? []),
    ])];
    const selectableMediaTypes = ALL_MEDIA_TYPES.filter(type => activeMediaTypes.includes(type)
        || (spec.mediaTypes !== "all" && spec.mediaTypes.includes(type)));
    const countIsCurrent = countSpec === debouncedCountSpec && countValidation.success;

    const updateFilters = (filters: Partial<DynamicListSpec["filters"]>) => {
        setSpec(current => ({ ...current, filters: { ...current.filters, ...filters } }));
    };

    const validate = () => {
        setErrors(validation.success ? {} : Object.fromEntries(validation.error.issues.map(issue => [issue.path.join("."), issue.message])));
        return validation;
    };

    const handleSubmit = (event: React.SubmitEvent) => {
        event.preventDefault();
        if (saveMutation.isPending) return;
        const result = validate();
        if (result.success) saveMutation.mutate(result.data, { onSuccess: saved => onSaved(saved.id) });
    };

    const handleMediaTypesChange = (values: string[]) => {
        const mediaTypes = values.includes("all") && spec.mediaTypes !== "all"
            ? "all" : values.filter(value => value !== "all") as MediaType[];
        setSpec(current => ({
            ...current,
            mediaTypes,
            filters: {
                ...current.filters,
                mediaFilters: mediaTypes === "all" ? current.filters.mediaFilters : Object.fromEntries(
                    Object.entries(current.filters.mediaFilters ?? {}).filter(([type]) => mediaTypes.includes(type as MediaType))
                ),
            },
        }));
    };

    const handleStatusChange = (status: Status, checked: boolean) => {
        const statuses = checked ? [...(spec.filters.statuses ?? []), status] : spec.filters.statuses?.filter(value => value !== status);
        updateFilters({ statuses: statuses?.length ? statuses : undefined, statusGroup: undefined });
    };

    return (
        <PageTitle title={listId === undefined ? "Create a dynamic list" : `Edit ${initialSpec.title}`} onlyHelmet>
            <div className="flex flex-col gap-6 pt-5 pb-8 sm:gap-8 sm:pt-7">
                <PageHeader
                    eyebrow={<ListsBackLink username={currentUser!.name}/>}
                    asideValue={startingPoint?.(saveMutation.isPending)}
                    title={listId === undefined ? "Create a dynamic list" : "Edit dynamic list"}
                    description="Set your rules, choose a layout, and see which titles belong together."
                />

                <form aria-label="Dynamic list editor" onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
                        <FieldSet disabled={saveMutation.isPending} className="min-w-0 gap-5">
                            <FieldLegend className="sr-only">Dynamic list rules</FieldLegend>
                            <EditorSection number="01" title="List details" description="Give it a name and choose which tracking lists to include.">
                                <Field data-invalid={!!errors.title}>
                                    <FieldLabel htmlFor={`${fieldId}-title`}>List name</FieldLabel>
                                    <Input
                                        id={`${fieldId}-title`}
                                        value={spec.title}
                                        maxLength={100}
                                        autoComplete="off"
                                        aria-invalid={!!errors.title}
                                        placeholder="A name for this corner of your library"
                                        onChange={event => setSpec(current => ({ ...current, title: event.target.value }))}
                                    />
                                    <FieldError>{errors.title}</FieldError>
                                </Field>
                                <FieldSet data-invalid={!!errors.mediaTypes}>
                                    <FieldLegend variant="label" id={`${fieldId}-media`}>Media types</FieldLegend>
                                    <ToggleGroup
                                        multiple
                                        variant="brand"
                                        className="max-w-full flex-wrap"
                                        aria-labelledby={`${fieldId}-media`}
                                        aria-invalid={!!errors.mediaTypes}
                                        onValueChange={handleMediaTypesChange}
                                        value={spec.mediaTypes === "all" ? ["all"] : spec.mediaTypes}
                                    >
                                        <ToggleGroupItem value="all"><Layers3 data-icon="inline-start"/>All media</ToggleGroupItem>
                                        {selectableMediaTypes.map(type => {
                                            const Icon = THEME_ICONS_MAP[type];
                                            return <ToggleGroupItem key={type} value={type}>
                                                <Icon data-icon="inline-start"/>{type === "series" ? "TV series" : capitalize(type)}
                                            </ToggleGroupItem>;
                                        })}
                                    </ToggleGroup>
                                    <FieldDescription>Only active tracking lists contribute matching titles.</FieldDescription>
                                    <FieldError>{errors.mediaTypes}</FieldError>
                                </FieldSet>
                                {availableFilters.has("search") &&
                                    <Field data-invalid={!!errors["filters.search"]}>
                                        <FieldLabel htmlFor={`${fieldId}-search`}>Title contains</FieldLabel>
                                        <Input
                                            id={`${fieldId}-search`}
                                            value={spec.filters.search ?? ""}
                                            maxLength={100}
                                            placeholder="Any title"
                                            aria-invalid={!!errors["filters.search"]}
                                            onChange={event => updateFilters({ search: event.target.value.trim() ? event.target.value : undefined })}
                                        />
                                        <FieldError>{errors["filters.search"]}</FieldError>
                                    </Field>
                                }
                            </EditorSection>

                            <EditorSection number="02" title="Progress & rating" description="Bring together your plans, ongoing titles or finished favorites.">
                                <FieldGroup className="grid sm:grid-cols-2">
                                    {availableFilters.has("status") &&
                                        <Field>
                                            <FieldLabel htmlFor={`${fieldId}-status`}>Status</FieldLabel>
                                            <DynamicListSelect
                                                id={`${fieldId}-status`}
                                                options={DYNAMIC_LIST_STATUS_OPTIONS}
                                                value={spec.filters.statusGroup ?? "any"}
                                                onChange={value => updateFilters({ statuses: undefined, statusGroup: value === "any" ? undefined : value as DynamicListSpec["filters"]["statusGroup"] })}
                                            />
                                        </Field>
                                    }
                                    {(["favorite", "rated", "hasComment"] as const)
                                        .filter(key => availableFilters.has(key === "rated" ? "minRating" : key === "hasComment" ? "comment" : key))
                                        .map(key =>
                                            <Field key={key}>
                                                <FieldLabel htmlFor={`${fieldId}-${key}`}>{key === "favorite" ? "Favorites" : key === "rated" ? "Rating state" : "Comments"}</FieldLabel>
                                                <DynamicListSelect
                                                    id={`${fieldId}-${key}`}
                                                    value={spec.filters[key] === undefined ? "any" : String(spec.filters[key])}
                                                    options={[
                                                        { value: "any", label: "All titles" },
                                                        { value: "true", label: key === "favorite" ? "Favorites only" : key === "rated" ? "Rated only" : "With a comment" },
                                                        { value: "false", label: key === "favorite" ? "Exclude favorites" : key === "rated" ? "Unrated only" : "Without a comment" },
                                                    ]}
                                                    onChange={value => updateFilters({ [key]: value === "any" ? undefined : value === "true" })}
                                                />
                                            </Field>
                                    )}
                                    {availableFilters.has("minRating") && (["minRating", "maxRating"] as const).map((key, index) =>
                                        <Field key={key} data-invalid={!!errors[`filters.${key}`]}>
                                            <FieldLabel htmlFor={`${fieldId}-${key}`}>{index === 0 ? "Minimum rating / 10" : "Maximum rating / 10"}</FieldLabel>
                                            <Input
                                                id={`${fieldId}-${key}`}
                                                type="number" min={0} max={10} step={0.5}
                                                value={spec.filters[key] ?? ""}
                                                placeholder={index === 0 ? "No minimum" : "No maximum"}
                                                aria-invalid={!!errors[`filters.${key}`]}
                                                onChange={event => updateFilters({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })}
                                            />
                                            <FieldError>{errors[`filters.${key}`]}</FieldError>
                                        </Field>
                                    )}
                                </FieldGroup>
                                {availableFilters.has("status") &&
                                    <details className="rounded-lg border px-4 py-3" open={!!spec.filters.statuses?.length}>
                                        <summary className="cursor-pointer text-sm font-medium">Choose specific statuses</summary>
                                        <FieldSet className="pt-4">
                                            <FieldLegend className="sr-only">Specific statuses</FieldLegend>
                                            <FieldDescription>Match any selected status. Selecting one replaces the status group above.</FieldDescription>
                                            <FieldGroup className="grid grid-cols-2 gap-3">
                                                {statuses.map((status, index) =>
                                                    <Field key={status} orientation="horizontal">
                                                        <Checkbox id={`${fieldId}-status-${index}`} checked={spec.filters.statuses?.includes(status) ?? false} onCheckedChange={checked => handleStatusChange(status, checked)}/>
                                                        <FieldLabel htmlFor={`${fieldId}-status-${index}`}>{status}</FieldLabel>
                                                    </Field>
                                                )}
                                            </FieldGroup>
                                            <FieldError>{errors["filters.statuses"]}</FieldError>
                                        </FieldSet>
                                    </details>
                                }
                            </EditorSection>

                            <EditorSection number="03" title="Genres & tags" description="Search your library’s labels and select the ones that belong here.">
                                {availableFilters.has("genres") &&
                                    <MediaFilterSearch
                                        label="Genres"
                                        options={filterOptions.data?.genres ?? []}
                                        value={spec.filters.genres ?? []}
                                        onChange={values => updateFilters({ genres: values.length ? values : undefined })}
                                        disabled={saveMutation.isPending || filterOptions.isPending}
                                        error={errors["filters.genres"]}
                                        maxSelected={MAX_MEDIA_FILTER_VALUES}
                                    />
                                }
                                {availableFilters.has("tags") &&
                                    <>
                                        <MediaFilterSearch
                                            label="Tags"
                                            options={filterOptions.data?.tags ?? []}
                                            value={spec.filters.tags ?? []}
                                            onChange={values => updateFilters({ tags: values.length ? values : undefined })}
                                            disabled={saveMutation.isPending || filterOptions.isPending}
                                            error={errors["filters.tags"]}
                                            maxSelected={MAX_MEDIA_FILTER_VALUES}
                                        />
                                        <Field>
                                            <FieldLabel id={`${fieldId}-tags-match`}>Tag matching</FieldLabel>
                                            <ToggleGroup
                                                variant="outline"
                                                aria-labelledby={`${fieldId}-tags-match`}
                                                value={[spec.filters.tagsMatch ?? "any"]}
                                                onValueChange={values => values[0] && updateFilters({ tagsMatch: values[0] as "any" | "all" })}
                                            >
                                                <ToggleGroupItem value="any">Any included tag</ToggleGroupItem>
                                                <ToggleGroupItem value="all">Every included tag</ToggleGroupItem>
                                            </ToggleGroup>
                                        </Field>
                                        <MediaFilterSearch
                                            label="Exclude tags"
                                            options={filterOptions.data?.tags ?? []}
                                            value={spec.filters.excludeTags ?? []}
                                            onChange={values => updateFilters({ excludeTags: values.length ? values : undefined })}
                                            disabled={saveMutation.isPending || filterOptions.isPending}
                                            error={errors["filters.excludeTags"]}
                                            maxSelected={MAX_MEDIA_FILTER_VALUES}
                                        />
                                    </>
                                }
                                <FieldDescription>Genres match any selected value. Excluded tags always remove matching titles.</FieldDescription>
                                {filterOptions.isError && <Alert variant="destructive"><AlertDescription>We couldn’t load filter options. Your selections are still here. <Button type="button" variant="ghost" size="sm" onClick={() => void filterOptions.refetch()}>Try again</Button></AlertDescription></Alert>}
                            </EditorSection>

                            <EditorSection number="04" title="Media details" description="Each group filters only its own media type. Other selected types still follow your common rules.">
                                {filterMediaTypes.map(mediaType =>
                                    <FieldSet key={mediaType}>
                                        <FieldLegend variant="label">
                                            {mediaType === MediaType.SERIES ? "TV series" : capitalize(mediaType)}
                                        </FieldLegend>
                                        <MediaSpecificFilters
                                            mediaType={mediaType}
                                            options={filterOptions.data?.mediaFilters[mediaType] ?? {}}
                                            filters={spec.filters.mediaFilters?.[mediaType] ?? {}}
                                            disabled={saveMutation.isPending || filterOptions.isPending}
                                            maxSelected={MAX_MEDIA_FILTER_VALUES}
                                            errors={Object.fromEntries(Object.entries(errors)
                                                .filter(([key]) => key.startsWith(`filters.mediaFilters.${mediaType}.`))
                                                .map(([key, error]) => [key.slice(`filters.mediaFilters.${mediaType}.`.length), error]))}
                                            onChange={next => setSpec(current => ({
                                                ...current,
                                                filters: {
                                                    ...current.filters,
                                                    mediaFilters: {
                                                        ...current.filters.mediaFilters,
                                                        [mediaType]: { ...current.filters.mediaFilters?.[mediaType], ...next },
                                                    },
                                                },
                                            }))}
                                        />
                                    </FieldSet>
                                )}
                            </EditorSection>

                            <EditorSection number="05" title="Dates & time" description="Find older plans, recent additions or titles from a particular era.">
                                <FieldGroup className="grid sm:grid-cols-2">
                                    {([
                                        { key: "addedBefore", label: "Added more than … months ago" },
                                        { key: "addedWithin", label: "Added within … months" },
                                        { key: "updatedBefore", label: "Not updated for … months" },
                                    ] as const).map(({ key, label }) =>
                                        <Field key={key} data-invalid={!!(errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`])}>
                                            <FieldLabel htmlFor={`${fieldId}-${key}`}>{label}</FieldLabel>
                                            <Input
                                                id={`${fieldId}-${key}`}
                                                type="number" min={1} max={120} step={1}
                                                value={spec.filters[key]?.monthsAgo ?? ""}
                                                placeholder="Any time"
                                                aria-invalid={!!(errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`])}
                                                onChange={event => updateFilters({ [key]: event.target.value === "" ? undefined : { monthsAgo: Number(event.target.value) } })}
                                            />
                                            <FieldError>{errors[`filters.${key}.monthsAgo`] || errors[`filters.${key}`]}</FieldError>
                                        </Field>
                                    )}
                                </FieldGroup>
                                <FieldDescription>These periods move with the calendar, so a six-month rule stays six months old.</FieldDescription>
                                <Separator/>
                                <FieldGroup className="grid sm:grid-cols-2">
                                    {(["minReleaseYear", "maxReleaseYear"] as const).map((key, index) =>
                                        <Field key={key} data-invalid={!!errors[`filters.${key}`]}>
                                            <FieldLabel htmlFor={`${fieldId}-${key}`}>{index === 0 ? "First release year" : "Last release year"}</FieldLabel>
                                            <Input
                                                id={`${fieldId}-${key}`}
                                                type="number" min={1} max={9999} step={1}
                                                value={spec.filters[key] ?? ""}
                                                placeholder="Any year"
                                                aria-invalid={!!errors[`filters.${key}`]}
                                                onChange={event => updateFilters({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })}
                                            />
                                            <FieldError>{errors[`filters.${key}`]}</FieldError>
                                        </Field>
                                    )}
                                </FieldGroup>
                            </EditorSection>

                            <EditorSection number="06" title="Default presentation" description="Choose how this list opens. You can always change the display while browsing.">
                                <FieldGroup className="grid sm:grid-cols-2">
                                    <Field>
                                        <FieldLabel htmlFor={`${fieldId}-sort`}>Sort by</FieldLabel>
                                        <DynamicListSelect id={`${fieldId}-sort`} value={spec.sort.field} options={DYNAMIC_LIST_SORT_OPTIONS} onChange={value => setSpec(current => ({ ...current, sort: { ...current.sort, field: value as DynamicListSpec["sort"]["field"] } }))}/>
                                    </Field>
                                    <Field>
                                        <FieldLabel id={`${fieldId}-order`}>Order</FieldLabel>
                                        <ToggleGroup variant="outline" value={[spec.sort.direction]} aria-labelledby={`${fieldId}-order`} onValueChange={values => values[0] && setSpec(current => ({ ...current, sort: { ...current.sort, direction: values[0] as "asc" | "desc" } }))}>
                                            <ToggleGroupItem value="asc">Ascending</ToggleGroupItem>
                                            <ToggleGroupItem value="desc">Descending</ToggleGroupItem>
                                        </ToggleGroup>
                                    </Field>
                                </FieldGroup>
                                <Field>
                                    <FieldLabel id={`${fieldId}-display`}>Default display</FieldLabel>
                                    <ToggleGroup variant="outline" value={[spec.display]} aria-labelledby={`${fieldId}-display`} onValueChange={values => values[0] && setSpec(current => ({ ...current, display: values[0] as "grid" | "list" }))}>
                                        <ToggleGroupItem value="grid"><LayoutGrid data-icon="inline-start"/>Grid</ToggleGroupItem>
                                        <ToggleGroupItem value="list"><List data-icon="inline-start"/>Table</ToggleGroupItem>
                                    </ToggleGroup>
                                </Field>
                            </EditorSection>
                        </FieldSet>

                        <aside className="min-w-0 lg:sticky lg:top-22" aria-label="Preview dynamic list">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <h2 aria-live="polite" aria-busy={!countIsCurrent || countQuery.isFetching}>
                                            {countIsCurrent && countQuery.data ? formatNumber(countQuery.data.total) : "—"} media
                                        </h2>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    <Separator/>
                                    <div className="flex flex-col gap-3">
                                        <p className="text-xs font-medium text-muted-foreground">Match every rule below</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {rules.length ? rules.map(rule => <Badge key={rule} variant="outline" className="h-auto max-w-full"><span className="whitespace-normal break-words">{rule}</span></Badge>) : <p className="text-sm text-muted-foreground">Every title in the selected tracking lists.</p>}
                                        </div>
                                    </div>
                                    {countQuery.isError && <Alert variant="destructive"><AlertDescription>We couldn’t count matching media. <Button type="button" variant="ghost" size="sm" onClick={() => void countQuery.refetch()}>Try again</Button></AlertDescription></Alert>}
                                </CardContent>
                            </Card>
                        </aside>
                    </div>

                    <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background/95 py-4 backdrop-blur-sm">
                        {saveMutation.isError && <Alert variant="destructive"><AlertDescription>We couldn’t save this list. Your changes are still here; try again.</AlertDescription></Alert>}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {Object.keys(errors).length > 0 && <p className="text-xs text-muted-foreground">Check the highlighted fields before saving.</p>}
                            <div className="ml-auto flex items-center gap-2">
                                <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={onCancel}>Cancel</Button>
                                <Button type="submit" disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? <Spinner data-icon="inline-start"/> : <Save data-icon="inline-start"/>}
                                    {listId === undefined ? "Create dynamic list" : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </PageTitle>
    );
};

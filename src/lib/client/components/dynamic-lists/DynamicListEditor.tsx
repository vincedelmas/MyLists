import {MediaType} from "@/lib/utils/enums";
import React, {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {THEME_ICONS_MAP} from "@/lib/client/theme";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {capitalize} from "@/lib/utils/formatting/text";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Layers3, LayoutGrid, List, Save} from "lucide-react";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {DynamicListPreview} from "@/lib/client/components/dynamic-lists/DynamicListPreview";
import {MediaTypeFilterTabs} from "@/lib/client/components/media/browse/MediaTypeFilterTabs";
import {dynamicListSpecSchema, type DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {getMediaCommonFilterKeys} from "@/lib/client/components/media/browse/media-filter.utils";
import {DYNAMIC_LIST_SORT_OPTIONS} from "@/lib/client/components/dynamic-lists/dynamic-list.config";
import {DynamicListMediaFilters} from "@/lib/client/components/dynamic-lists/DynamicListMediaFilters";
import {DynamicListCommonFilters} from "@/lib/client/components/dynamic-lists/DynamicListCommonFilters";
import {useSaveDynamicListMutation} from "@/lib/client/react-query/query-mutations/dynamic-lists.mutations";
import {dynamicListEditorFiltersOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";
import {DynamicListEditorSection, DynamicListEditorSelect} from "@/lib/client/components/dynamic-lists/DynamicListEditorFields";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


interface DynamicListEditorProps {
    listId?: number;
    onCancel: () => void;
    initialSpec: DynamicListSpec;
    onSaved: (listId: number) => void;
    initialTagNames?: Record<number, string>;
    startingPoint?: (disabled: boolean, id: string) => React.ReactNode;
}


export const DynamicListEditor = ({ listId, initialSpec, initialTagNames = {}, onSaved, onCancel, startingPoint }: DynamicListEditorProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const [spec, setSpec] = useState(initialSpec);
    const saveMutation = useSaveDynamicListMutation(listId);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useConfirmBlocker({
        variant: "destructive",
        title: "Discard your changes?",
        confirmLabel: "Discard changes",
        description: "Your unsaved list changes will be lost.",
        when: JSON.stringify(spec) !== JSON.stringify(initialSpec) && !saveMutation.isPending && !saveMutation.isSuccess,
    });

    const filterOptions = useQuery({
        ...dynamicListEditorFiltersOptions(spec.mediaTypes),
        enabled: spec.mediaTypes === "all" || spec.mediaTypes.length > 0,
    });

    const tagNames = {
        ...initialTagNames,
        ...Object.fromEntries(Object.values(filterOptions.data?.mediaFilters ?? {}).flatMap(options =>
            (options.tags ?? []).map(tag => [tag.id, tag.name]),
        )),
    };

    const activeMediaTypes = getActiveMediaTypes(currentUser!.settings);
    const filterMediaTypes = spec.mediaTypes === "all" ? activeMediaTypes : spec.mediaTypes;

    const availableFilters = getMediaCommonFilterKeys(filterMediaTypes);
    const selectableMediaTypes = ALL_MEDIA_TYPES.filter(type => activeMediaTypes.includes(type)
        || (spec.mediaTypes !== "all" && spec.mediaTypes.includes(type)));

    const updateFilters = (filters: Partial<DynamicListSpec["filters"]>) => {
        setSpec(current => ({ ...current, filters: { ...current.filters, ...filters } }));
    };

    const handleSubmit = (ev: React.SubmitEvent) => {
        ev.preventDefault();
        if (saveMutation.isPending) return;

        const result = dynamicListSpecSchema.safeParse(spec);
        setErrors(result.success ? {} : Object.fromEntries(result.error.issues.map(i => [i.path.join("."), i.message])));

        if (result.success) {
            saveMutation.mutate(result.data, { onSuccess: saved => onSaved(saved.id) });
        }
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

    return (
        <div className="flex flex-col gap-6 pt-5 pb-8 sm:gap-8 sm:pt-7">
            <PageHeader
                eyebrow={<ListsBackLink username={currentUser!.name}/>}
                description="Set your rules, choose a layout, and see which titles belong together."
                title={listId === undefined
                    ? "Create a dynamic list"
                    : "Edit dynamic list"
                }
            />

            <form aria-label="Dynamic list editor" onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
                    <FieldSet disabled={saveMutation.isPending} className="min-w-0 gap-5">
                        <FieldLegend className="sr-only">
                            Dynamic list rules
                        </FieldLegend>

                        {startingPoint &&
                            <Field className="rounded-xl border border-brand/15 bg-brand/5 p-4">
                                <FieldLabel htmlFor={`${fieldId}-starting-point`}>
                                    Starting point
                                </FieldLabel>
                                <FieldDescription>
                                    Start with a blank list or a set of ready-made rules. You can adjust everything below.
                                </FieldDescription>
                                {startingPoint(saveMutation.isPending, `${fieldId}-starting-point`)}
                            </Field>
                        }

                        <DynamicListEditorSection number="01" title="List details" description="Give it a name and choose which tracking lists to include.">
                            <Field data-invalid={!!errors.title}>
                                <FieldLabel htmlFor={`${fieldId}-title`}>
                                    List name
                                </FieldLabel>
                                <Input
                                    maxLength={100}
                                    value={spec.title}
                                    autoComplete="off"
                                    id={`${fieldId}-title`}
                                    aria-invalid={!!errors.title}
                                    placeholder="A name for this corner of your library"
                                    onChange={event => setSpec(curr => ({ ...curr, title: event.target.value }))}
                                />
                                <FieldError>{errors.title}</FieldError>
                            </Field>
                            <FieldSet data-invalid={!!errors.mediaTypes}>
                                <FieldLegend variant="label" id={`${fieldId}-media`}>
                                    Media types
                                </FieldLegend>
                                <ToggleGroup
                                    multiple
                                    variant="brand"
                                    className="max-w-full flex-wrap"
                                    aria-invalid={!!errors.mediaTypes}
                                    aria-labelledby={`${fieldId}-media`}
                                    onValueChange={handleMediaTypesChange}
                                    value={spec.mediaTypes === "all" ? ["all"] : spec.mediaTypes}
                                >
                                    <ToggleGroupItem value="all">
                                        <Layers3 data-icon="inline-start"/>
                                        All media
                                    </ToggleGroupItem>
                                    {selectableMediaTypes.map(type => {
                                        const Icon = THEME_ICONS_MAP[type];
                                        return (
                                            <ToggleGroupItem key={type} value={type}>
                                                <Icon data-icon="inline-start"/>
                                                {capitalize(type)}
                                            </ToggleGroupItem>
                                        );
                                    })}
                                </ToggleGroup>
                                <FieldDescription>
                                    Only active tracking lists contribute matching titles.
                                </FieldDescription>
                                <FieldError>
                                    {errors.mediaTypes}
                                </FieldError>
                            </FieldSet>
                            {availableFilters.has("search") &&
                                <Field data-invalid={!!errors["filters.search"]}>
                                    <FieldLabel htmlFor={`${fieldId}-search`}>
                                        Title contains
                                    </FieldLabel>
                                    <Input
                                        maxLength={100}
                                        placeholder="Any title"
                                        id={`${fieldId}-search`}
                                        value={spec.filters.search ?? ""}
                                        aria-invalid={!!errors["filters.search"]}
                                        onChange={event => updateFilters({ search: event.target.value.trim() ? event.target.value : undefined })}
                                    />
                                    <FieldError>
                                        {errors["filters.search"]}
                                    </FieldError>
                                </Field>
                            }
                        </DynamicListEditorSection>

                        <MediaTypeFilterTabs
                            mediaTypes={filterMediaTypes}
                            filters={spec.filters.mediaFilters ?? {}}
                            commonCount={
                                Object.entries(spec.filters)
                                    .filter(([key, value]) => key !== "mediaFilters" && value !== undefined).length
                            }
                            common={
                                <DynamicListCommonFilters
                                    errors={errors}
                                    fieldId={fieldId}
                                    filters={spec.filters}
                                    onChange={updateFilters}
                                    mediaTypes={filterMediaTypes}
                                    disabled={saveMutation.isPending}
                                    optionsError={filterOptions.isError}
                                    optionsLoading={filterOptions.isPending}
                                    genreOptions={filterOptions.data?.genres ?? []}
                                    onRetryOptions={() => void filterOptions.refetch()}
                                />
                            }
                        >
                            {mediaType =>
                                <DynamicListMediaFilters
                                    errors={errors}
                                    tagNames={tagNames}
                                    mediaType={mediaType}
                                    username={currentUser!.name}
                                    optionsError={filterOptions.isError}
                                    options={filterOptions.data?.mediaFilters[mediaType]}
                                    filters={spec.filters.mediaFilters?.[mediaType] ?? {}}
                                    disabled={saveMutation.isPending || filterOptions.isPending}
                                    onRetryOptions={() => void filterOptions.refetch()}
                                    onChange={next => setSpec(curr => ({
                                        ...curr,
                                        filters: {
                                            ...curr.filters,
                                            mediaFilters: {
                                                ...curr.filters.mediaFilters,
                                                [mediaType]: { ...curr.filters.mediaFilters?.[mediaType], ...next },
                                            },
                                        },
                                    }))}
                                />
                            }
                        </MediaTypeFilterTabs>

                        <DynamicListEditorSection
                            number="04"
                            title="Default presentation"
                            description="Choose how this list opens. You can always change the display while browsing."
                        >
                            <FieldGroup className="grid sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor={`${fieldId}-sort`}>
                                        Sort by
                                    </FieldLabel>
                                    <DynamicListEditorSelect
                                        id={`${fieldId}-sort`}
                                        value={spec.sort.field}
                                        options={DYNAMIC_LIST_SORT_OPTIONS}
                                        onChange={value => setSpec(curr => ({
                                            ...curr,
                                            sort: { ...curr.sort, field: value as DynamicListSpec["sort"]["field"] }
                                        }))}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel id={`${fieldId}-order`}>
                                        Order
                                    </FieldLabel>
                                    <ToggleGroup
                                        variant="outline"
                                        value={[spec.sort.direction]}
                                        aria-labelledby={`${fieldId}-order`}
                                        onValueChange={values => values[0] && setSpec(curr => ({
                                            ...curr,
                                            sort: { ...curr.sort, direction: values[0] as "asc" | "desc" }
                                        }))}
                                    >
                                        <ToggleGroupItem value="asc">
                                            Ascending
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="desc">
                                            Descending
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </Field>
                            </FieldGroup>
                            <Field>
                                <FieldLabel id={`${fieldId}-display`}>
                                    Default display
                                </FieldLabel>
                                <ToggleGroup
                                    variant="outline"
                                    value={[spec.display]}
                                    aria-labelledby={`${fieldId}-display`}
                                    onValueChange={values => values[0] && setSpec(curr => ({ ...curr, display: values[0] as "grid" | "list" }))}
                                >
                                    <ToggleGroupItem value="grid">
                                        <LayoutGrid data-icon="inline-start"/> Grid
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="list">
                                        <List data-icon="inline-start"/> Table
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </Field>
                        </DynamicListEditorSection>
                    </FieldSet>

                    <DynamicListPreview spec={spec} tagNames={tagNames}/>
                </div>

                <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background/95 py-4 backdrop-blur-sm">
                    {saveMutation.isError &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                We couldn’t save this list. Your changes are still here; try again.
                            </AlertDescription>
                        </Alert>
                    }

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {Object.keys(errors).length > 0 &&
                            <p className="text-xs text-muted-foreground">
                                Check the highlighted fields before saving.
                            </p>
                        }

                        <div className="ml-auto flex items-center gap-2">
                            <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={onCancel}>
                                Cancel
                            </Button>
                            <LoadingButton
                                type="submit"
                                isLoading={saveMutation.isPending}
                                icon={<Save data-icon="inline-start"/>}
                            >
                                {listId === undefined ? "Create dynamic list" : "Save changes"}
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

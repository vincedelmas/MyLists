import {useState} from "react";
import {router, useIsFocused, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {View} from "react-native";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {toOptionalNumber} from "@/lib/utils/media/advanced-search";
import {libraryEditorOptions} from "../../lib/react-query/query-options/library.options";
import {useLibraryAction} from "../../lib/react-query/query-mutations/library.mutations";
import {dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";
import {AppText, Button, Content, Field, Page, QueryPanel, Section, Select} from "../../components/ui";
import {ChoiceChips} from "../../components/choice-chips";
import {SettingSwitch} from "../../components/setting-switch";
import {api} from "../../lib/api-client";
import {mediaLabels} from "../../lib/media";
import {colors} from "../../theme";


type EditorData = Awaited<ReturnType<typeof api.libraryEditor>>;


const numericFields = [
    { key: "minRating", label: "Minimum rating · 0–10" },
    { key: "maxRating", label: "Maximum rating · 0–10" },
    {
        key: "minReleaseYear",
        label: "First release year"
    },
    { key: "maxReleaseYear", label: "Last release year" }
] as const;


function EditorForm({ data, id }: { data: EditorData; id: number }) {
    const dynamic = data.kind === "dynamic" ? data.view.spec : null;
    const collection = data.kind === "collection" ? data.collection : null;
    const [title, setTitle] = useState(dynamic?.title ?? collection!.title);
    const [description, setDescription] = useState(collection?.description ?? "");
    const [privacy, setPrivacy] = useState(collection?.privacy ?? "private");
    const [ordered, setOrdered] = useState(collection?.ordered ?? false);
    const [spec, setSpec] = useState(dynamic);
    const [error, setError] = useState("");
    const mutation = useLibraryAction();
    const [numbers, setNumbers] = useState(() => Object.fromEntries(numericFields.map(item => [item.key, String(dynamic?.filters[item.key] ?? "")])));
    const [search, setSearch] = useState(dynamic?.filters.search ?? "");

    return (
        <Content>
            <Section title={dynamic ? "Dynamic list" : "Collection"}>
                <View style={{ padding: 16, gap: 16 }}>
                    <Field
                        label="Title"
                        value={title}
                        onChangeText={setTitle}
                        editable={!mutation.isPending}
                    />
                    {collection &&
                        <>
                            <Field
                                label="Description"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                editable={!mutation.isPending}
                            />
                            <ChoiceChips
                                label="Collection privacy"
                                value={privacy}
                                onChange={setPrivacy}
                                options={[
                                    {
                                        value: "public",
                                        label: "Public"
                                    },
                                    { value: "restricted", label: "Restricted" },
                                    { value: "private", label: "Private" }
                                ]}
                            />
                            <SettingSwitch
                                label="Ordered collection"
                                value={ordered}
                                disabled={mutation.isPending}
                                onChange={setOrdered}
                            />
                        </>
                    }
                </View>
            </Section>
            {spec &&
                <>
                    <Section title="Media types">
                        <View style={{ padding: 16, gap: 12 }}>
                            <SettingSwitch
                                label="All media types"
                                value={spec.mediaTypes === "all"}
                                onChange={value => setSpec({
                                    ...spec,
                                    mediaTypes: value ? "all" : ["series"]
                                })}
                            />
                            {spec.mediaTypes !== "all" && ALL_MEDIA_TYPES.map(type =>
                                <SettingSwitch
                                    key={type}
                                    label={mediaLabels[type]}
                                    value={spec.mediaTypes.includes(type)}
                                    onChange={selected => setSpec({
                                        ...spec,
                                        mediaTypes: selected
                                            ? [...(spec.mediaTypes === "all" ? [] : spec.mediaTypes), type]
                                            : (spec.mediaTypes === "all" ? [] : spec.mediaTypes).filter(value => value !== type)
                                    })}
                                />)
                            }
                        </View>
                    </Section>
                    <Section title="Display & sorting">
                        <View style={{ padding: 16, gap: 16 }}>
                            <ChoiceChips
                                label="List display"
                                value={spec.display}
                                options={[
                                    { value: "grid", label: "Grid" },
                                    { value: "list", label: "List" }
                                ]}
                                onChange={display => setSpec({ ...spec, display })}
                            />
                            <Select
                                label="Sort by"
                                value={spec.sort.field}
                                options={[
                                    {
                                        value: "addedAt",
                                        label: "Date added"
                                    },
                                    {
                                        value: "lastUpdated",
                                        label: "Last updated"
                                    },
                                    {
                                        value: "title",
                                        label: "Title"
                                    },
                                    {
                                        value: "rating",
                                        label: "Rating"
                                    },
                                    {
                                        value: "releaseDate",
                                        label: "Release date"
                                    }
                                ]}
                                onChange={field => setSpec({
                                    ...spec,
                                    sort: {
                                        ...spec.sort,
                                        field
                                    }
                                })}
                            />
                            <ChoiceChips
                                label="Sort direction"
                                value={spec.sort.direction}
                                options={[
                                    { value: "asc", label: "Ascending" },
                                    { value: "desc", label: "Descending" }
                                ]}
                                onChange={direction => setSpec({
                                    ...spec,
                                    sort: { ...spec.sort, direction }
                                })}
                            />
                        </View>
                    </Section>
                    <Section title="Filter rules">
                        <View style={{ padding: 16, gap: 16 }}>
                            <Field
                                label="Title contains"
                                value={search}
                                onChangeText={setSearch}
                            />
                            <Select
                                label="Status group"
                                value={spec.filters.statusGroup ?? ""}
                                options={[
                                    {
                                        value: "",
                                        label: "Any"
                                    },
                                    {
                                        value: "planned",
                                        label: "Planned"
                                    },
                                    {
                                        value: "in_progress",
                                        label: "In progress"
                                    },
                                    {
                                        value: "completed",
                                        label: "Completed"
                                    },
                                    {
                                        value: "on_hold",
                                        label: "On hold"
                                    },
                                    {
                                        value: "dropped",
                                        label: "Dropped"
                                    }
                                ]}
                                onChange={value => setSpec({
                                    ...spec,
                                    filters: {
                                        ...spec.filters,
                                        statusGroup: value || undefined
                                    }
                                })}
                            />
                            {(["favorite", "rated", "hasComment"] as const).map(key =>
                                <Select
                                    key={key}
                                    label={key === "favorite" ? "Favorite" : key === "rated" ? "Rated media" : "Has comment"}
                                    value={spec.filters[key] === undefined ? "any" : spec.filters[key] ? "yes" : "no"}
                                    options={[
                                        { value: "any", label: "Any" },
                                        { value: "yes", label: "Yes" },
                                        {
                                            value: "no",
                                            label: "No"
                                        }
                                    ]}
                                    onChange={value => setSpec({
                                        ...spec,
                                        filters: { ...spec.filters, [key]: value === "any" ? undefined : value === "yes" }
                                    })}
                                />)
                            }
                            {numericFields.map(item =>
                                <Field
                                    key={item.key}
                                    label={item.label}
                                    value={numbers[item.key]}
                                    onChangeText={value => setNumbers(previous => ({ ...previous, [item.key]: value }))}
                                    keyboardType="decimal-pad"
                                />)
                            }
                        </View>
                    </Section>
                </>
            }
            {(error || mutation.error) &&
                <AppText
                    accessibilityRole="alert"
                    style={{ color: colors.error }}
                >
                    {error || mutation.error?.message}
                </AppText>
            }
            <Button
                fullWidth
                label="Save changes"
                pending={mutation.isPending}
                onPress={() => {
                    if (spec) {
                        const parsed = dynamicListSpecSchema.safeParse({
                            ...spec,
                            title,
                            filters: {
                                ...spec.filters,
                                search: search.trim() || undefined,
                                ...Object.fromEntries(numericFields.map(item => [item.key, toOptionalNumber(numbers[item.key].trim())]))
                            }
                        });
                        if (!parsed.success) {
                            setError(parsed.error.issues[0].message);

                            return;
                        }
                        mutation.mutate({ action: "dynamic", id, spec: parsed.data }, { onSuccess: () => router.back() });
                    }
                    else mutation.mutate({
                        action: "collection",
                        id,
                        title,
                        description,
                        privacy,
                        ordered
                    }, { onSuccess: () => router.back() });
                }}
            />
        </Content>
    );
}


export function LibraryEditorScreen() {
    const params = useLocalSearchParams<{ kind: "dynamic" | "collection"; id: string }>();
    const focused = useIsFocused();
    const id = Number(params.id);
    const query = useQuery({
        ...libraryEditorOptions(params.kind, id),
        enabled: focused,
    });

    return (
        <Page
            title={params.kind === "dynamic" ? "Edit dynamic list" : "Edit collection"}
            back
        >
            <QueryPanel query={query}>
                {data =>
                    <EditorForm
                        key={`${params.kind}:${id}`}
                        data={data}
                        id={id}
                    />
                }
            </QueryPanel>
        </Page>
    );
}

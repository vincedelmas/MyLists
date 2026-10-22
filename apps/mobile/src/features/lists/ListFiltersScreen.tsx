import {useState} from "react";
import {router, useIsFocused, useLocalSearchParams} from "expo-router";
import {useNavigation} from "expo-router/react-navigation";
import {useQuery} from "@tanstack/react-query";
import {BottomSheet, RNHostView, Row, Switch, Text as NativeText} from "@expo/ui";
import {Check} from "lucide-react-native";
import {FlatList, Pressable, ScrollView, View, useWindowDimensions} from "react-native";
import {AppText, Button, Field, MenuRow, Page, QueryPanel, Section, Select, StateView} from "../../components/ui";
import {NativeHost} from "../../components/native-host";
import {colors} from "../../theme";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {api, MediaType} from "../../lib/api-client";
import {listFiltersOptions, listFilterSearchOptions} from "../../lib/react-query/query-options/media.options";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {countListFilters, parseListFilters} from "./list-filters";


type Group =
    | Awaited<ReturnType<typeof api.listFilters>>["groups"][number]
    | {
    key: "status";
    label: string;
    searchable: boolean;
    options: string[];
};


export function ListFiltersScreen() {
    const focused = useIsFocused();
    const navigation = useNavigation();
    const { width, height } = useWindowDimensions();
    const [group, setGroup] = useState<Group | null>(null);
    const params = useLocalSearchParams<{ mediaType: MediaType; userId?: string; filters?: string }>();

    const { mediaType } = params;
    const userId = params.userId ? Number(params.userId) : undefined;
    const defaultSort = getMediaDefinition(mediaType).sorting.default;

    const [draft, setDraft] = useState(() => parseListFilters(params.filters));
    const query = useQuery({ ...listFiltersOptions(mediaType, userId), enabled: focused });

    const count = countListFilters(draft);

    return (
        <Page
            back={true}
            brand={true}
            title="Filter your list"
            action={<Button secondary label="Reset" onPress={() => setDraft({})}/>}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}
            >
                <AppText muted style={{ fontSize: 12 }}>
                    Match any selected value within a category, and all selected categories together.
                </AppText>
                <Select
                    label="Sort by"
                    value={draft.sorting ?? defaultSort}
                    options={getMediaSortOptions([mediaType], true)}
                    onChange={(sorting) => setDraft({ ...draft, sorting })}
                />
                <QueryPanel query={query}>
                    {(data) =>
                        <>
                            <Section title="Refine your list">
                                {[{
                                    key: "status",
                                    label: "Status",
                                    searchable: false,
                                    options: [...data.statuses],
                                } as Group, ...data.groups,].map((item) => {
                                    const selected = draft[item.key] ?? [];

                                    return (
                                        <MenuRow
                                            key={item.key}
                                            title={item.label}
                                            onPress={() => setGroup(item)}
                                            detail={selected.length ? selected.join(", ") : "Any"}
                                        />
                                    );
                                })}
                            </Section>
                            <Section title="Personal filters">
                                <View style={{ padding: 16, gap: 18 }}>
                                    {([
                                        { key: "favorite", label: "Favorites only" },
                                        { key: "comment", label: "With notes" },
                                        ...(userId ? [{ key: "hideCommon" as const, label: "Hide titles in my list" }] : []),
                                    ] as const)
                                        .filter((item) => item.key === "hideCommon" || data.common.includes(item.key))
                                        .map(({ key, label }) => (
                                            <NativeHost key={key}>
                                                <Row spacing={12}>
                                                    <NativeText>
                                                        {label}
                                                    </NativeText>
                                                    <Switch
                                                        value={Boolean(draft[key])}
                                                        onValueChange={(value) => setDraft({ ...draft, [key]: value || undefined })}
                                                    />
                                                </Row>
                                            </NativeHost>
                                        ))}
                                </View>
                            </Section>
                        </>
                    }
                </QueryPanel>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
                <Button
                    disabled={query.isPending || query.isError}
                    label={`Apply${count ? ` ${count}` : ""} filters`}
                    onPress={() => {
                        const tabs = navigation.getParent()!.getState();
                        const tab = tabs.routes[tabs.index].name;

                        router.dismissTo({
                            pathname: `/(tabs)/${tab}/lists/[mediaType]`,
                            params: { mediaType, userId: params.userId, filters: JSON.stringify(draft) },
                        });
                    }}
                />
            </View>

            {group &&
                <NativeHost>
                    <BottomSheet isPresented onDismiss={() => setGroup(null)} snapPoints={["full"]} contentPadding={0}>
                        <RNHostView matchContents={{ vertical: true }}>
                            <View style={{ width: Math.max(0, width - 32), height: height * 0.72 }}>
                                <FilterValues
                                    group={group}
                                    key={group.key}
                                    userId={userId}
                                    mediaType={mediaType}
                                    selected={draft[group.key] ?? []}
                                    close={() => setGroup(null)}
                                    onChange={(values) =>
                                        setDraft({ ...draft, [group.key]: values.length ? values : undefined })
                                    }
                                />
                            </View>
                        </RNHostView>
                    </BottomSheet>
                </NativeHost>
            }
        </Page>
    );
}


interface FilterValuesProps {
    group: Group;
    userId?: number;
    close: () => void;
    selected: string[];
    mediaType: MediaType;
    onChange: (values: string[]) => void;
}


function FilterValues({ mediaType, userId, group, selected, onChange, close }: FilterValuesProps) {
    const [text, setText] = useState("");

    const term = useDebouncedValue(text.trim());
    const query = useQuery({
        ...listFilterSearchOptions(mediaType, group.key as Parameters<typeof api.searchListFilters>[1], term, userId),
        enabled: group.searchable && term.length >= 2,
    });

    const names = group.searchable
        ? (query.data ?? [])
        : group.options.filter((name) => name.toLocaleLowerCase().includes(term.toLocaleLowerCase()));

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText heading style={{ fontSize: 20 }}>
                    {group.label}
                </AppText>
                <Button
                    label="Done"
                    onPress={close}
                    secondary={true}
                />
            </View>

            <Field
                value={text}
                autoCorrect={false}
                onChangeText={setText}
                label={`Find ${group.label.toLowerCase()}`}
                placeholder={group.searchable ? "Type at least two characters…" : "Search options…"}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText muted style={{ fontSize: 12 }}>
                    {selected.length} selected
                </AppText>

                {selected.length > 0 &&
                    <Button
                        label="Clear"
                        secondary={true}
                        onPress={() => onChange([])}
                    />
                }
            </View>

            {group.searchable && selected.length > 0 && (
                <ScrollView
                    horizontal
                    style={{ flexGrow: 0, maxHeight: 48 }}
                    contentContainerStyle={{ gap: 6, alignItems: "center" }}
                >
                    {selected.map((value) => (
                        <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${value}`}
                            style={{ padding: 8, borderRadius: 8, backgroundColor: colors.secondary }}
                            onPress={() => onChange(selected.filter((name) => name !== value))}
                        >
                            <AppText style={{ fontSize: 12 }}>
                                {value} ×
                            </AppText>
                        </Pressable>
                    ))}
                </ScrollView>
            )}

            <FlatList
                data={names}
                windowSize={5}
                initialNumToRender={12}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected.includes(item) }}
                        onPress={() =>
                            onChange(
                                selected.includes(item)
                                    ? selected.filter((value) => value !== item)
                                    : [...selected, item],
                            )
                        }
                        style={{
                            gap: 12,
                            paddingVertical: 14,
                            alignItems: "center",
                            flexDirection: "row",
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <View
                            style={{
                                width: 22,
                                height: 22,
                                borderWidth: 1,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center",
                                borderColor: selected.includes(item) ? colors.accent : colors.muted,
                                backgroundColor: selected.includes(item) ? colors.primary : "transparent",
                            }}
                        >
                            {selected.includes(item) &&
                                <Check
                                    size={16}
                                    color={colors.text}
                                />
                            }
                        </View>
                        <AppText style={{ flex: 1 }}>
                            {item}
                        </AppText>
                    </Pressable>
                )}
                ListEmptyComponent={
                    <StateView
                        message={query.error?.message}
                        loading={group.searchable && term.length >= 2 && query.isPending}
                        retry={query.isError ? () => void query.refetch() : undefined}
                        title={
                            query.isError
                                ? "Couldn’t load options"
                                : group.searchable && term.length < 2
                                    ? "Search to find options"
                                    : "No matching options"
                        }
                    />
                }
            />
        </View>
    );
}

import {SearchField} from "../../components/search-field";
import {useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {FlatList, Pressable, View} from "react-native";
import {Check, Folder, Tag} from "lucide-react-native";
import type {MediaParams, MobileMedia} from "../../lib/api-client";
import {mediaCollectionsOptions, mediaTagsOptions} from "../../lib/react-query/query-options/media.options";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {ActionSheet} from "../../components/action-sheet";
import {AppText, Button, QueryPanel} from "../../components/ui";
import {useMediaAction} from "./use-media-action";
import {colors} from "../../theme";


export function MediaMemberships({ params, data, kind, dismiss }: { params: MediaParams; data: MobileMedia; kind: "tags" | "collections"; dismiss: () => void }) {
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim().toLowerCase());
    const tags = useQuery({ ...mediaTagsOptions(params), enabled: focused && kind === "tags" });
    const collections = useQuery({ ...mediaCollectionsOptions(params), enabled: focused && kind === "collections" });
    const mutation = useMediaAction(params);
    const items = useMemo(() => {
        const assigned = new Set(data.tracking?.tags.map(tag => tag.name));

        return kind === "tags"
            ? tags.data?.map(tag => ({
                id: tag.name,
                title: tag.name,
                selected: assigned.has(tag.name),
                detail: "Tag"
            }))
            : collections.data?.map(item => ({
                id: String(item.id),
                title: item.title,
                selected: item.hasMedia,
                detail: `${item.itemsCount} titles · ${item.privacy}`
            }));
    }, [kind, tags.data, collections.data, data.tracking?.tags]);
    const filtered = useMemo(() => items?.filter(item => item.title.toLowerCase().includes(term)) ?? [], [items, term]);
    const canCreate = useMemo(() => term.length >= (kind === "tags" ? 1 : 3) && !items?.some(item => item.title.toLowerCase() === term), [term, kind, items]);
    const Icon = kind === "tags" ? Tag : Folder;

    return (
        <ActionSheet
            title={kind === "tags" ? "Manage tags" : "Manage collections"}
            error={mutation.error?.message}
            dismiss={dismiss}
            scrollable={false}
        >
            <SearchField
                clearable
                label={`Find or create ${kind === "tags" ? "a tag" : "a collection"}`}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
            />
            <QueryPanel
                query={{
                    data: items,
                    isPending: kind === "tags" ? tags.isPending : collections.isPending,
                    error: kind === "tags" ? tags.error : collections.error,
                    refetch: () => kind === "tags" ? tags.refetch() : collections.refetch()
                }}
            >
                {() =>
                    <>
                        {canCreate && search.trim().toLowerCase() === term &&
                            <Button
                                label={`Create “${search.trim()}”`}
                                pending={mutation.isPending}
                                onPress={() => mutation.mutate(kind === "tags"
                                    ? {
                                        action: "tag",
                                        name: search.trim(),
                                        selected: true
                                    }
                                    : { action: "create-collection", title: search.trim() }, { onSuccess: () => setSearch("") })}
                            />
                        }
                        <FlatList
                            data={filtered}
                            style={{ maxHeight: 330, flexShrink: 1 }}
                            nestedScrollEnabled
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            initialNumToRender={8}
                            ListEmptyComponent={
                                <AppText muted>
                                    {search ? "No matches. Create one above." : `No ${kind} yet. Start typing to create one.`}
                                </AppText>
                            }
                            renderItem={({ item }) =>
                                <Pressable
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: item.selected, disabled: mutation.isPending }}
                                    disabled={mutation.isPending}
                                    onPress={() => mutation.mutate(kind === "tags"
                                        ? {
                                            action: "tag",
                                            name: item.title,
                                            selected: !item.selected
                                        }
                                        : { action: "collection", collectionId: Number(item.id), selected: !item.selected })}
                                    style={{
                                        minHeight: 64,
                                        flexDirection: "row",
                                        gap: 12,
                                        alignItems: "center",
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border
                                    }}
                                >
                                    <Icon
                                        size={18}
                                        color={item.selected ? colors.accent : colors.muted}
                                    />
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <AppText>
                                            {item.title}
                                        </AppText>
                                        <AppText
                                            muted
                                            style={{ fontSize: 11 }}
                                        >
                                            {item.detail}
                                        </AppText>
                                    </View>
                                    {item.selected &&
                                        <Check size={19} color={colors.accent}/>
                                    }
                                </Pressable>
                            }
                        />
                    </>
                }
            </QueryPanel>
            <Button
                label="Done"
                fullWidth
                secondary
                disabled={mutation.isPending}
                onPress={dismiss}
            />
        </ActionSheet>
    );
}

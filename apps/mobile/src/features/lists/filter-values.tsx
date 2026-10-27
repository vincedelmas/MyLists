import {SearchField} from "../../components/search-field";
import {useState} from "react";
import {Check} from "lucide-react-native";
import {StyleSheet, FlatList, Pressable, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AppText, Button, StateView} from "../../components/ui";
import {colors} from "../../theme";
import type {api, MediaType} from "../../lib/api-client";
import {listFilterSearchOptions} from "../../lib/react-query/query-options/media.options";
import {useDebouncedValue} from "../../hooks/use-debounced-value";


export type FilterGroup = Awaited<ReturnType<typeof api.listFilters>>["groups"][number] | {
    key: "status";
    label: string;
    searchable: boolean;
    options: string[];
};


interface FilterValuesProps {
    group: FilterGroup;
    userId?: number;
    close: () => void;
    selected: string[];
    mediaType: MediaType;
    onChange: (values: string[]) => void;
}


export function FilterValues({ mediaType, userId, group, selected, onChange, close }: FilterValuesProps) {
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
        <View style={styles.header}>
            <View style={styles.headingRow}>
                <AppText
                    heading
                    style={styles.title}
                >
                    {group.label}
                </AppText>
                <Button
                    label="Done"
                    onPress={close}
                    secondary={true}
                />
            </View>
            <SearchField
                clearable
                value={text}
                autoCorrect={false}
                onChangeText={setText}
                label={`Find ${group.label.toLowerCase()}`}
                placeholder={group.searchable ? "Type at least two characters…" : "Search options…"}
            />
            <View style={styles.headingRow}>
                <AppText
                    muted
                    style={styles.selectedCount}
                >
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
                <FlatList
                    horizontal
                    data={selected}
                    keyExtractor={(value) => value}
                    style={styles.selectedList}
                    contentContainerStyle={styles.selectedContent}
                    renderItem={({ item: value }) => (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${value}`}
                            style={styles.selectedChip}
                            onPress={() => onChange(selected.filter((name) => name !== value))}
                        >
                            <AppText style={styles.selectedCount}>
                                {value} ×
                            </AppText>
                        </Pressable>
                    )
                    }
                />
            )
            }
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
                        style={styles.optionRow}
                    >
                        <View
                            style={[styles.checkbox, selected.includes(item) && styles.selectedCheckbox]}
                        >
                            {selected.includes(item) &&
                                <Check size={16} color={colors.text}/>
                            }
                        </View>
                        <AppText style={styles.optionLabel}>
                            {item}
                        </AppText>
                    </Pressable>
                )
                }
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


const styles = StyleSheet.create({
    header: { flex: 1, padding: 16, gap: 12 },
    headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 20 },
    selectedCount: { fontSize: 12 },
    selectedList: { flexGrow: 0, maxHeight: 48 },
    selectedContent: { gap: 6, alignItems: "center" },
    selectedChip: { padding: 8, borderRadius: 8, backgroundColor: colors.secondary },
    optionRow: {
        gap: 12,
        paddingVertical: 14,
        alignItems: "center",
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    selectedCheckbox: { borderColor: colors.accent, backgroundColor: colors.primary },
    checkbox: {
        borderColor: colors.muted,
        backgroundColor: "transparent",
        width: 22,
        height: 22,
        borderWidth: 1,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center"
    },
    optionLabel: { flex: 1 },
});

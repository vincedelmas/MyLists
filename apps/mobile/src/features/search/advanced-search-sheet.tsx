import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {StyleSheet, FlatList, Pressable, View} from "react-native";
import {ChevronRight} from "lucide-react-native";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {ActionSheet} from "../../components/action-sheet";
import {AppText, Button, Field, Select, StateView} from "../../components/ui";
import {SearchField} from "../../components/search-field";
import {ChoiceChips} from "../../components/choice-chips";
import {api, type SearchInput} from "../../lib/api-client";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {colors} from "../../theme";


type Filters = NonNullable<SearchInput["advancedFilters"]>;


export function AdvancedSearchSheet({ provider, query, applied, apply, dismiss }: {
    provider: Filters["provider"];
    query: string;
    applied?: Filters;
    apply: (value: Filters | undefined) => void;
    dismiss: () => void
}) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        const entries = Object.entries(applied ?? {})
            .filter(([key]) => key !== "provider")
            .map(([key, value]) => [key, String(value)]);

        return Object.fromEntries(entries);
    });
    const [error, setError] = useState("");
    const [chooser, setChooser] = useState<"platformId" | "genreId" | null>(null);
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim().toLowerCase());
    const options = useQuery({
        queryKey: ["game-search-options"],
        queryFn: ({ signal }) => api.gameSearchOptions(signal),
        enabled: provider === "igdb",
        staleTime: 86_400_000
    });
    const choices = chooser === "platformId" ? options.data?.platforms : options.data?.genres;
    const filtered = useMemo(() => choices?.filter(item => item.name.toLowerCase().includes(term)) ?? [], [choices, term]);
    const set = (key: string, value: string) => {
        setValues(previous => ({ ...previous, [key]: value }));
        setError("");
    };
    if (chooser) return (
        <ActionSheet
            title={chooser === "platformId" ? "Choose a platform" : "Choose a genre"}
            dismiss={() => setChooser(null)}
            scrollable={false}
        >
            <SearchField
                label="Search options"
                value={search}
                onChangeText={setSearch}
            />
            <Button
                secondary
                label="Any"
                onPress={() => {
                    set(chooser, "");
                    setChooser(null);
                }}
            />
            <FlatList
                data={filtered}
                style={styles.optionList}
                initialNumToRender={8}
                keyboardShouldPersistTaps="handled"
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={
                    <StateView
                        loading={options.isPending}
                        title={options.error ? "Couldn’t load options" : "No matching options"}
                        retry={options.error ? () => void options.refetch() : undefined}
                    />
                }
                renderItem={({ item }) =>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            set(chooser, String(item.id));
                            setChooser(null);
                        }}
                        style={styles.optionRow}
                    >
                        <AppText>
                            {item.name}
                        </AppText>
                    </Pressable>
                }
            />
        </ActionSheet>
    );

    return (
        <ActionSheet
            title="Advanced search"
            dismiss={dismiss}
            error={error}
        >
            {provider === "tmdb"
                ? <>
                    <AppText muted>
                        Choose a media type to narrow by release year.
                    </AppText>
                    <ChoiceChips
                        label="Media type"
                        value={values.mediaType ?? ""}
                        options={[
                            { value: "", label: "All media" },
                            {
                                value: "series",
                                label: "TV shows"
                            },
                            { value: "movies", label: "Movies" }
                        ]}
                        onChange={value => {
                            set("mediaType", value);
                            if (!value) set("releaseYear", "");
                        }}
                    />
                    {values.mediaType &&
                        <Field
                            label={values.mediaType === "movies" ? "Release year" : "First-air year"}
                            value={values.releaseYear ?? ""}
                            onChangeText={value => set("releaseYear", value)}
                            keyboardType="number-pad"
                            maxLength={4}
                        />
                    }
                </>
                : provider === "books"
                    ? <>
                        {[
                            { key: "author", label: "Author" },
                            { key: "subject", label: "Subject" },
                            { key: "publisher", label: "Publisher" },
                            { key: "isbn", label: "ISBN" },
                            {
                                key: "language",
                                label: "Language · two-letter code"
                            }
                        ].map(item =>
                            <Field
                                key={item.key}
                                label={item.label}
                                value={values[item.key] ?? ""}
                                onChangeText={value => set(item.key, value)}
                                autoCorrect={false}
                            />)
                        }
                        <Select
                            label="Order"
                            value={values.orderBy ?? ""}
                            onChange={value => set("orderBy", value)}
                            options={[
                                { value: "", label: "Default" },
                                { value: "relevance", label: "Relevance" },
                                { value: "newest", label: "Newest" }
                            ]}
                        />
                        <Select
                            label="Print type"
                            value={values.printType ?? ""}
                            onChange={value => set("printType", value)}
                            options={[
                                { value: "", label: "Any" },
                                { value: "books", label: "Books" },
                                { value: "magazines", label: "Magazines" }
                            ]}
                        />
                        <Select
                            label="Availability"
                            value={values.availability ?? ""}
                            onChange={value => set("availability", value)}
                            options={[
                                { value: "", label: "Any" },
                                { value: "partial", label: "Preview available" },
                                { value: "full", label: "Full view" },
                                {
                                    value: "free-ebooks",
                                    label: "Free ebooks"
                                },
                                { value: "paid-ebooks", label: "Paid ebooks" },
                                { value: "ebooks", label: "All ebooks" }
                            ]}
                        />
                    </>
                    : <>
                        {(["platformId", "genreId"] as const).map(key =>
                            <Pressable
                                key={key}
                                accessibilityRole="button"
                                onPress={() => {
                                    setSearch("");
                                    setChooser(key);
                                }}
                                style={styles.filterRow}
                            >
                                <View style={styles.filterLabel}>
                                    <AppText
                                        muted
                                        style={styles.filterCaption}
                                    >
                                        {key === "platformId" ? "Platform" : "Genre"}
                                    </AppText>
                                    <AppText>
                                        {(key === "platformId" ? options.data?.platforms : options.data?.genres)?.find(item => String(item.id) === values[key])?.name ?? "Any"}
                                    </AppText>
                                </View>
                                <ChevronRight size={18} color={colors.muted}/>
                            </Pressable>)
                        }
                        {[
                            { key: "releaseYearFrom", label: "Released from" },
                            { key: "releaseYearTo", label: "Released until" },
                            {
                                key: "minimumRating",
                                label: "Minimum rating · 0–100"
                            }
                        ].map(item =>
                            <Field
                                key={item.key}
                                label={item.label}
                                value={values[item.key] ?? ""}
                                onChangeText={value => set(item.key, value)}
                                keyboardType="number-pad"
                            />)
                        }
                    </>
            }
            <Button
                fullWidth
                label="Apply filters"
                onPress={() => {
                    const numbers = new Set(["releaseYear", "releaseYearFrom", "releaseYearTo", "minimumRating", "genreId", "platformId"]);
                    const entries = Object.entries(values)
                        .filter(([, value]) => value.trim())
                        .map(([key, value]) => [key, numbers.has(key) ? Number(value) : value.trim()]);
                    const advancedFilters = { provider, ...Object.fromEntries(entries) };
                    const parsed = navbarSearchSchema.safeParse({
                        query,
                        apiProvider: provider,
                        page: 1,
                        advancedFilters
                    });
                    if (!parsed.success) {
                        setError(parsed.error.issues[0].message);

                        return;
                    }
                    apply(parsed.data.advancedFilters);
                    dismiss();
                }}
            />
            <Button
                fullWidth
                secondary
                label="Clear filters"
                onPress={() => {
                    apply(undefined);
                    dismiss();
                }}
            />
        </ActionSheet>
    );
}


const styles = StyleSheet.create({
    optionList: { maxHeight: 340, flexShrink: 1 },
    optionRow: { minHeight: 52, paddingVertical: 14 },
    filterRow: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
    },
    filterLabel: { flex: 1, gap: 5 },
    filterCaption: { fontSize: 12 },
});

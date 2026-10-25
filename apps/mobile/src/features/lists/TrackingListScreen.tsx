import {FilterValuesSheet} from "./filter-values-sheet";
import {useState} from "react";
import {router, useIsFocused} from "expo-router";
import {mediaLabels} from "../../lib/media";
import {useLocalSearchParams} from "expo-router";
import {useTabPush} from "../../hooks/use-tab-push";
import type {MediaType} from "../../lib/api-client";
import {MediaList} from "../../components/media-list";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {View} from "react-native";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {parseListFilters, countListFilters} from "./list-filters";
import {AppText, Button, Field, Page, Select} from "../../components/ui";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {listOptions} from "../../lib/react-query/query-options/media.options";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";


export function TrackingListScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const [statusesOpen, setStatusesOpen] = useState(false);
    const settings = useQuery({ ...settingsOptions, enabled: focused });
    const [selectedLayout, setLayout] = useState<MediaLayout | null>(null);
    const layout = selectedLayout ?? (settings.data?.gridListView === false ? "list" : "grid");

    const debounced = useDebouncedValue(search.trim());
    const { mediaType, userId, filters: serializedFilters } = useLocalSearchParams<{ mediaType: MediaType; userId?: string; filters?: string }>();

    const filters = parseListFilters(serializedFilters);
    const count = countListFilters({ ...filters, status: undefined });
    const sorting = filters.sorting ?? getMediaDefinition(mediaType).sorting.default;

    const query = useInfiniteQuery({
        ...listOptions(mediaType, { ...filters, search: debounced, sorting }, userId ? Number(userId) : undefined),
        enabled: focused,
    });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items.map((item) => ({ ...item, mediaType }))) ?? [];

    return (
        <Page
            back={true}
            title={mediaLabels[mediaType] ?? "List"}
            action={<LayoutToggle value={layout} onChange={setLayout}/>}
            subtitle={first ? `${first.pagination.totalItems.toLocaleString()} entries` : undefined}
        >
            <View style={{ padding: 16, gap: 12 }}>
                <Field
                    clearable
                    value={search}
                    autoCorrect={false}
                    returnKeyType="search"
                    label="Search this list"
                    onChangeText={setSearch}
                    placeholder="Find a title…"
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <AppText muted style={{ fontSize: 12, marginBottom: 8 }}>Status</AppText>
                        <Button
                            secondary
                            label={!filters.status?.length ? "All statuses" : filters.status.length === 1 ? filters.status[0] : `${filters.status.length} statuses`}
                            onPress={() => setStatusesOpen(true)}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Select
                            label="Sort by"
                            value={sorting}
                            options={getMediaSortOptions([mediaType], true)}
                            onChange={(sorting) => router.setParams({ filters: JSON.stringify({ ...filters, sorting }) })}
                        />
                    </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Button
                        secondary
                        label={`Filters${count ? ` · ${count}` : ""}`}
                        onPress={() =>
                            push({
                                pathname: "/lists/[mediaType]/filters",
                                params: { mediaType, userId, filters: serializedFilters },
                            })
                        }
                    />

                </View>
            </View>
            <MediaList
                key={`${mediaType}:${debounced}:${serializedFilters}`}
                query={query}
                items={items}
                layout={layout}
                ratingSystem={first?.ratingSystem ?? "score"}
                emptyTitle="No matching titles"
                emptyMessage="Try different filters or add something from Search."
                footer={items.length > 0 && (
                    <AppText muted style={{ textAlign: "center", padding: 20 }}>
                        {query.hasNextPage ? "Scroll for more" : "You’re all caught up"}
                    </AppText>
                )}
            />
            {statusesOpen && (
                <FilterValuesSheet
                    mediaType={mediaType}
                    userId={userId ? Number(userId) : undefined}
                    group={{ key: "status", label: "Status", searchable: false, options: [...getMediaDefinition(mediaType).statuses] }}
                    selected={filters.status ?? []}
                    close={() => setStatusesOpen(false)}
                    onChange={(status) => router.setParams({ filters: JSON.stringify({ ...filters, status: status.length ? status : undefined }) })}
                />

            )}

        </Page>
    );
}

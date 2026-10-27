import {useState} from "react";
import {router, useIsFocused, useLocalSearchParams} from "expo-router";
import type {TabParamList} from "../../lib/navigation.types";
import {useNavigation, type NavigationProp} from "expo-router/react-navigation";
import {useQuery} from "@tanstack/react-query";
import {Row, Switch, Text as NativeText} from "@expo/ui";
import {ScrollView, View} from "react-native";
import {AppText, Button, MenuRow, Page, QueryPanel, Section} from "../../components/ui";
import {NativeHost} from "../../components/native-host";
import {colors} from "../../theme";
import type {MediaType} from "../../lib/api-client";
import {listFiltersOptions} from "../../lib/react-query/query-options/media.options";
import {countListFilters, parseListFilters} from "./list-filters";


import type {FilterGroup} from "./filter-values";
import {FilterValuesSheet} from "./filter-values-sheet";


export function ListFiltersScreen() {
    const focused = useIsFocused();
    const navigation = useNavigation();
    const [group, setGroup] = useState<FilterGroup | null>(null);
    const params = useLocalSearchParams<{ mediaType: MediaType; userId?: string; filters?: string }>();

    const { mediaType } = params;
    const userId = params.userId ? Number(params.userId) : undefined;

    const [draft, setDraft] = useState(() => parseListFilters(params.filters));
    const query = useQuery({ ...listFiltersOptions(mediaType, userId), enabled: focused });

    const count = countListFilters({ ...draft, status: undefined });

    return (
        <Page
            back={true}
            brand={true}
            title="Filter your list"
            action={
                <Button
                    secondary
                    label="Reset"
                    onPress={() => setDraft({ status: draft.status, sorting: draft.sorting })}
                />
            }
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}
            >
                <AppText
                    muted
                    style={{ fontSize: 12 }}
                >
                    Match any selected value within a category, and all selected categories together.
                </AppText>
                <QueryPanel query={query}>
                    {(data) =>
                        <>
                            <Section title="Refine your list">
                                {data.groups.map((item) => {
                                    const selected = draft[item.key] ?? [];

                                    return (
                                        <MenuRow
                                            key={item.key}
                                            title={item.label}
                                            onPress={() => setGroup(item)}
                                            detail={selected.length ? selected.join(", ") : "Any"}
                                        />
                                    );
                                })
                                }
                            </Section>
                            <Section title="Personal filters">
                                <View style={{ padding: 16, gap: 18 }}>
                                    {([
                                        { key: "favorite", label: "Favorites only" },
                                        { key: "comment", label: "With comments" },
                                        ...(userId
                                            ? [
                                                { key: "hideCommon" as const, label: "Hide titles in my list" }
                                            ]
                                            : []),
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
                                        ))
                                    }
                                </View>
                            </Section>
                        </>
                    }
                </QueryPanel>
            </ScrollView>
            <View
                style={{
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface
                }}
            >
                <Button
                    disabled={query.isPending || query.isError}
                    label={`Apply${count ? ` ${count}` : ""} filters`}
                    onPress={() => {
                        const tabs = navigation.getParent<NavigationProp<TabParamList>>()!.getState();
                        const tab = tabs.routes[tabs.index].name;

                        router.dismissTo({
                            pathname: `/(tabs)/${tab}/lists/[mediaType]`,
                            params: { mediaType, userId: params.userId, filters: JSON.stringify(draft) },
                        });
                    }}
                />
            </View>
            {group &&
                <FilterValuesSheet
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
            }
        </Page>
    );
}

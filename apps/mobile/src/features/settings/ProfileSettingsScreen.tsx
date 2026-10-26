import {Eye, Pin} from "lucide-react-native";
import {colors} from "../../theme";
import {memo, useCallback, useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {FlatList, View} from "react-native";
import {Switch} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {AppText, Field, Page, QueryPanel, StateView, Section, uiStyles} from "../../components/ui";
import {MAX_PROFILE_PINS} from "@/lib/schemas/profile-pins.schema";
import {profileSettingsOptions} from "../../lib/react-query/query-options/settings.options";
import {libraryOptions} from "../../lib/react-query/query-options/library.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {SettingsFeedback} from "./settings-feedback";

export function ProfileSettingsScreen() {
    const focused = useIsFocused();
    const settings = useQuery({ ...profileSettingsOptions, enabled: focused });
    const mutation = useSettingsMutation();
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const searching = search.trim() !== term;
    const library = useInfiniteQuery({ ...libraryOptions(term), enabled: focused && !searching });
    const items = useMemo(() => searching ? [] : library.data?.pages.flatMap(page => [
        ...page.dynamic.map(item => ({ ...item, kind: "dynamic" as const })),
        ...page.collections.map(item => ({ ...item, kind: "collection" as const })),
    ]) ?? [], [library.data, searching]);
    const { mutate } = mutation;
    const toggle = useCallback((item: PinList, pinned: boolean) => mutate({ section: "pin", kind: item.kind, id: item.id, pinned }), [mutate]);

    return <Page title="Profile customization" back>
        <QueryPanel query={settings}>{data => <FlatList
            windowSize={7} initialNumToRender={8} maxToRenderPerBatch={8}
            data={items} keyExtractor={item => `${item.kind}:${item.id}`} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReachedThreshold={0.5} onEndReached={() => {
            if (focused && !searching && library.hasNextPage && !library.isFetching && !library.isError) void library.fetchNextPage();
        }}
            ListHeaderComponent={<View style={{ gap: 20, paddingBottom: 16 }}>
                <Section title="Continue preview" icon={<Eye size={18} color={colors.accent}/>}><View style={uiStyles.padded}>
                    <NativeHost><Switch label="Show Continue on my profile" value={data.showContinue} disabled={mutation.isPending}
                                        onValueChange={showContinue => mutation.mutate({ section: "profile", showContinue })}/></NativeHost>
                    <AppText muted style={{ fontSize: 12 }}>Show your current media in your profile overview, for you and your visitors. Continue is always available from
                        Lists.</AppText>
                </View></Section>
                <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Pin size={18} color={colors.accent}/><AppText heading style={{
                    fontSize: 17,
                    flex: 1
                }}>Pinned lists & collections</AppText></View><AppText muted style={{ fontSize: 12 }}>Pin up
                    to {MAX_PROFILE_PINS} dynamic lists and collections to your overview. Visitors only see pins they can access.</AppText><AppText muted
                                                                                                                                                    style={{
                                                                                                                                                        fontSize: 12,
                                                                                                                                                        color: colors.accent
                                                                                                                                                    }}>{data.pins.length} of {MAX_PROFILE_PINS} pinned
                    · Changes save automatically</AppText></View>
                <SettingsFeedback error={mutation.error?.message}/>
                <Field label="Find a list or collection" placeholder="Search by name…" autoCorrect={false} value={search} clearable onChangeText={setSearch}/>
            </View>}
            renderItem={({ item }) => {
                const pinned = data.pins.some(pin => pin.kind === item.kind && pin.id === item.id);
                return <ProfilePinRow item={item} pinned={pinned} disabled={mutation.isPending || (!pinned && data.pins.length >= MAX_PROFILE_PINS)} toggle={toggle}/>;
            }}
            ListEmptyComponent={<StateView loading={library.isPending || searching} title={library.error ? "Couldn’t load lists" : "No saved lists or collections found"}
                                           message={library.error?.message} retry={library.error ? () => void library.refetch() : undefined}/>}
            ListFooterComponent={library.isFetchingNextPage ? <StateView loading/> : library.error && items.length ?
                <StateView title="Couldn’t load more lists" retry={() => void library.fetchNextPage()}/> : undefined}
        />}</QueryPanel>
    </Page>;
}

type PinList = { kind: "dynamic" | "collection"; id: number; title: string };

const ProfilePinRow = memo(function ProfilePinRow({ item, pinned, disabled, toggle }: {
    item: PinList;
    pinned: boolean;
    disabled: boolean;
    toggle: (item: PinList, pinned: boolean) => void
}) {
    return <View
        style={{ padding: 14, marginBottom: 8, gap: 6, borderRadius: 14, borderWidth: 1, borderColor: pinned ? colors.primary : colors.border, backgroundColor: colors.surface }}>
        <NativeHost><Switch label={item.title} value={pinned} disabled={disabled} onValueChange={value => toggle(item, value)}/></NativeHost>
        <AppText muted style={{ fontSize: 11 }}>{item.kind === "dynamic" ? "Dynamic list" : "Collection"}{pinned ? " · Pinned" : ""}</AppText>
    </View>;
});

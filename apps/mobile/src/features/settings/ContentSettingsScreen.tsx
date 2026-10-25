import {useState} from "react";
import {View} from "react-native";
import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {mediaLabels, compareMediaTypes} from "../../lib/media";
import {useQuery} from "@tanstack/react-query";
import {NativeHost} from "../../components/native-host";
import {AppText, Page, QueryPanel} from "../../components/ui";
import type {MediaType, MobileSettings} from "../../lib/api-client";
import {Button, Column, FieldGroup, Picker, Switch, Text} from "@expo/ui";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";


function ContentForm({ data }: { data: MobileSettings }) {
    const mutation = useSettingsMutation();
    const [lists, setLists] = useState(data.lists);
    const [ratingSystem, setRatingSystem] = useState(data.ratingSystem);
    const [gridListView, setGridListView] = useState(data.gridListView);
    const [searchSelector, setSearchSelector] = useState(data.searchSelector);
    const [autoMove, setAutoMove] = useState(data.autoMoveCompletedTvToOnHold);

    const changeList = (mediaType: MediaType, key: "active" | "releaseNotificationsEnabled", value: boolean) => {
        setLists((items) => {
            return items.map((item) => (item.mediaType === mediaType ? { ...item, [key]: value } : item))
        });
        mutation.reset();
    };

    const save = () => {
        mutation.mutate({
            ratingSystem,
            section: "content",
            gridListView,
            searchSelector,
            autoMoveCompletedTvToOnHold: autoMove,
            anime: lists.find((item) => item.mediaType === "anime")!.active,
            games: lists.find((item) => item.mediaType === "games")!.active,
            books: lists.find((item) => item.mediaType === "books")!.active,
            manga: lists.find((item) => item.mediaType === "manga")!.active,
            releaseNotificationsEnabled: Object.fromEntries(
                lists.map((item) => [item.mediaType, item.releaseNotificationsEnabled]),
            ) as Record<MediaType, boolean>,
        });
    }

    return (
        <View style={{ flex: 1 }}>
            {mutation.error &&
                <AppText accessibilityRole="alert" style={{ color: colors.error, padding: 16 }}>
                    {mutation.error.message}
                </AppText>
            }

            {mutation.isSuccess &&
                <AppText accessibilityRole="alert" style={{ color: colors.accent, padding: 16 }}>
                    Content settings saved.
                </AppText>
            }

            <NativeHost matchContents={false} style={{ flex: 1 }}>
                <FieldGroup>
                    <FieldGroup.Section title="Active media lists">
                        {[...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).map((item) =>
                            <Switch
                                value={item.active}
                                key={item.mediaType}
                                label={mediaLabels[item.mediaType]}
                                onValueChange={(value) => changeList(item.mediaType, "active", value)}
                                disabled={mutation.isPending || item.mediaType === "series" || item.mediaType === "movies"}
                            />
                        )}
                        <FieldGroup.SectionFooter>
                            <Text>
                                Disabling a list keeps its data and removes it from your published profile.
                            </Text>
                        </FieldGroup.SectionFooter>
                    </FieldGroup.Section>
                    <FieldGroup.Section title="Display preferences">
                        <Column spacing={8}>
                            <Text>Navbar Search Selector</Text>
                            <Picker selectedValue={searchSelector} enabled={!mutation.isPending} onValueChange={value => {
                                setSearchSelector(value);
                                mutation.reset();
                            }}>
                                <Picker.Item value="tmdb" label="Media"/><Picker.Item value="books" label="Books"/><Picker.Item value="igdb" label="Games"/><Picker.Item
                                value="manga" label="Manga"/><Picker.Item value="users" label="Users"/>
                            </Picker>
                        </Column>
                        <Column spacing={8}>
                            <Text>Default List View Mode</Text>
                            <Picker selectedValue={gridListView ? "grid" : "list"} enabled={!mutation.isPending} onValueChange={value => {
                                setGridListView(value === "grid");
                                mutation.reset();
                            }}>
                                <Picker.Item value="grid" label="Grid"/><Picker.Item value="list" label="List"/>
                            </Picker>
                        </Column>
                    </FieldGroup.Section>
                    <FieldGroup.Section title="Tracking preferences">
                        <Column spacing={8}>
                            <Text>Rating system</Text>
                            <Picker
                                selectedValue={ratingSystem}
                                enabled={!mutation.isPending}
                                onValueChange={(value) => {
                                    setRatingSystem(value);
                                    mutation.reset();
                                }}
                            >
                                <Picker.Item
                                    value="score"
                                    label="Score (numeric)"/>
                                <Picker.Item
                                    value="feeling"
                                    label="Feeling (emoticons)"
                                />
                            </Picker>
                        </Column>
                        <Switch
                            label="Move completed TV shows to On Hold when new episodes arrive"
                            value={autoMove}
                            disabled={mutation.isPending}
                            onValueChange={(value) => {
                                setAutoMove(value);
                                mutation.reset();
                            }}
                        />
                    </FieldGroup.Section>
                    <FieldGroup.Section title="Release notifications">
                        {[...lists]
                            .sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType))
                            .filter((item) => item.supportsNotifications)
                            .map((item) => (
                                <Switch
                                    key={item.mediaType}
                                    disabled={mutation.isPending}
                                    label={mediaLabels[item.mediaType]}
                                    value={item.releaseNotificationsEnabled}
                                    onValueChange={(val) => changeList(item.mediaType, "releaseNotificationsEnabled", val)}
                                />
                            ))}
                        <FieldGroup.SectionFooter>
                            <Text>Release alerts appear in your MyLists account.</Text>
                        </FieldGroup.SectionFooter>
                    </FieldGroup.Section>
                    <Button
                        onPress={save}
                        disabled={mutation.isPending}
                        label={mutation.isPending ? "Saving…" : "Save changes"}
                    />
                </FieldGroup>
            </NativeHost>
        </View>
    );
}


export function ContentSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });

    return (
        <Page title="Content & lists" back>
            <QueryPanel query={query}>
                {(data) => <ContentForm data={data}/>}
            </QueryPanel>
        </Page>
    );
}

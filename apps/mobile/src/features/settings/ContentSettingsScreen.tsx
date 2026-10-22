import {useIsFocused} from "expo-router";
import {useState} from "react";
import {View} from "react-native";
import {Button, Column, FieldGroup, Picker, Switch, Text} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {useQuery} from "@tanstack/react-query";
import {AppText, Page, QueryPanel} from "../../components/ui";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import type {MediaType, MobileSettings} from "../../lib/api-client";
import {mediaLabels} from "../../lib/media";
import {colors} from "../../theme";

function ContentForm({data}: {data: MobileSettings}) {
    const [lists, setLists] = useState(data.lists);
    const [ratingSystem, setRatingSystem] = useState(data.ratingSystem);
    const [autoMove, setAutoMove] = useState(data.autoMoveCompletedTvToOnHold);
    const mutation = useSettingsMutation();
    const changeList = (mediaType: MediaType, key: "active" | "releaseNotificationsEnabled", value: boolean) => {
        setLists((items) => items.map((item) => (item.mediaType === mediaType ? {...item, [key]: value} : item)));
        mutation.reset();
    };
    const save = () =>
        mutation.mutate({
            section: "content",
            anime: lists.find((item) => item.mediaType === "anime")!.active,
            games: lists.find((item) => item.mediaType === "games")!.active,
            books: lists.find((item) => item.mediaType === "books")!.active,
            manga: lists.find((item) => item.mediaType === "manga")!.active,
            ratingSystem,
            autoMoveCompletedTvToOnHold: autoMove,
            gridListView: data.gridListView,
            searchSelector: data.searchSelector,
            releaseNotificationsEnabled: Object.fromEntries(
                lists.map((item) => [item.mediaType, item.releaseNotificationsEnabled]),
            ) as Record<MediaType, boolean>,
        });
    return (
        <View style={{flex: 1}}>
            {mutation.error && (
                <AppText accessibilityRole="alert" style={{color: colors.error, padding: 16}}>
                    {mutation.error.message}
                </AppText>
            )}
            {mutation.isSuccess && (
                <AppText accessibilityRole="alert" style={{color: colors.accent, padding: 16}}>
                    Content settings saved.
                </AppText>
            )}
            <NativeHost matchContents={false} style={{flex: 1}}>
                <FieldGroup>
                    <FieldGroup.Section title="Active media lists">
                        {lists.map((item) => (
                            <Switch
                                key={item.mediaType}
                                label={mediaLabels[item.mediaType]}
                                value={item.active}
                                disabled={
                                    mutation.isPending || item.mediaType === "series" || item.mediaType === "movies"
                                }
                                onValueChange={(value) => changeList(item.mediaType, "active", value)}
                            />
                        ))}
                        <FieldGroup.SectionFooter>
                            <Text>Disabling a list keeps its data and removes it from your published profile.</Text>
                        </FieldGroup.SectionFooter>
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
                                <Picker.Item value="score" label="Score · 0 to 10" />
                                <Picker.Item value="feeling" label="Feelings" />
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
                        {lists
                            .filter((item) => item.supportsNotifications)
                            .map((item) => (
                                <Switch
                                    key={item.mediaType}
                                    label={mediaLabels[item.mediaType]}
                                    value={item.releaseNotificationsEnabled}
                                    disabled={mutation.isPending}
                                    onValueChange={(value) =>
                                        changeList(item.mediaType, "releaseNotificationsEnabled", value)
                                    }
                                />
                            ))}
                        <FieldGroup.SectionFooter>
                            <Text>Release alerts appear in your MyLists account.</Text>
                        </FieldGroup.SectionFooter>
                    </FieldGroup.Section>
                    <Button
                        label={mutation.isPending ? "Saving…" : "Save changes"}
                        disabled={mutation.isPending}
                        onPress={save}
                    />
                </FieldGroup>
            </NativeHost>
        </View>
    );
}
export function ContentSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({...settingsOptions, enabled: focused});
    return (
        <Page title="Content & lists" back>
            <QueryPanel query={query}>{(data) => <ContentForm data={data} />}</QueryPanel>
        </Page>
    );
}

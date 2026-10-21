import {useIsFocused} from "expo-router";
import {useState} from "react";
import {Switch, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AppText, Button, Content, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";
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
        <Content>
            <Section title="Active media lists">
                <View style={uiStyles.padded}>
                    <AppText muted>Disabling a list keeps its data and removes it from your published profile.</AppText>
                    {lists.map((item) => (
                        <View key={item.mediaType} style={uiStyles.row}>
                            <AppText style={{flex: 1}}>{mediaLabels[item.mediaType]}</AppText>
                            <Switch
                                accessibilityLabel={`${mediaLabels[item.mediaType]} list`}
                                value={item.active}
                                disabled={
                                    mutation.isPending || item.mediaType === "series" || item.mediaType === "movies"
                                }
                                onValueChange={(value) => changeList(item.mediaType, "active", value)}
                                trackColor={{true: colors.primary}}
                                thumbColor={item.active ? colors.accent : colors.muted}
                            />
                        </View>
                    ))}
                </View>
            </Section>
            <Section title="Tracking preferences">
                <View style={uiStyles.padded}>
                    <Select
                        label="Rating system"
                        disabled={mutation.isPending}
                        value={ratingSystem}
                        onChange={(value) => {
                            setRatingSystem(value);
                            mutation.reset();
                        }}
                        options={[
                            {value: "score", label: "Score · 0 to 10"},
                            {value: "feeling", label: "Feelings"},
                        ]}
                    />
                    <View style={uiStyles.row}>
                        <AppText style={{flex: 1}}>Move completed TV shows to On Hold when new episodes arrive</AppText>
                        <Switch
                            accessibilityLabel="Automatically move completed shows to On Hold"
                            disabled={mutation.isPending}
                            value={autoMove}
                            onValueChange={(value) => {
                                setAutoMove(value);
                                mutation.reset();
                            }}
                            trackColor={{true: colors.primary}}
                        />
                    </View>
                </View>
            </Section>
            <Section title="Release notifications">
                <View style={uiStyles.padded}>
                    <AppText muted>Release alerts appear in your MyLists account.</AppText>
                    {lists
                        .filter((item) => item.supportsNotifications)
                        .map((item) => (
                            <View key={item.mediaType} style={uiStyles.row}>
                                <AppText style={{flex: 1}}>{mediaLabels[item.mediaType]}</AppText>
                                <Switch
                                    accessibilityLabel={`${mediaLabels[item.mediaType]} release notifications`}
                                    value={item.releaseNotificationsEnabled}
                                    disabled={mutation.isPending}
                                    onValueChange={(value) =>
                                        changeList(item.mediaType, "releaseNotificationsEnabled", value)
                                    }
                                    trackColor={{true: colors.primary}}
                                />
                            </View>
                        ))}
                </View>
            </Section>
            {mutation.error && (
                <AppText accessibilityRole="alert" style={{color: colors.error}}>
                    {mutation.error.message}
                </AppText>
            )}
            {mutation.isSuccess && (
                <AppText accessibilityRole="alert" style={{color: colors.accent}}>
                    Content settings saved.
                </AppText>
            )}
            <Button label="Save changes" pending={mutation.isPending} onPress={save} />
        </Content>
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

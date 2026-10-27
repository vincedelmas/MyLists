import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {useIsFocused} from "expo-router";
import {mediaLabels, compareMediaTypes} from "../../lib/media";
import {useQuery} from "@tanstack/react-query";
import {AppText, Button as AppButton, Content, Page, QueryPanel, Section} from "../../components/ui";
import type {MediaType, MobileSettings} from "../../lib/api-client";
import {ChoiceChips} from "../../components/choice-chips";
import {SettingSwitch} from "../../components/setting-switch";
import {SettingsFeedback} from "./settings-feedback";
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

    return <Content>
        <Section title="Active media lists"><View style={styles.group}>
            <AppText muted style={styles.description}>Disabling a list keeps its data and removes it from your published profile.</AppText>
            {[...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).map(item => <SettingSwitch key={item.mediaType} label={mediaLabels[item.mediaType]}
                                                                                                               value={item.active}
                                                                                                               disabled={mutation.isPending || item.mediaType === "series" || item.mediaType === "movies"}
                                                                                                               onChange={value => changeList(item.mediaType, "active", value)}/>)}
        </View></Section>
        <Section title="Display preferences"><View style={styles.group}><AppText style={styles.label}>Default search category</AppText><ChoiceChips disabled={mutation.isPending}
                                                                                                                                                    label="Default search category"
                                                                                                                                                    value={searchSelector}
                                                                                                                                                    options={[{
                                                                                                                                                        value: "tmdb",
                                                                                                                                                        label: "Movies & TV"
                                                                                                                                                    }, {
                                                                                                                                                        value: "books",
                                                                                                                                                        label: "Books"
                                                                                                                                                    }, {
                                                                                                                                                        value: "igdb",
                                                                                                                                                        label: "Games"
                                                                                                                                                    }, {
                                                                                                                                                        value: "manga",
                                                                                                                                                        label: "Manga"
                                                                                                                                                    }, {
                                                                                                                                                        value: "users",
                                                                                                                                                        label: "People"
                                                                                                                                                    }]} onChange={value => {
            setSearchSelector(value);
            mutation.reset();
        }}/>
            <AppText style={styles.label}>Default list view</AppText><ChoiceChips disabled={mutation.isPending} label="Default list view" value={gridListView ? "grid" : "list"}
                                                                                  options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }]}
                                                                                  onChange={value => {
                                                                                      setGridListView(value === "grid");
                                                                                      mutation.reset();
                                                                                  }}/>
        </View></Section>
        <Section title="Tracking preferences"><View style={styles.group}><AppText style={styles.label}>Rating system</AppText><ChoiceChips disabled={mutation.isPending}
                                                                                                                                           label="Rating system"
                                                                                                                                           value={ratingSystem} options={[{
            value: "score",
            label: "Score · 0–10"
        }, { value: "feeling", label: "Feeling" }]} onChange={value => {
            setRatingSystem(value);
            mutation.reset();
        }}/>
            <SettingSwitch label="Resume returning TV shows" description="Move completed shows to On Hold when new episodes arrive." value={autoMove} disabled={mutation.isPending}
                           onChange={value => {
                               setAutoMove(value);
                               mutation.reset();
                           }}/>
        </View></Section>
        <Section title="Release notifications"><View style={styles.group}><AppText muted style={styles.description}>Release alerts appear in your MyLists
            account.</AppText>{[...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).filter(item => item.supportsNotifications).map(item => <SettingSwitch
            key={item.mediaType} label={mediaLabels[item.mediaType]} value={item.releaseNotificationsEnabled} disabled={mutation.isPending}
            onChange={value => changeList(item.mediaType, "releaseNotificationsEnabled", value)}/>)}</View></Section>
        <SettingsFeedback error={mutation.error?.message} success={mutation.isSuccess && "Content settings saved."}/><AppButton fullWidth label="Save changes" onPress={save}
                                                                                                                                pending={mutation.isPending}/>
    </Content>;
}

const styles = StyleSheet.create({ group: { padding: 16, gap: 16 }, description: { fontSize: 12, lineHeight: 19 }, label: { fontSize: 14, fontWeight: "500" } });


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

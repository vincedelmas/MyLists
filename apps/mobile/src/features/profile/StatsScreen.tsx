import {useIsFocused} from "expo-router";
import {View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AppText, Content, Page, QueryPanel, Section, uiStyles} from "../../components/ui";
import {statsOptions} from "../../lib/react-query/query-options/profile.options";
import {mediaLabels, mediaColors} from "../../lib/media";
import {colors, statusColors} from "../../theme";
import {formatCount} from "./profile-formatting";

export function StatsScreen() {
    const focused = useIsFocused();
    const query = useQuery({...statsOptions, enabled: focused});
    return (
        <Page title="Statistics" back>
            <QueryPanel query={query}>
                {(items) => (
                    <Content>
                        {items.map((item) => (
                            <Section key={item.mediaType} title={mediaLabels[item.mediaType]}>
                                <View style={uiStyles.padded}>
                                    <AppText
                                        style={{
                                            color: mediaColors[item.mediaType],
                                            fontSize: 28,
                                            fontWeight: "700",
                                            lineHeight: 36,
                                        }}
                                    >
                                        {formatCount(item.totalEntries)} entries
                                    </AppText>
                                    <AppText muted>
                                        {formatCount(item.timeSpent)} hours · {item.entriesFavorites} favorites ·{" "}
                                        {item.entriesRated} rated
                                    </AppText>
                                    {item.statusList.map((status) => (
                                        <View key={status.status} style={{gap: 5}}>
                                            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                                                <AppText>{status.status}</AppText>
                                                <AppText muted>{status.count}</AppText>
                                            </View>
                                            <View
                                                style={{height: 5, borderRadius: 3, backgroundColor: colors.secondary}}
                                            >
                                                <View
                                                    style={{
                                                        height: 5,
                                                        borderRadius: 3,
                                                        width: `${item.totalEntries ? (status.count / item.totalEntries) * 100 : 0}%`,
                                                        backgroundColor: statusColors[status.status],
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </Section>
                        ))}
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}

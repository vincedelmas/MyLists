import {colors} from "../../theme";
import {router} from "expo-router";
import {useIsFocused} from "expo-router";
import {RefreshControl} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {mediaIcons, mediaLabels, mediaColors} from "../../lib/media";
import {listsSummaryOptions} from "../../lib/react-query/query-options/media.options";
import {AppText, Content, MenuRow, Page, QueryPanel, Section} from "../../components/ui";


export function ListsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...listsSummaryOptions, enabled: focused });
    return (
        <Page title="Lists" subtitle="Track what you watch, read, and play">
            <QueryPanel query={query}>
                {(data) => (
                    <Content
                        refreshControl={
                            <RefreshControl
                                refreshing={query.isRefetching}
                                onRefresh={() => void query.refetch()}
                                tintColor={colors.accent}
                            />
                        }
                    >
                        <Section title="Tracking lists">
                            {data.map((list) => {
                                const Icon = mediaIcons[list.mediaType];
                                return (
                                    <MenuRow
                                        key={list.mediaType}
                                        title={mediaLabels[list.mediaType]}
                                        detail={`${list.totalEntries.toLocaleString()} entries · ${list.entriesFavorites.toLocaleString()} favorites`}
                                        icon={<Icon size={24} color={mediaColors[list.mediaType]}/>}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/lists/[mediaType]",
                                                params: { mediaType: list.mediaType },
                                            })
                                        }
                                    />
                                );
                            })}
                        </Section>
                        <AppText muted>You can activate more media lists in content settings.</AppText>
                        <Section>
                            <MenuRow
                                title="Content settings"
                                detail="Active lists, ratings, and release preferences"
                                onPress={() => router.push("/settings/content")}
                            />
                        </Section>
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}

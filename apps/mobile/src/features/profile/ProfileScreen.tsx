import {router, useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {StyleSheet, Pressable, View} from "react-native";
import {Settings} from "lucide-react-native";
import {colors} from "../../theme";
import {Page, QueryPanel} from "../../components/ui";
import {profileOptions} from "../../lib/react-query/query-options/profile.options";
import {NotificationButton} from "./NotificationButton";
import {ProfileLayout} from "./profile-layout";


export function ProfileScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...profileOptions(), enabled: focused });

    return (
        <Page
            title="MyLists"
            brand
            action={
                <View style={styles.row}>
                    <NotificationButton/>
                    <Pressable
                        style={({ pressed }) => ([styles.action, { opacity: pressed ? 0.6 : 1 }])}
                        accessibilityRole="button"
                        accessibilityLabel="Settings"
                        onPress={() => router.push("/(tabs)/(profile)/settings")}
                    >
                        <Settings size={21} color={colors.muted}/>
                    </Pressable>
                </View>
            }
        >
            <QueryPanel query={query}>
                {(data) =>
                    <ProfileLayout data={data} refreshing={query.isRefetching}/>
                }
            </QueryPanel>
        </Page>
    );
}


const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    action: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center"
    },
});

import { router, useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable } from "react-native";
import { Settings } from "lucide-react-native";
import { colors } from "../../theme";
import { Page, QueryPanel } from "../../components/ui";
import { profileOptions } from "../../lib/react-query/query-options/profile.options";
import { ProfileLayout } from "./profile-layout";

export function ProfileScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...profileOptions(), enabled: focused });
    return (
        <Page
            title="MyLists"
            brand
            action={
                <Pressable
                    style={{ padding: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                    onPress={() => router.push("/(tabs)/(profile)/settings")}
                >
                    <Settings size={21} color={colors.muted} />
                </Pressable>
            }
        >
            <QueryPanel query={query}>
                {(data) => <ProfileLayout data={data} refreshing={query.isRefetching} />}
            </QueryPanel>
        </Page>
    );
}

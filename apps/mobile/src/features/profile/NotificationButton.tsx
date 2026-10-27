import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Bell} from "lucide-react-native";
import {Pressable, View} from "react-native";
import {AppText} from "../../components/ui";
import {notificationCountsOptions} from "../../lib/react-query/query-options/notifications.options";
import {useTabPush} from "../../hooks/use-tab-push";
import {colors} from "../../theme";


export function NotificationButton() {
    const focused = useIsFocused();
    const query = useQuery({ ...notificationCountsOptions, enabled: focused });
    const push = useTabPush();
    const count = query.data?.total ?? 0;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${count} unread`}
            onPress={() => push("/profile/notifications")}
            style={({ pressed }) => ({
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1
            })}
        >
            <Bell size={21} color={colors.muted}/>
            {count > 0 && (
                <View
                    style={{
                        position: "absolute",
                        top: 4,
                        right: 0,
                        minWidth: 17,
                        paddingHorizontal: 3,
                        borderRadius: 9,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                    }}
                >
                    <AppText
                        style={{
                            fontSize: 9,
                            lineHeight: 16,
                            color: colors.background,
                            fontWeight: "700"
                        }}
                    >
                        {count > 99 ? "99+" : count}
                    </AppText>
                </View>
            )
            }
        </Pressable>
    );
}

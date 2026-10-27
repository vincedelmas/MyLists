import {Platform, StyleSheet} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Tabs} from "expo-router";
import {colors} from "../../src/theme";
import {Library, Search, UsersRound, UserRound} from "lucide-react-native";


export const unstable_settings = { anchor: "(profile)" };


export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                lazy: true,
                headerShown: false,
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.muted,
                sceneStyle: styles.scene,
                tabBarLabelStyle: styles.label,
                tabBarStyle: [
                    styles.tabBar,
                    Platform.select({
                        android: { height: 56 + insets.bottom + 10, paddingTop: 4, paddingBottom: insets.bottom + 10 },
                    }),
                ],
            }}
        >
            <Tabs.Screen
                name="(profile)"
                options={{
                    title: "Profile",
                    href: "/(tabs)/(profile)",
                    tabBarIcon: ({ color, size }) =>
                        <UserRound color={color} size={size}/>,
                }
                }
            />
            <Tabs.Screen
                name="(library)"
                options={{
                    title: "Lists",
                    href: "/(tabs)/(library)/lists",
                    tabBarIcon: ({ color, size }) =>
                        <Library color={color} size={size}/>,
                }
                }
            />
            <Tabs.Screen
                name="(search)"
                options={{
                    title: "Search",
                    href: "/(tabs)/(search)/search",
                    tabBarIcon: ({ color, size }) =>
                        <Search color={color} size={size}/>,
                }
                }
            />
            <Tabs.Screen
                name="(community)"
                options={{
                    title: "Community",
                    href: "/(tabs)/(community)/community",
                    tabBarIcon: ({ color, size }) =>
                        <UsersRound color={color} size={size}/>,
                }
                }
            />
        </Tabs>
    );
}


const styles = StyleSheet.create({
    scene: { backgroundColor: colors.background },
    label: { fontSize: 11, fontWeight: "600" },
    tabBar: { backgroundColor: colors.surface, borderTopColor: colors.border },
});

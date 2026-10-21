import {Tabs} from "expo-router";
import {colors} from "../../src/theme";
import {Library, Search, Settings, UserRound} from "lucide-react-native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                lazy: true,
                headerShown: false,
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.muted,
                sceneStyle: { backgroundColor: colors.background },
                tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{ title: "Profile", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size}/> }}
            />
            <Tabs.Screen
                name="lists"
                options={{ title: "Lists", tabBarIcon: ({ color, size }) => <Library color={color} size={size}/> }}
            />
            <Tabs.Screen
                name="search"
                options={{ title: "Search", tabBarIcon: ({ color, size }) => <Search color={color} size={size}/> }}
            />
            <Tabs.Screen
                name="settings"
                options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Settings color={color} size={size}/> }}
            />
        </Tabs>
    );
}

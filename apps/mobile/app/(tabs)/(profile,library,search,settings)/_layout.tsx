import {Stack} from "expo-router";
import {colors} from "../../../src/theme";

export const unstable_settings = {
    anchor: "index",
    profile: {anchor: "index"},
    library: {anchor: "lists"},
    search: {anchor: "search"},
    settings: {anchor: "settings"},
};

export default function TabStack() {
    return <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.background}}} />;
}

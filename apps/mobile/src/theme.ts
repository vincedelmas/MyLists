import {StyleSheet} from "react-native";


export const colors = {
    background: "#0B0B0B",
    surface: "#111111",
    border: "#262626",
    secondary: "#262626",
    text: "#FAFAFA",
    muted: "#AFAFAF",
    accent: "#00BC7D",
    primary: "#006045",
    accentText: "#ECFDF5",
    error: "#FF6467",
    rating: "#F5A91F",
    favorite: "#FF6A68",
};


export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
};


export const mediaColors = {
    series: "#4AB6C7",
    anime: "#E28261",
    movies: "#CBAE53",
    books: "#AF95DF",
    games: "#47994B",
    manga: "#ED6C65",
};


export const statusColors: Record<string, string> = {
    Watching: "#5DB2CC",
    Reading: "#5DB2CC",
    Playing: "#5DB2CC",
    Completed: "#47C496",
    "On Hold": "#DEBA50",
    Multiplayer: "#E7C03A",
    Random: "#FD923E",
    Dropped: "#FF7064",
    Endless: "#7AB05A",
    "Plan to Watch": "#EC7380",
    "Plan to Read": "#EC7380",
    "Plan to Play": "#EC7380",
};


export const commonStyles = StyleSheet.create({
    disabled: { opacity: 0.5 }, pressed: { opacity: 0.7 },
    screen: { flex: 1, backgroundColor: colors.background },
    body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
    error: { color: colors.error, fontSize: 14, lineHeight: 21 },
    brand: { color: colors.text, fontSize: 20, fontWeight: "700" },
    eyebrow: { color: colors.accent, fontSize: 12, fontWeight: "600" },
    centered: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
    content: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 20 },
    buttonText: { color: colors.accentText, fontSize: 14, fontWeight: "600" },
    title: { color: colors.text, fontSize: 28, fontWeight: "700", lineHeight: 36 },
    button: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
});

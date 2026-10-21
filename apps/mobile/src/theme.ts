import {StyleSheet} from "react-native";


export const colors = {
    background: "#111816",
    surface: "#1A2420",
    border: "#34443B",
    text: "#F4F1E9",
    muted: "#A3B4AA",
    accent: "#AAE8BC",
    accentText: "#12251A",
    error: "#FFB4AB",
};

export const commonStyles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 28, gap: 24 },
    content: { width: "100%", maxWidth: 460, alignSelf: "center", gap: 24 },
    brand: { color: colors.accent, fontSize: 20, fontWeight: "800", letterSpacing: -0.6 },
    eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
    title: { color: colors.text, fontSize: 42, fontWeight: "700", letterSpacing: -1.8, lineHeight: 47 },
    body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
    error: { color: colors.error, fontSize: 14, lineHeight: 21 },
    button: { backgroundColor: colors.accent, borderRadius: 14, padding: 18, minHeight: 56, alignItems: "center" },
    buttonText: { color: colors.accentText, fontSize: 16, fontWeight: "700" },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.8 },
});

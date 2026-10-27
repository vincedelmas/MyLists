import {View} from "react-native";
import {AppText, Button} from "./ui";
import {colors} from "../theme";

export function PaginationBar({ page, pages, onChange, disabled }: { page: number; pages: number; onChange: (page: number) => void; disabled?: boolean }) {
    return <View
        style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: colors.border }}><Button
        secondary label="Previous" disabled={disabled || page <= 1} onPress={() => onChange(page - 1)}/><AppText accessibilityLiveRegion="polite" style={{
        fontSize: 12,
        fontVariant: ["tabular-nums"]
    }}>{page} / {Math.max(1, pages)}</AppText><Button secondary label="Next" disabled={disabled || page >= pages} onPress={() => onChange(page + 1)}/></View>;
}

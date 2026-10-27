import {StyleSheet, View} from "react-native";
import {AppText, Button} from "./ui";
import {colors} from "../theme";


interface PaginationBarProps {
    page: number;
    pages: number;
    disabled?: boolean;
    onChange: (page: number) => void;
}


export function PaginationBar({ page, pages, onChange, disabled }: PaginationBarProps) {
    return (
        <View
            style={styles.spreadRow}
        >
            <Button
                secondary
                label="Previous"
                disabled={disabled || page <= 1}
                onPress={() => onChange(page - 1)}
            />
            <AppText
                accessibilityLiveRegion="polite"
                style={styles.caption}
            >{page} / {Math.max(1, pages)}</AppText>
            <Button
                secondary
                label="Next"
                disabled={disabled || page >= pages}
                onPress={() => onChange(page + 1)}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    spreadRow: {
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border
    },
    caption: {
        fontSize: 12,
        fontVariant: ["tabular-nums"]
    },
});

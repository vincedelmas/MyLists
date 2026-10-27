import {StyleSheet, View} from "react-native";
import {Copy, Eye, Heart} from "lucide-react-native";
import {AppText} from "../../../components/ui";
import type {api} from "../../../lib/api-client";
import {formatNumber} from "@/lib/utils/formatting/number";
import {colors} from "../../../theme";


type Counters = Pick<Awaited<ReturnType<typeof api.communityCollections>>["items"][number], "likeCount" | "viewCount" | "copiedCount">;


export function CollectionStats({ collection, includeLikes = true }: { collection: Counters; includeLikes?: boolean }) {
    const counters = [
        { Icon: Heart, value: collection.likeCount, label: "likes" },
        { Icon: Eye, value: collection.viewCount, label: "views" },
        { Icon: Copy, value: collection.copiedCount, label: "copies" },
    ];

    return (
        <View style={styles.counters}>
            {counters.slice(includeLikes ? 0 : 1).map(({ Icon, value, label }) =>
                <View
                    key={label}
                    style={styles.counter}
                    accessibilityLabel={`${value} ${label}`}
                >
                    <Icon size={13} color={colors.muted}/>
                    <AppText muted style={styles.value}>
                        {formatNumber(value, { locale: "en" })}
                    </AppText>
                </View>
            )
            }
        </View>
    );
}


const styles = StyleSheet.create({
    counters: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16
    },
    counter: { flexDirection: "row", alignItems: "center", gap: 5 },
    value: { fontSize: 12 },
});

import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Layers3, LibraryBig} from "lucide-react-native";
import {api} from "../../lib/api-client";
import {MenuRow, QueryPanel, Section} from "../../components/ui";
import {useTabPush} from "../../hooks/use-tab-push";
import {colors} from "../../theme";
import {formatCount} from "./profile-formatting";

export function ProfilePinnedLists({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({ queryKey: ["profile", userId, "extras"], queryFn: ({ signal }) => api.profileExtras(signal, userId), select: data => data.pins, enabled: focused });
    if (query.data?.length === 0) return null;
    return (
        <QueryPanel query={query}>
            {items => (
                <Section title="Pinned lists & collections">
                    {items.map(item => {
                        const Icon = item.kind === "dynamic" ? Layers3 : LibraryBig;
                        return <MenuRow key={`${item.kind}:${item.id}`} title={item.title}
                                        detail={`${formatCount(item.total)} media · ${item.kind === "dynamic" ? "Dynamic list" : "Collection"}`}
                                        icon={<Icon size={18} color={colors.accent}/>}
                                        onPress={() => push({ pathname: "/library/[kind]", params: { kind: item.kind, id: item.id, userId } })}/>;
                    })}
                </Section>
            )}
        </QueryPanel>
    );
}

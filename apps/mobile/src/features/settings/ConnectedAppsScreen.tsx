import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {View} from "react-native";
import {Plug, Unplug} from "lucide-react-native";
import {setStringAsync} from "expo-clipboard";
import {api} from "../../lib/api-client";
import {backendUrl} from "../../lib/config";
import {connectedAppsOptions} from "../../lib/react-query/query-options/settings.options";
import {AppText, Button, Content, Page, QueryPanel, Section, uiStyles} from "../../components/ui";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useConfirmation} from "../../hooks/use-confirmation";
import {colors} from "../../theme";
import {SettingsFeedback} from "./settings-feedback";

const endpoint = new URL("/api/mcp", backendUrl).href;

export function ConnectedAppsScreen() {
    const focused = useIsFocused();
    const client = useQueryClient();
    const query = useQuery({ ...connectedAppsOptions, enabled: focused });
    const { confirmation, confirm, dismiss } = useConfirmation();
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState("");
    const mutation = useMutation({
        mutationFn: api.disconnectApp, onSuccess: async () => {
            dismiss();
            await client.invalidateQueries(connectedAppsOptions);
        }
    });

    return <Page title="Connected apps" back><Content>
        <Section title="Your lists, through your assistant" icon={<Plug size={18} color={colors.accent}/>}><View style={uiStyles.padded}>
            <AppText muted>Use an assistant that supports custom MCP connections to track your lists through conversation.</AppText>
            <AppText muted style={{ fontSize: 12 }}>Add this connection address in your assistant, then sign in to MyLists and approve its access.</AppText>
            <AppText selectable style={{ fontSize: 12, lineHeight: 20, padding: 12, borderRadius: 10, backgroundColor: colors.background }}>{endpoint}</AppText>
            <Button fullWidth secondary label="Copy address" onPress={() => {
                void setStringAsync(endpoint).then(() => {
                    setCopied(true);
                    setCopyError("");
                }).catch(() => setCopyError("Select and copy the connection address above."));
            }}/>
            <SettingsFeedback error={copyError} success={copied && "Connection address copied."}/>
        </View></Section>
        <QueryPanel query={query}>{connections => connections.length === 0 ?
            <Section title="No apps connected"><View style={uiStyles.padded}><AppText muted>Apps you authorize will appear here. You can disconnect them at any
                time.</AppText></View></Section> : connections.map(connection => <Section key={connection.clientId} title={connection.name || "Unnamed assistant"}
                                                                                          icon={<Plug size={18} color={colors.accent}/>}><View
                style={uiStyles.padded}>
                <AppText muted>{connection.scopes.includes("mylists:write") ? "Can read and update your lists, and save dynamic lists" : "Can read your lists"}</AppText>
                <AppText muted selectable style={{ fontSize: 11 }}>{connection.clientId}</AppText>
                <Button fullWidth secondary label="Disconnect" disabled={mutation.isPending} onPress={() => {
                    mutation.reset();
                    confirm({
                        title: "Disconnect this app?",
                        message: `${connection.name || "This assistant"} will lose access to your lists.`,
                        label: "Disconnect",
                        icon: Unplug,
                        closeOnConfirm: false,
                        onConfirm: () => mutation.mutate(connection.clientId)
                    });
                }}/>
            </View></Section>)}</QueryPanel>
    </Content><ConfirmationSheet confirmation={confirmation} dismiss={dismiss} pending={mutation.isPending} error={mutation.error?.message}/></Page>;
}

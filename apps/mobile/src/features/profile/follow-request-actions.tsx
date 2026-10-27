import {StyleSheet, View} from "react-native";
import type {api} from "../../lib/api-client";
import {Button} from "../../components/ui";


export function FollowRequestActions({ disabled, pendingAction, onAccept, onDecline }: {
    disabled: boolean;
    pendingAction?: Parameters<typeof api.socialAction>[0]["action"];
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <View style={styles.row}>
            <View style={styles.fill}>
                <Button
                    fullWidth
                    secondary
                    label="Decline"
                    disabled={disabled}
                    pending={pendingAction === "decline"}
                    onPress={onDecline}
                />
            </View>
            <View style={styles.fill}>
                <Button
                    fullWidth
                    label="Accept"
                    disabled={disabled}
                    pending={pendingAction === "accept"}
                    onPress={onAccept}
                />
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    row: { flexDirection: "row", gap: 12 },
    fill: { flex: 1 },
});

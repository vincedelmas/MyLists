import {View} from "react-native";
import type {api} from "../../lib/api-client";
import {Button} from "../../components/ui";


export function FollowRequestActions({ disabled, pendingAction, onAccept, onDecline }: {
    disabled: boolean;
    pendingAction?: Parameters<typeof api.socialAction>[0]["action"];
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
                <Button
                    fullWidth
                    secondary
                    label="Decline"
                    disabled={disabled}
                    pending={pendingAction === "decline"}
                    onPress={onDecline}
                />
            </View>
            <View style={{ flex: 1 }}>
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

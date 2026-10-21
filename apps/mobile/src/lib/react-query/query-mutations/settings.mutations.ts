import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api, type SettingsInput} from "../../api-client";
import {authClient} from "../../auth-client";

export const useSettingsMutation = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: SettingsInput) => api.saveSettings(input),
        onSuccess: async () => {
            authClient.$store.notify("$sessionSignal");
            await Promise.all(
                ["settings", "profile", "lists", "media"].map((key) => client.invalidateQueries({queryKey: [key]})),
            );
        },
    });
};

export const usePasswordMutation = () =>
    useMutation({
        mutationFn: async (input: {currentPassword: string; newPassword: string}) => {
            const result = await authClient.changePassword({...input, revokeOtherSessions: true});
            if (result.error) throw new Error(result.error.message ?? "Couldn’t change your password.");
        },
    });

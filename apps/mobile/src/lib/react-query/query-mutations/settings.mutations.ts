import {authClient} from "../../auth-client";
import {api, type SettingsInput} from "../../api-client";
import {useMutation, useQueryClient} from "@tanstack/react-query";


export const useSettingsMutation = () => {
    const client = useQueryClient();

    return useMutation({
        mutationFn: (input: SettingsInput) => api.saveSettings(input),
        onSuccess: async (_result, input) => {
            if (input.section === "pin" || input.section === "profile") {
                await Promise.all([
                    client.invalidateQueries({
                        queryKey: ["settings", "profile"],
                        exact: true
                    }),
                    client.invalidateQueries({
                        queryKey: ["profile", undefined, input.section === "pin" ? "extras" : "continue"],
                        exact: true
                    }),
                ]);

                return;
            }
            if (input.section === "general") authClient.$store.notify("$sessionSignal");
            await Promise.all(
                ["settings", "profile", "lists", "media"].map((key) => client.invalidateQueries({ queryKey: [key] })),
            );
        },
    });
};


export const usePasswordMutation = () => useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
        const result = await authClient.changePassword({ ...input, revokeOtherSessions: true });

        if (result.error) {
            throw new Error(result.error.message ?? "Couldn’t change your password.");
        }
    },
});

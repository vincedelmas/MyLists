import {authClient} from "../../auth-client";
import {useMutation} from "@tanstack/react-query";


export const useSignInMutation = () => useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
        const { error } = await authClient.signIn.email({ ...credentials, rememberMe: true }).catch(() => {
            throw new Error("We couldn’t reach MyLists. Check your connection and try again.");
        });

        if (!error) return;

        switch (error.code) {
            case "INVALID_EMAIL_OR_PASSWORD":
                throw new Error("The email or password is incorrect.");
            case "EMAIL_NOT_VERIFIED":
                throw new Error("Verify your email before signing in. You can request a new verification email on the MyLists website.");
            default:
                throw new Error(error.status === 429
                    ? "Too many attempts. Please wait a moment before trying again."
                    : "We couldn’t sign you in. Check your connection and try again.");
        }
    },
});


export const useSignOutMutation = () => useMutation({
    mutationFn: async () => {
        const { error } = await authClient.signOut().catch(() => {
            throw new Error("We couldn’t reach MyLists. Please try again.");
        });

        if (error) {
            throw new Error("We couldn’t sign you out. Please try again.");
        }
    },
});

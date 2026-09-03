import authClient from "@/lib/utils/auth-client";
import {ForgotPassword, Login, Register} from "@/lib/schemas";
import {MutationMeta, useMutation} from "@tanstack/react-query";


export type SocialProvider = "google" | "github";
export type AuthMutationError = Error & { code?: string };


export const useEmailLoginMutation = (meta?: MutationMeta) => {
    return useMutation<void, AuthMutationError, Login>({
        mutationFn: async (submitted) => {
            const { error } = await authClient.signIn.email({
                rememberMe: true,
                email: submitted.email,
                password: submitted.password,
            });

            if (error) throw error;
        },
        meta: { noErrorToast: true, ...meta },
    });
};


export const useEmailRegistrationMutation = (callbackURL: string, meta?: MutationMeta) => {
    return useMutation<void, AuthMutationError, Register>({
        mutationFn: async (submitted) => {
            const { error } = await authClient.signUp.email({
                callbackURL,
                email: submitted.email,
                name: submitted.username,
                password: submitted.password,
            });

            if (error) throw error;
        },
        meta: { noErrorToast: true, ...meta },
    });
};


export const useSocialSignInMutation = (callbacks: { callbackURL: string; errorCallbackURL: string; newUserCallbackURL: string }, meta?: MutationMeta) => {
    return useMutation<void, AuthMutationError, SocialProvider>({
        mutationFn: async (provider) => {
            const { error } = await authClient.signIn.social({ provider, ...callbacks });
            if (error) throw error;
        },
        meta,
    });
};


export const useResendVerificationEmailMutation = (callbackURL: string, meta?: MutationMeta) => {
    return useMutation<void, AuthMutationError, ForgotPassword>({
        mutationFn: async ({ email }) => {
            const { error } = await authClient.sendVerificationEmail({ email, callbackURL });
            if (error) throw error;
        },
        meta: {
            successToastMessage: "If the account still needs verification, a new email is on its way.",
            ...meta,
        },
    });
};

import {disconnectApp} from "@/lib/server/functions/mcp";
import {connectedAppsOptions} from "@/lib/client/react-query/query-options/auth.options";
import authClient from "@/lib/client/auth-client";
import {ForgotPassword, Login, Register} from "@/lib/schemas";
import {MutationMeta, useMutation, useQueryClient} from "@tanstack/react-query";


export type SocialProvider = "google" | "github";
export type AuthMutationError = Error & { code?: string };


export const useEmailLoginMutation = (meta?: MutationMeta) => {
    return useMutation<string | undefined, AuthMutationError, Login>({
        mutationFn: async (submitted) => {
            const { data, error } = await authClient.signIn.email({
                rememberMe: true,
                email: submitted.email,
                password: submitted.password,
            });

            if (error) throw error;
            if (data && "url" in data && typeof data.url === "string") return data.url;
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


export const useDisconnectAppMutation = (meta?: MutationMeta) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (clientId: string) => disconnectApp({ data: { clientId } }),
        meta: {
            successToastMessage: "App disconnected.",
            ...meta,
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: connectedAppsOptions.queryKey }),
    });
};


export const useMcpConsentMutation = ({ oauthQuery, scopes, readOnly }: { oauthQuery: string; scopes: string[]; readOnly: boolean }) => {
    return useMutation({
        mutationFn: async (accept: boolean) => {
            const { data, error } = await authClient.oauth2.consent({
                accept,
                oauth_query: oauthQuery,
                ...(readOnly ? { scope: scopes.filter(scope => scope !== "mylists:write").join(" ") } : {}),
            });

            if (error) throw error;

            return data;
        },
        onSuccess: result => window.location.assign(result.url),
    });
};

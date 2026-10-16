import {useState} from "react";
import {RefreshCw} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {Login, loginSchema} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {AuthState, getAuthState} from "@/lib/utils/auth";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {useEmailLoginMutation, useResendVerificationEmailMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


interface LoginFormProps {
    redirectTarget: string;
    passwordResetEnabled: boolean;
}


export const LoginForm = ({ redirectTarget, passwordResetEnabled }: LoginFormProps) => {
    const { completeSignIn } = useAuth();
    const loginMutation = useEmailLoginMutation();
    const [unverifiedEmail, setUnverifiedEmail] = useState<string>();
    const isAwaitingVerification = getAuthState(null, !!unverifiedEmail) === AuthState.AWAITING_EMAIL_VERIFICATION;
    const resendMutation = useResendVerificationEmailMutation(`/register?${new URLSearchParams({ redirect: redirectTarget })}`);

    const form = useForm<Login>({
        resolver: zodResolver(loginSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleSubmit = (submitted: Login) => {
        form.clearErrors("root");
        setUnverifiedEmail(undefined);

        loginMutation.mutate(submitted, {
            onError: (error) => {
                if (error.code === "EMAIL_NOT_VERIFIED") {
                    setUnverifiedEmail(submitted.email);
                    return;
                }

                handleServerFormErrors(form, error);
            },
            onSuccess: async (oauthRedirect) => {
                if (oauthRedirect) {
                    window.location.assign(oauthRedirect);
                    return;
                }
                await completeSignIn(redirectTarget);
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                <FieldSet disabled={loginMutation.isPending}>
                    <FieldGroup>
                        <FormTextField
                            name="email"
                            type="email"
                            label="Email"
                            placeholder="Email"
                            control={form.control}
                            disabled={loginMutation.isPending}
                        />
                        <FormTextField
                            type="password"
                            name="password"
                            label="Password"
                            control={form.control}
                            placeholder="********"
                            disabled={loginMutation.isPending}
                            labelAction={passwordResetEnabled ?
                                <Link to="/forgot-password" className="text-sm underline">
                                    Forgot password?
                                </Link>
                                :
                                <span className="text-xs text-muted-foreground">
                                    Reset unavailable
                                </span>
                            }
                        />
                    </FieldGroup>
                </FieldSet>

                {isAwaitingVerification && unverifiedEmail &&
                    <InlineErrorContainer onDismiss={() => setUnverifiedEmail(undefined)}>
                        <div className="flex flex-col items-start gap-2">
                            <p>Your email isn’t verified yet. Request a new verification email to continue.</p>

                            <LoadingButton
                                size="sm"
                                type="button"
                                variant="outline"
                                isLoading={resendMutation.isPending}
                                icon={<RefreshCw data-icon="inline-start" aria-hidden="true"/>}
                                onClick={() => resendMutation.mutate({ email: unverifiedEmail })}
                            >
                                {resendMutation.isPending ? "Sending email…" : "Resend verification email"}
                            </LoadingButton>
                        </div>
                    </InlineErrorContainer>
                }

                <FormError/>
                <LoadingButton type="submit" className="w-full" isLoading={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing you in…" : "Login"}
                </LoadingButton>
            </form>
        </FormProvider>
    );
};

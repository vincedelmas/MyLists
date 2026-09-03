import {useId, useState} from "react";
import {RefreshCw} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {Login, loginSchema} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {AuthState, getAuthState} from "@/lib/utils/auth-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {useEmailLoginMutation, useResendVerificationEmailMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


interface LoginFormProps {
    redirectTarget: string;
    passwordResetEnabled: boolean;
}


export const LoginForm = ({ redirectTarget, passwordResetEnabled }: LoginFormProps) => {
    const fieldId = useId();
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
            onSuccess: async () => {
                await completeSignIn(redirectTarget);
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                <FieldSet disabled={loginMutation.isPending}>
                    <FieldGroup>
                        <Controller
                            name="email"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={loginMutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                    <Input
                                        {...field}
                                        type="email"
                                        placeholder="Email"
                                        id={`${fieldId}-email`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={loginMutation.isPending}>
                                    <div className="flex items-center justify-between">
                                        <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                        {passwordResetEnabled
                                            ? <Link to="/forgot-password" className="text-sm underline">Forgot password?</Link>
                                            : <span className="text-xs text-muted-foreground">Reset unavailable</span>
                                        }
                                    </div>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="********"
                                        id={`${fieldId}-password`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </FieldSet>

                {isAwaitingVerification && unverifiedEmail &&
                    <InlineErrorContainer onDismiss={() => setUnverifiedEmail(undefined)}>
                        <div className="flex flex-col items-start gap-2">
                            <p>Your email isn’t verified yet. Request a new verification email to continue.</p>
                            <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                disabled={resendMutation.isPending}
                                aria-busy={resendMutation.isPending}
                                onClick={() => resendMutation.mutate({ email: unverifiedEmail })}
                            >
                                {resendMutation.isPending
                                    ? <Spinner data-icon="inline-start" aria-hidden="true"/>
                                    : <RefreshCw data-icon="inline-start" aria-hidden="true"/>
                                }
                                {resendMutation.isPending ? "Sending email…" : "Resend verification email"}
                            </Button>
                        </div>
                    </InlineErrorContainer>
                }

                <FormError/>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending} aria-busy={loginMutation.isPending}>
                    {loginMutation.isPending &&
                        <Spinner className="text-primary-foreground" data-icon="inline-start" aria-hidden="true"/>
                    }
                    {loginMutation.isPending ? "Signing you in…" : "Login"}
                </Button>
            </form>
        </FormProvider>
    );
};

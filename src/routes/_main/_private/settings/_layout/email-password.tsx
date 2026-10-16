import {useState} from "react";
import authClient from "@/lib/client/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {accountSecurityOptions} from "@/lib/client/react-query/query-options";
import {PasswordSettingsForm, passwordSettingsFormSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {usePasswordSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/email-password")({
    context: () => ({
        accountSecurityOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.accountSecurityOptions, staleTime: "static" });
    },
    component: EmailAndPasswordPage,
});


function EmailAndPasswordPage() {
    const { accountSecurityOptions } = Route.useRouteContext();
    const passwordMutation = usePasswordSettingsMutation({ noErrorToast: true });
    const [changeEmailSuccess, setChangeEmailSuccess] = useState(false);
    const { hasPassword, providers } = useSuspenseQuery(accountSecurityOptions).data;
    const passwordForm = useForm<PasswordSettingsForm>({
        resolver: zodResolver(passwordSettingsFormSchema),
        defaultValues: {
            newPassword: "",
            currentPassword: "",
            confirmNewPassword: ""
        },
    });
    const emailForm = useForm<{ email: string }>({
        defaultValues: {
            email: "",
        }
    });

    const onEmailSubmit = async (values: { email: string }) => {
        setChangeEmailSuccess(false);

        await authClient.changeEmail({ newEmail: values.email.trim() }, {
            onError: (ctx) => {
                handleServerFormErrors(emailForm, ctx.error);
            },
            onSuccess: () => {
                setChangeEmailSuccess(true);
                emailForm.reset();
            }
        });
    }

    const onPasswordSubmit = (values: PasswordSettingsForm) => {
        passwordMutation.mutate({
            data: {
                newPassword: values.newPassword,
                currentPassword: values.currentPassword,
            },
        }, {
            onError: (error) => {
                handleServerFormErrors(passwordForm, error);
            },
            onSuccess: () => {
                passwordForm.reset();
            },
        });
    };

    return (
        <div className="grid w-full max-w-3xl gap-8 md:grid-cols-2">
            <FormProvider {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex min-w-0 flex-col gap-4 border-b pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-8">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Email address</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Approve the change from your current email address, then verify the new address.
                        </p>
                    </div>
                    <FieldSet disabled={emailForm.formState.isSubmitting}>
                        <FieldGroup>
                            <FormTextField
                                name="email"
                                type="email"
                                label="New email address"
                                control={emailForm.control}
                                placeholder="new-email@example.com"
                                rules={{ required: "Email is required" }}
                                disabled={emailForm.formState.isSubmitting}
                            />
                        </FieldGroup>
                    </FieldSet>
                    {changeEmailSuccess &&
                        <p className="text-xs font-medium text-success">
                            Check your current inbox to approve the change.
                            After approval, check your new inbox to verify the new address.
                        </p>
                    }
                    <FormError/>
                    <FormSubmitButton isLoading={emailForm.formState.isSubmitting}>
                        Change Email
                    </FormSubmitButton>
                </form>
            </FormProvider>

            {hasPassword ?
                <FormProvider {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex min-w-0 flex-col gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                Password
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Confirm your current password before choosing a new one.
                            </p>
                        </div>
                        <FieldSet disabled={passwordMutation.isPending}>
                            <FieldGroup>
                                <FormTextField
                                    type="password"
                                    name="currentPassword"
                                    placeholder="********"
                                    label="Current password"
                                    control={passwordForm.control}
                                    disabled={passwordMutation.isPending}
                                />
                                <FormTextField
                                    type="password"
                                    name="newPassword"
                                    label="New password"
                                    placeholder="********"
                                    control={passwordForm.control}
                                    disabled={passwordMutation.isPending}
                                />
                                <FormTextField
                                    type="password"
                                    placeholder="********"
                                    name="confirmNewPassword"
                                    label="Confirm new password"
                                    control={passwordForm.control}
                                    disabled={passwordMutation.isPending}
                                />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <FormSubmitButton isLoading={passwordMutation.isPending}>
                            Update Password
                        </FormSubmitButton>
                    </form>
                </FormProvider>
                :
                <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                        Password
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Your account has no password because you sign in with{" "}
                        {providers.map((provider) => provider === "google" ? "Google" : "GitHub").join(" or ")}.
                        Manage your password with your sign-in provider.
                    </p>
                </div>
            }
        </div>
    );
}

import {useId, useState} from "react";
import {Controller, FormProvider, useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PasswordSettingsForm, passwordSettingsFormSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {usePasswordSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


export const Route = createFileRoute("/_main/_private/settings/_layout/email-password")({
    component: EmailAndPasswordPage,
});


function EmailAndPasswordPage() {
    const fieldId = useId();
    const passwordMutation = usePasswordSettingsMutation({ noErrorToast: true });
    const [changeEmailSuccess, setChangeEmailSuccess] = useState(false);
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
                            A confirmation link will be sent to the new address.
                        </p>
                    </div>
                    <FieldSet disabled={emailForm.formState.isSubmitting}>
                        <FieldGroup>
                            <Controller
                                name="email"
                                control={emailForm.control}
                                rules={{ required: "Email is required" }}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={emailForm.formState.isSubmitting}>
                                        <FieldLabel htmlFor={`${fieldId}-email`}>New email address</FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${fieldId}-email`}
                                            type="email"
                                            placeholder="new-email@example.com"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </FieldSet>
                    {changeEmailSuccess &&
                        <p className="text-xs font-medium text-success">
                            Check your inbox to confirm your change of email address.
                        </p>
                    }
                    <FormError/>
                    <FormSubmitButton isLoading={emailForm.formState.isSubmitting}>
                        Change Email
                    </FormSubmitButton>
                </form>
            </FormProvider>

            <FormProvider {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex min-w-0 flex-col gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Password</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Confirm your current password before choosing a new one.
                        </p>
                    </div>
                    <FieldSet disabled={passwordMutation.isPending}>
                        <FieldGroup>
                            <Controller
                                name="currentPassword"
                                control={passwordForm.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={passwordMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-current-password`}>Current password</FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${fieldId}-current-password`}
                                            type="password"
                                            placeholder="********"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            <Controller
                                name="newPassword"
                                control={passwordForm.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={passwordMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-new-password`}>New password</FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${fieldId}-new-password`}
                                            type="password"
                                            placeholder="********"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            <Controller
                                name="confirmNewPassword"
                                control={passwordForm.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={passwordMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-confirm-new-password`}>Confirm new password</FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${fieldId}-confirm-new-password`}
                                            type="password"
                                            placeholder="********"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton isLoading={passwordMutation.isPending}>
                        Update Password
                    </FormSubmitButton>
                </form>
            </FormProvider>
        </div>
    );
}

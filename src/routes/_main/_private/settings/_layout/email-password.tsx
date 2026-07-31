import {useId, useState} from "react";
import {Controller, FormProvider, useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Separator} from "@/lib/client/components/ui/separator";
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
        <div className="space-y-8">
            <FormProvider {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex w-full max-w-sm flex-col gap-4">
                    <FieldSet disabled={emailForm.formState.isSubmitting}>
                        <FieldGroup>
                        <Controller
                            name="email"
                            control={emailForm.control}
                            rules={{ required: "Email is required" }}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={emailForm.formState.isSubmitting}>
                                    <FieldLabel htmlFor={`${fieldId}-email`}>Change Your Email</FieldLabel>
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
                        <p className="text-xs text-green-600 font-medium">
                            Check your inbox to confirm your change of email address.
                        </p>
                    }
                    <FormError/>
                    <FormSubmitButton isLoading={emailForm.formState.isSubmitting}>
                        Change Email
                    </FormSubmitButton>
                </form>
            </FormProvider>

            <Separator className="max-w-sm"/>

            <FormProvider {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex w-full max-w-sm flex-col gap-4">
                    <FieldSet disabled={passwordMutation.isPending}>
                        <FieldGroup>
                        <Controller
                            name="currentPassword"
                            control={passwordForm.control}
                            render={({field, fieldState}) =>
                                <Field data-invalid={fieldState.invalid} data-disabled={passwordMutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-current-password`}>Current Password</FieldLabel>
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
                                    <FieldLabel htmlFor={`${fieldId}-new-password`}>New Password</FieldLabel>
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
                                    <FieldLabel htmlFor={`${fieldId}-confirm-new-password`}>Confirm New Password</FieldLabel>
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

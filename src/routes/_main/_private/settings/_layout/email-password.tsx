import {useState} from "react";
import authClient from "@/lib/utils/auth-client";
import {createFileRoute} from "@tanstack/react-router";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {useAppForm} from "@/lib/client/components/forms/form";
import {Separator} from "@/lib/client/components/ui/separator";
import {emailSettingsSchema, passwordSettingsFormSchema} from "@/lib/schemas";
import {usePasswordSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {handleFormSubmit} from "@/lib/utils/form-error-handler";


export const Route = createFileRoute("/_main/_private/settings/_layout/email-password")({
    component: EmailAndPasswordPage,
});


function EmailAndPasswordPage() {
    const [emailSent, setEmailSent] = useState(false);
    const passwordMutation = usePasswordSettingsMutation({ noErrorToast: true });
    const passwordForm = useAppForm({
        defaultValues: {
            newPassword: "",
            currentPassword: "",
            confirmNewPassword: "",
        },
        validators: {
            onSubmit: passwordSettingsFormSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const success = await handleFormSubmit(formApi, () => passwordMutation.mutateAsync({
                data: {
                    newPassword: value.newPassword,
                    currentPassword: value.currentPassword,
                }
            }));

            if (success) {
                passwordForm.reset();
            }
        },
    });

    const emailForm = useAppForm({
        defaultValues: {
            email: "",
        },
        validators: {
            onSubmit: emailSettingsSchema,
            onSubmitAsync: async ({ value }) => {
                const { error } = await authClient.changeEmail({ newEmail: value.email.trim() });
                if (error) return error.message;
            }
        },
        onSubmit: () => {
            emailForm.reset();
            setEmailSent(true);
        },
    });

    return (
        <div className="space-y-8">
            <emailForm.AppForm>
                <emailForm.FormRoot className="w-full max-w-sm space-y-3">
                    <emailForm.FormFieldset>
                        <FieldGroup>
                            <emailForm.AppField name="email">
                                {(field) =>
                                    <field.TextField
                                        type="email"
                                        autoComplete="email"
                                        label="Change Your Email"
                                        placeholder="new-email@example.com"
                                    />
                                }
                            </emailForm.AppField>
                        </FieldGroup>
                    </emailForm.FormFieldset>
                    {emailSent &&
                        <p role="status" className="text-xs text-green-600 font-medium">
                            Check your inbox to confirm your change of email address.
                        </p>
                    }
                    <emailForm.SubmitButton
                        requireDirty={true}
                        label="Change Email"
                    />
                </emailForm.FormRoot>
            </emailForm.AppForm>
            <Separator className="max-w-sm"/>
            <passwordForm.AppForm>
                <passwordForm.FormRoot className="w-full max-w-sm space-y-4">
                    <passwordForm.FormFieldset>
                        <FieldGroup className="gap-4">
                            <passwordForm.AppField name="currentPassword">
                                {(field) =>
                                    <field.TextField
                                        type="password"
                                        placeholder="********"
                                        label="Current Password"
                                        autoComplete="current-password"
                                    />
                                }
                            </passwordForm.AppField>
                            <passwordForm.AppField name="newPassword">
                                {(field) =>
                                    <field.TextField
                                        type="password"
                                        label="New Password"
                                        placeholder="********"
                                        autoComplete="new-password"
                                    />
                                }
                            </passwordForm.AppField>
                            <passwordForm.AppField name="confirmNewPassword">
                                {(field) =>
                                    <field.TextField
                                        type="password"
                                        placeholder="********"
                                        autoComplete="new-password"
                                        label="Confirm New Password"
                                    />
                                }
                            </passwordForm.AppField>
                        </FieldGroup>
                    </passwordForm.FormFieldset>
                    <passwordForm.SubmitButton
                        requireDirty={true}
                        label="Update Password"
                    />
                </passwordForm.FormRoot>
            </passwordForm.AppForm>
        </div>
    );
}

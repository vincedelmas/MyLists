import {useState} from "react";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Separator} from "@/lib/client/components/ui/separator";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PasswordSettingsForm, passwordSettingsFormSchema} from "@/lib/schemas";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {usePasswordSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


export const Route = createFileRoute("/_main/_private/settings/_layout/email-password")({
    component: EmailAndPasswordPage,
});


function EmailAndPasswordPage() {
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
            <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="w-full max-w-sm space-y-4">
                    <fieldset disabled={emailForm.formState.isSubmitting} className="space-y-4">
                        <FormField
                            name="email"
                            control={emailForm.control}
                            rules={{ required: "Email is required" }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Change Your Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="new-email@example.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </fieldset>
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
            </Form>

            <Separator className="max-w-sm"/>

            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="w-full max-w-sm space-y-4">
                    <fieldset disabled={passwordMutation.isPending} className="space-y-4">
                        <FormField
                            name="currentPassword"
                            control={passwordForm.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="********"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        <FormField
                            name="newPassword"
                            control={passwordForm.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="********"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        <FormField
                            name="confirmNewPassword"
                            control={passwordForm.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="********"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                    </fieldset>
                    <FormError/>
                    <FormSubmitButton isLoading={passwordMutation.isPending}>
                        Update Password
                    </FormSubmitButton>
                </form>
            </Form>
        </div>
    );
}

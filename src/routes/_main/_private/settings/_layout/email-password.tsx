import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {useMutation} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {PasswordSettingsForm, passwordSettingsFormSchema} from "@/lib/schemas";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {usePasswordSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


export const Route = createFileRoute("/_main/_private/settings/_layout/email-password")({
    component: EmailAndPasswordPage,
});


function EmailAndPasswordPage() {
    const passwordMutation = usePasswordSettingsMutation();
    const passwordForm = useForm<PasswordSettingsForm>({
        resolver: zodResolver(passwordSettingsFormSchema),
        defaultValues: {
            newPassword: "",
            currentPassword: "",
            confirmNewPassword: ""
        },
    });
    const emailForm = useForm({
        defaultValues: {
            email: "",
        }
    });

    const emailMutation = useMutation({
        mutationFn: async (email: string) => {
            const { error } = await authClient.changeEmail({ newEmail: email.trim() });
            if (error) throw error;
        },
        onSuccess: () => {
            emailForm.reset();
        },
    });

    const onPasswordSubmit = (values: PasswordSettingsForm) => {
        passwordMutation.mutate({
            data: {
                newPassword: values.newPassword,
                currentPassword: values.currentPassword,
            },
        }, {
            onSuccess: () => {
                passwordForm.reset();
            },
        });
    };

    return (
        <div className="space-y-8">
            <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit((data) => emailMutation.mutate(data.email))} className="w-full max-w-sm space-y-3">
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
                    {emailMutation.isSuccess &&
                        <p className="text-xs text-green-600 font-medium">
                            Check your inbox to confirm your change of email address.
                        </p>
                    }
                    {emailMutation.isError &&
                        <InlineErrorContainer>
                            {emailMutation.error.message || "Failed to update your email"}
                        </InlineErrorContainer>
                    }
                    <Button type="submit" disabled={emailMutation.isPending || !emailForm.formState.isDirty}>
                        Change Email
                    </Button>
                </form>
            </Form>

            <Separator className="max-w-sm"/>

            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="w-full max-w-sm space-y-4">
                    <FormField
                        name="currentPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="********" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="newPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="********" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="confirmNewPassword"
                        control={passwordForm.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="********" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    {passwordMutation.isError &&
                        <InlineErrorContainer>
                            {passwordMutation.error.message}
                        </InlineErrorContainer>
                    }
                    <Button type="submit" disabled={passwordMutation.isPending || !passwordForm.formState.isDirty}>
                        Update Password
                    </Button>
                </form>
            </Form>
        </div>
    );
}

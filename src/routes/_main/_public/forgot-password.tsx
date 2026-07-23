import {toast} from "sonner";
import {useState} from "react";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {FormError} from "@/lib/client/components/forms/FormError";
import {ForgotPassword, forgotPasswordSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {authMethodsOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


export const Route = createFileRoute("/_main/_public/forgot-password")({
    component: ForgotPasswordPage,
})


function ForgotPasswordPage() {
    const navigate = Route.useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const authMethods = useSuspenseQuery(authMethodsOptions).data;
    const form = useForm<ForgotPassword>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (submitted: ForgotPassword) => {
        await authClient.requestPasswordReset({
            email: submitted.email,
            redirectTo: "/reset-password",
        }, {
            onError: (ctx) => {
                handleServerFormErrors(form, ctx.error);
            },
            onSuccess: async () => {
                setEmailSent(true);
                toast.success(`You will be redirected to the login page in 5 seconds.`, { duration: 5 * 1000 });
                setTimeout(async () => {
                    await navigate({ to: "/login", replace: true });
                }, 5 * 1000);
            },
        });
    };

    return (
        <PageTitle title="Forgot password" subtitle="Enter the email associated with your account to reset your password">
            <div className="mt-4 max-w-75">
                {!authMethods.email
                    ? <div className="rounded-md border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-100">
                        Password reset is unavailable because email delivery was not configured on this instance.
                    </div>
                    : <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                                <FormField
                                    name="email"
                                    control={form.control}
                                    render={({ field }) =>
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    placeholder="john.doe@example.com"
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    }
                                />
                            </fieldset>
                            {emailSent &&
                                <p className="text-sm text-center font-medium text-green-600">
                                    An email has been sent to reset your password. Please check your inbox.
                                </p>
                            }
                            <FormError/>
                            <FormSubmitButton isLoading={form.formState.isSubmitting}>
                                Submit
                            </FormSubmitButton>
                        </form>
                    </Form>
                }
            </div>
        </PageTitle>
    );
}

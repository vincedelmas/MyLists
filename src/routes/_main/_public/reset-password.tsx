import {toast} from "sonner";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {ResetPassword, resetPasswordSchema, tokenSchema} from "@/lib/schemas";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


export const Route = createFileRoute("/_main/_public/reset-password")({
    validateSearch: tokenSchema,
    loaderDeps: ({ search }) => ({ search }),
    component: ResetPasswordPage,
    errorComponent: ({ error }) => {
        if (!(error instanceof SearchParamError)) {
            throw error;
        }
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="text-center mb-4">
                    <h1>Invalid reset link</h1>
                    <p>The password reset link is invalid.</p>
                </div>
                <Link to="/forgot-password">
                    <Button>Request a new reset link</Button>
                </Link>
            </div>
        );
    }
});


function ResetPasswordPage() {
    const { token } = Route.useSearch();
    const navigate = Route.useNavigate();
    const form = useForm<ResetPassword>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        }
    });

    const onSubmit = async (submitted: ResetPassword) => {
        await authClient.resetPassword({ token, newPassword: submitted.newPassword }, {
            onError: (ctx) => {
                handleServerFormErrors(form, ctx.error);
            },
            onSuccess: async () => {
                form.reset();
                await navigate({ to: "/login", replace: true });
                toast.success("Your password was modified successfully!");
            },
        });
    };

    return (
        <PageTitle title="Reset Your Password" subtitle="You can now change your password to a new one">
            <div className="mt-4 w-75 max-sm:w-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                            <FormField
                                name="newPassword"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder="********"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            <FormField
                                name="confirmPassword"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder="********"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                        </fieldset>
                        <FormError/>
                        <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                            Submit
                        </FormSubmitButton>
                    </form>
                </Form>
            </div>
        </PageTitle>
    );
}

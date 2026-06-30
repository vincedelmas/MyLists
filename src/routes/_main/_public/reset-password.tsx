import {toast} from "sonner";
import authClient from "@/lib/utils/auth-client";
import {Button} from "@/lib/client/components/ui/button";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {useAppForm} from "@/lib/client/components/forms/form";
import {resetPasswordSchema, tokenSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";


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
    const form = useAppForm({
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            await authClient.resetPassword({ token, newPassword: value.newPassword }, {
                onError: (ctx) => {
                    toast.error(ctx.error.message ?? "An unexpected error occurred. Please try again later.");
                },
                onSuccess: async () => {
                    form.reset();
                    await navigate({ to: "/login", replace: true });
                    toast.success("Your password was modified successfully!");
                },
            });
        },
    });

    return (
        <PageTitle title="Reset Your Password" subtitle="You can now change your password to a new one">
            <div className="mt-4 w-75 max-sm:w-full">
                <form.AppForm>
                    <form.FormRoot className="space-y-4">
                        <form.FormFieldset>
                            <FieldGroup className="gap-4">
                                <form.AppField name="newPassword">
                                    {(field) =>
                                        <field.TextField
                                            type="password"
                                            label="Password"
                                            placeholder="********"
                                            autoComplete="new-password"
                                        />
                                    }
                                </form.AppField>
                                <form.AppField name="confirmPassword">
                                    {(field) =>
                                        <field.TextField
                                            type="password"
                                            placeholder="********"
                                            label="Confirm Password"
                                            autoComplete="new-password"
                                        />
                                    }
                                </form.AppField>
                            </FieldGroup>
                        </form.FormFieldset>
                        <form.SubmitButton
                            label="Submit"
                            className="w-full"
                        />
                    </form.FormRoot>
                </form.AppForm>
            </div>
        </PageTitle>
    );
}

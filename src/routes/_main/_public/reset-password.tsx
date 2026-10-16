import authClient from "@/lib/client/auth-client";
import {KeyRound, ShieldCheck} from "lucide-react";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {toast} from "@/lib/client/components/ui/toast";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {ResetPassword, resetPasswordSchema, tokenSchema} from "@/lib/schemas";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";


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
                <Button render={<Link to="/forgot-password"/>} nativeButton={false}>
                    Request a new reset link
                </Button>
            </div>
        );
    },
    head: () => ({
        meta: [{ title: "Reset your password - MyLists" }, { name: "referrer", content: "no-referrer" }],
    })
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
                toast.add({ title: "Your password was modified successfully!", type: "success" });
            },
        });
    };

    return (
        <div className="mb-8 flex flex-col pt-8">
            <PageHeader
                eyebrow="Almost there"
                eyebrowIcon={KeyRound}
                asideIcon={ShieldCheck}
                asideLabel="One last step"
                title="Choose a new password"
                asideValue="Choose a new password"
                description="Choose the password you’ll use the next time you sign in."
            />
            <section className="mt-6 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <FieldSet disabled={form.formState.isSubmitting}>
                            <FieldGroup>
                                <FormTextField
                                    type="password"
                                    label="Password"
                                    name="newPassword"
                                    placeholder="********"
                                    control={form.control}
                                    id="reset-password-new-password"
                                    disabled={form.formState.isSubmitting}
                                />
                                <FormTextField
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="********"
                                    control={form.control}
                                    label="Confirm Password"
                                    id="reset-password-confirm-password"
                                    disabled={form.formState.isSubmitting}
                                />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                            Submit
                        </FormSubmitButton>
                    </form>
                </FormProvider>
            </section>
        </div>
    );
}

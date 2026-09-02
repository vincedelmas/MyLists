import {toast} from "@/lib/client/components/ui/toast";
import {Controller, FormProvider, useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ResetPassword, resetPasswordSchema, tokenSchema} from "@/lib/schemas";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {KeyRound, ShieldCheck} from "lucide-react";


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
                toast.add({title: "Your password was modified successfully!", type: "success"});
            },
        });
    };

    return (
        <PageTitle title="Reset your password" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Choose a new password"
                    eyebrow="Almost there"
                    eyebrowIcon={KeyRound}
                    asideIcon={ShieldCheck}
                    asideLabel="One last step"
                    asideValue="Choose a new password"
                    description="Choose the password you’ll use the next time you sign in."
                />
                <section className="mt-6 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <FieldSet disabled={form.formState.isSubmitting}>
                            <FieldGroup>
                            <Controller
                                name="newPassword"
                                control={form.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                        <FieldLabel htmlFor="reset-password-new-password">Password</FieldLabel>
                                        <Input
                                            {...field}
                                            id="reset-password-new-password"
                                            type="password"
                                            placeholder="********"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                }
                            />
                            <Controller
                                name="confirmPassword"
                                control={form.control}
                                render={({field, fieldState}) =>
                                    <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                        <FieldLabel htmlFor="reset-password-confirm-password">Confirm Password</FieldLabel>
                                        <Input
                                            {...field}
                                            id="reset-password-confirm-password"
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
                        <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                            Submit
                        </FormSubmitButton>
                    </form>
                </FormProvider>
                </section>
            </div>
        </PageTitle>
    );
}

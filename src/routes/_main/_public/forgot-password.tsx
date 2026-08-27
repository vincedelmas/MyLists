import {useState} from "react";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {ForgotPassword, forgotPasswordSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";


export const Route = createFileRoute("/_main/_public/forgot-password")({
    component: ForgotPasswordPage,
})


function ForgotPasswordPage() {
    const navigate = Route.useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const { authMethodsQueryOptions } = Route.useRouteContext();
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;
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
                toast.add({
                    title: "You will be redirected to the login page in 5 seconds.",
                    type: "success",
                    timeout: 5 * 1000,
                });
                setTimeout(async () => {
                    await navigate({ to: "/login", replace: true });
                }, 5 * 1000);
            },
        });
    };

    return (
        <PageTitle title="Forgot password" subtitle="Enter the email associated with your account to reset your password">
            <div className="mt-4 max-w-75">
                {!authMethods.email ?
                    <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                        Password reset is unavailable because email delivery was not configured on this instance.
                    </div>
                    :
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                            <FieldSet disabled={form.formState.isSubmitting}>
                                <FieldGroup>
                                    <Controller
                                        name="email"
                                        control={form.control}
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                                <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="forgot-password-email"
                                                    type="email"
                                                    placeholder="john.doe@example.com"
                                                    aria-invalid={fieldState.invalid}
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        }
                                    />
                                </FieldGroup>
                            </FieldSet>
                            {emailSent &&
                                <p className="text-center text-sm font-medium text-success">
                                    An email has been sent to reset your password. Please check your inbox.
                                </p>
                            }
                            <FormError/>
                            <FormSubmitButton isLoading={form.formState.isSubmitting}>
                                Submit
                            </FormSubmitButton>
                        </form>
                    </FormProvider>
                }
            </div>
        </PageTitle>
    );
}

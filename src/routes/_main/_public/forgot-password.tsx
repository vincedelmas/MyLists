import {toast} from "sonner";
import {useState} from "react";
import authClient from "@/lib/utils/auth-client";
import {forgotPasswordSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {useAppForm} from "@/lib/client/components/forms/form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";


export const Route = createFileRoute("/_main/_public/forgot-password")({
    component: ForgotPasswordPage,
})


function ForgotPasswordPage() {
    const navigate = Route.useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const form = useAppForm({
        defaultValues: {
            email: "",
        },
        validators: {
            onSubmit: forgotPasswordSchema,
            onSubmitAsync: async ({ value }) => {
                const { error } = await authClient.requestPasswordReset({ email: value.email, redirectTo: "/reset-password" })
                if (error) return error.message;
            },
        },
        onSubmit: async () => {
            setEmailSent(true);
            toast.success("You will be redirected to the login page in 5 seconds.", { duration: 5000 });
            setTimeout(async () => {
                await navigate({ to: "/login", replace: true });
            }, 5000);
        },
    });

    return (
        <PageTitle title="Forgot password" subtitle="Enter the email associated with your account to reset your password">
            <div className="mt-4 max-w-75">
                <form.AppForm>
                    <form.FormRoot className="space-y-4">
                        <form.FormFieldset>
                            <FieldGroup>
                                <form.AppField name="email">
                                    {(field) =>
                                        <field.TextField
                                            type="email"
                                            label="Email"
                                            autoComplete="email"
                                            placeholder="john.doe@example.com"
                                        />
                                    }
                                </form.AppField>
                            </FieldGroup>
                        </form.FormFieldset>
                        {emailSent &&
                            <p role="status" className="text-sm text-center font-medium text-green-600">
                                An email has been sent to reset your password. Please check your inbox.
                            </p>
                        }
                        <form.FormError/>
                        <form.SubmitButton
                            label="Submit"
                        />
                    </form.FormRoot>
                </form.AppForm>
            </div>
        </PageTitle>
    );
}

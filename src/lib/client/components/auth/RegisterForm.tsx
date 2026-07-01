import {toast} from "sonner";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {useLocation} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {registerSchema, usernameSchema} from "@/lib/schemas";
import {useAppForm} from "@/lib/client/components/forms/form";
import {Separator} from "@/lib/client/components/ui/separator";
import {validateUsernameAvailability} from "@/lib/client/validators/username";


interface RegisterFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const RegisterForm = ({ redirectTo, onOpenChange }: RegisterFormProps) => {
    const location = useLocation();
    const form = useAppForm({
        defaultValues: {
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: registerSchema,
            onSubmitAsync: async ({ value }) => {
                const { error } = await authClient.signUp.email({
                    email: value.email,
                    password: value.password,
                    name: value.username.trim(),
                    callbackURL: getRedirectTarget(),
                })

                if (error) return error.message || "Unable to create your account.";
            }
        },
        onSubmit: () => {
            form.reset();
            onOpenChange?.(false);
            toast.success("Your account has been created. Check your email to activate your account.");
        },
    });

    const getRedirectTarget = () => {
        return redirectTo || location.href || "/";
    };

    const withProvider = async (provider: "google" | "github") => {
        await authClient.signIn.social({ provider, callbackURL: getRedirectTarget() }, {
            onError: (ctx) => {
                toast.error(ctx.error.message);
            },
        });
    };

    return (
        <>
            <form.AppForm>
                <form.FormRoot className="space-y-6 mt-2">
                    <form.FormFieldset>
                        <FieldGroup className="gap-4">
                            <form.AppField
                                name="username"
                                validators={{
                                    onChange: usernameSchema,
                                    onChangeAsyncDebounceMs: 500,
                                    onChangeAsync: ({ value }) => {
                                        return validateUsernameAvailability(value);
                                    }
                                }}
                            >
                                {(field) =>
                                    <field.TextField
                                        label="Username"
                                        showValStatus={true}
                                        placeholder="Username"
                                        autoComplete="username"
                                    />
                                }
                            </form.AppField>
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
                            <form.AppField name="password">
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
                    <form.FormError/>
                    <form.SubmitButton
                        className="w-full mb-4"
                        label="Create an Account"
                    />
                </form.FormRoot>
            </form.AppForm>
            <Separator className="mt-3"/>
            <div className="mt-3 flex-col space-y-2">
                <Button variant="secondary" className="w-full" onClick={() => withProvider("google")}>
                    <FaGoogle className="size-4"/> Connexion via Google
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => withProvider("github")}>
                    <FaGithub className="size-4"/> Connexion via Github
                </Button>
            </div>
        </>
    );
};

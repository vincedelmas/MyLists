import {toast} from "sonner";
import {loginSchema} from "@/lib/schemas";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {useQueryClient} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {useAppForm} from "@/lib/client/components/forms/form";
import {Separator} from "@/lib/client/components/ui/separator";
import {authOptions} from "@/lib/client/react-query/query-options";
import {Link, useLocation, useNavigate, useRouter} from "@tanstack/react-router";


interface LoginFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const LoginForm = ({ redirectTo, onOpenChange }: LoginFormProps) => {
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const form = useAppForm({
        defaultValues: {
            email: "",
            password: "",
        },
        validators: {
            onSubmit: loginSchema,
            onSubmitAsync: async ({ value }) => {
                const { error } = await authClient.signIn.email({
                    rememberMe: true,
                    email: value.email,
                    password: value.password,
                });

                if (!error) return undefined;

                return error.status === 403
                    ? "Please validate your email. A validation link has been sent."
                    : error.message;
            },
        },
        onSubmit: async () => {
            const currentUser = await queryClient.fetchQuery({ ...authOptions, staleTime: 0 });
            onOpenChange?.(false);
            if (currentUser) {
                await navigate({ href: getRedirectTarget(), replace: true });
                await router.invalidate();
                await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== authOptions.queryKey[0] });
            }
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
                <form.FormRoot className="space-y-4">
                    <form.FormFieldset>
                        <FieldGroup className="gap-4">
                            <form.AppField name="email">
                                {(field) =>
                                    <field.TextField
                                        type="email"
                                        label="Email"
                                        placeholder="Email"
                                        autoComplete="email"
                                    />
                                }
                            </form.AppField>
                            <form.AppField name="password">
                                {(field) =>
                                    <field.TextField
                                        type="password"
                                        label="Password"
                                        placeholder="********"
                                        autoComplete="current-password"
                                        labelAccessory={
                                            <Link
                                                to="/forgot-password"
                                                className="text-sm underline"
                                                onClick={() => onOpenChange?.(false)}
                                            >
                                                Forgot password?
                                            </Link>
                                        }
                                    />
                                }
                            </form.AppField>
                        </FieldGroup>
                    </form.FormFieldset>
                    <form.FormError/>
                    <form.SubmitButton
                        label="Login"
                        className="w-full"
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

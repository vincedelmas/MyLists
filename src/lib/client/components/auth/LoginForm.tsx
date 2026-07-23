import {toast} from "sonner";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {Login, loginSchema} from "@/lib/schemas";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {FormError} from "@/lib/client/components/forms/FormError";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Link, useLocation, useNavigate, useRouter} from "@tanstack/react-router";
import {authMethodsOptions, authOptions} from "@/lib/client/react-query/query-options";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


interface LoginFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const LoginForm = ({ redirectTo, onOpenChange }: LoginFormProps) => {
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const authMethods = useSuspenseQuery(authMethodsOptions).data;
    const hasSocialProvider = authMethods.google || authMethods.github;
    const form = useForm<Login>({
        resolver: zodResolver(loginSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const getRedirectTarget = () => {
        return redirectTo || location.href || "/";
    };

    const refreshAuthenticatedRouteData = async () => {
        await router.invalidate();
        await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== authOptions.queryKey[0] });
    };

    const onSubmit = async (submitted: Login) => {
        await authClient.signIn.email({
            rememberMe: true,
            email: submitted.email,
            password: submitted.password,
        }, {
            onError: (ctx) => {
                handleServerFormErrors(form, ctx.error);
            },
            onSuccess: async () => {
                const currentUser = await queryClient.fetchQuery({ ...authOptions, staleTime: 0 });
                onOpenChange?.(false);
                if (currentUser) {
                    await navigate({ href: getRedirectTarget(), replace: true });
                    await refreshAuthenticatedRouteData();
                }
            },
        });
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="Email"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Password</FormLabel>
                                        {authMethods.email ?
                                            <Link
                                                tabIndex={-1}
                                                to="/forgot-password"
                                                className="text-sm underline"
                                                onClick={() => onOpenChange?.(false)}
                                            >
                                                Forgot password?
                                            </Link>
                                            :
                                            <span className="text-xs text-muted-foreground">
                                                Reset unavailable
                                            </span>
                                        }
                                    </div>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="password"
                                            placeholder="********"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                        Login
                    </FormSubmitButton>
                </form>
            </Form>
            {hasSocialProvider &&
                <>
                    <Separator className="mt-3"/>
                    <div className="mt-3 flex-col space-y-2">
                        {authMethods.google &&
                            <Button variant="secondary" className="w-full" onClick={() => withProvider("google")}>
                                <FaGoogle className="size-4"/> Continue with Google
                            </Button>
                        }
                        {authMethods.github &&
                            <Button variant="secondary" className="w-full" onClick={() => withProvider("github")}>
                                <FaGithub className="size-4"/> Continue with GitHub
                            </Button>
                        }
                    </div>
                </>
            }
        </>
    );
};

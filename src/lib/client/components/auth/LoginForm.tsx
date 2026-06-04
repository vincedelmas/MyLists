import {toast} from "sonner";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {useQueryClient} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {Link, useLocation, useNavigate, useRouter} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


type FormValues = {
    email: string;
    password: string;
};


interface LoginFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const LoginForm = ({ redirectTo, onOpenChange }: LoginFormProps) => {
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const form = useForm<FormValues>({
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

    const onSubmit = async (submitted: FormValues) => {
        await authClient.signIn.email({
            rememberMe: true,
            email: submitted.email,
            password: submitted.password,
        }, {
            onError: (ctx) => {
                if (ctx.error.status === 403) {
                    form.setError("root", {
                        type: "value",
                        message: "Please validate your email. A validation link has been sent.",
                    }, { shouldFocus: false });
                }
                else {
                    form.setError("root", { type: "value", message: ctx.error.message });
                }
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
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            rules={{ required: "This field is required" }}
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
                            rules={{ required: "This field is required" }}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Password</FormLabel>
                                        <Link
                                            to="/forgot-password"
                                            className="text-sm underline"
                                            tabIndex={-1}
                                            onClick={() => onOpenChange?.(false)}
                                        >
                                            Forgot password?
                                        </Link>
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
                    </div>
                    {form.formState.errors.root && (
                        <FormMessage className="text-center">
                            {form.formState.errors.root.message}
                        </FormMessage>
                    )}
                    <Button className="w-full">Login</Button>
                </form>
            </Form>
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

import {toast} from "sonner";
import {useForm} from "react-hook-form";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {useLocation} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Register, registerSchema} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {FormError} from "@/lib/client/components/forms/FormError";
import {authMethodsOptions} from "@/lib/client/react-query/query-options";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


interface RegisterFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const RegisterForm = ({ redirectTo, onOpenChange }: RegisterFormProps) => {
    const location = useLocation();
    const authMethods = useSuspenseQuery(authMethodsOptions).data;
    const hasSocialProvider = authMethods.google || authMethods.github;
    const form = useForm<Register>({
        resolver: zodResolver(registerSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
        },
    });

    const getRedirectTarget = () => {
        return redirectTo || location.href || "/";
    };

    const onSubmit = async (submitted: Register) => {
        await authClient.signUp.email({
            email: submitted.email,
            name: submitted.username,
            password: submitted.password,
            callbackURL: getRedirectTarget(),
        }, {
            onError: (ctx) => {
                handleServerFormErrors(form, ctx.error);
            },
            onSuccess: () => {
                form.reset();
                onOpenChange?.(false);
                toast.success("Your account has been created. Check your email to activate your account.");
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
            {authMethods.email ?
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                        <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                            <FormField
                                name="username"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Username"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            <FormField
                                name="email"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                placeholder="john.doe@example.com"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            <FormField
                                name="password"
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
                        <FormSubmitButton className="flex text-center w-full mb-4" isLoading={form.formState.isSubmitting}>
                            Create an Account
                        </FormSubmitButton>
                    </form>
                </Form>
                :
                <div className="mt-2 rounded-md border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-100">
                    Email registration is disabled on this instance.{" "}
                    {hasSocialProvider
                        ? "Use one of the options below or ask the admin to create an account."
                        : "Ask the admin to create an account with the `create-user` CLI."
                    }
                </div>
            }
            {hasSocialProvider &&
                <>
                    {authMethods.email && <Separator className="mt-3"/>}
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

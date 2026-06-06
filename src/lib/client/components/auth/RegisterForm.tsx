import {toast} from "sonner";
import {useForm} from "react-hook-form";
import {LoaderCircle} from "lucide-react";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {useLocation} from "@tanstack/react-router";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


type FormValues = {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}


interface RegisterFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const RegisterForm = ({ redirectTo, onOpenChange }: RegisterFormProps) => {
    const location = useLocation();
    const form = useForm<FormValues>({
        defaultValues: {
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
        },
        shouldFocusError: false,
    });

    const getRedirectTarget = () => {
        return redirectTo || location.href || "/";
    };

    const onSubmit = async (submitted: FormValues) => {
        await authClient.signUp.email({
            email: submitted.email,
            name: submitted.username,
            password: submitted.password,
            callbackURL: getRedirectTarget(),
        }, {
            onError: (ctx) => {
                form.setError("root", { type: "value", message: ctx.error.message }, { shouldFocus: false });
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2">
                    <fieldset disabled={form.formState.isSubmitting}>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                rules={{
                                    required: "Username is required.",
                                    minLength: { value: 3, message: "The username is too short (3 min)." },
                                    maxLength: { value: 15, message: "The username is too long (15 max)." },
                                }}
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
                                control={form.control}
                                name="email"
                                rules={{ required: "Email is required." }}
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
                                control={form.control}
                                name="password"
                                rules={{
                                    required: "Password is required.",
                                    minLength: { value: 8, message: "The password is too short (8 min)." },
                                    maxLength: { value: 50, message: "The password is too long (50 max)." },
                                }}
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
                                control={form.control}
                                name="confirmPassword"
                                rules={{
                                    validate: (val) => {
                                        if (form.watch("password") !== val) {
                                            return "The passwords do not match.";
                                        }
                                    }
                                }}
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
                        </div>
                    </fieldset>
                    {form.formState.errors.root &&
                        <FormMessage className="text-center -mt-1.5">
                            {form.formState.errors.root.message}
                        </FormMessage>
                    }
                    <Button disabled={form.formState.isSubmitting} className="flex text-center w-full  mb-4">
                        {form.formState.isSubmitting && <LoaderCircle className="size-4 animate-spin"/>} Create an account
                    </Button>
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

import {toast} from "@/lib/client/components/ui/toast";
import {useId} from "react";
import {Controller, FormProvider, useForm} from "react-hook-form";
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
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


interface LoginFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const LoginForm = ({ redirectTo, onOpenChange }: LoginFormProps) => {
    const fieldId = useId();
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
                toast.add({title: ctx.error.message, type: "error", priority: "high"});
            },
        });
    };

    return (
        <>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <FieldSet disabled={form.formState.isSubmitting}>
                        <FieldGroup>
                        <Controller
                            control={form.control}
                            name="email"
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                    <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                    <Input
                                        {...field}
                                        id={`${fieldId}-email`}
                                        type="email"
                                        placeholder="Email"
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="password"
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                    <div className="flex items-center justify-between">
                                        <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                        {authMethods.email ?
                                            <Link
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
                                    <Input
                                        {...field}
                                        id={`${fieldId}-password`}
                                        type="password"
                                        placeholder="********"
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                        Login
                    </FormSubmitButton>
                </form>
            </FormProvider>
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

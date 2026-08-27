import {useId} from "react";
import authClient from "@/lib/utils/auth-client";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Register, registerSchema} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {useLocation, useRouteContext} from "@tanstack/react-router";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";


interface RegisterFormProps {
    redirectTo?: string;
    onOpenChange?: (open: boolean) => void;
}


export const RegisterForm = ({ redirectTo, onOpenChange }: RegisterFormProps) => {
    const { authMethodsQueryOptions } = useRouteContext({ from: "__root__" });

    const fieldId = useId();
    const location = useLocation();
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;
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

    const hasSocialProvider = authMethods.google || authMethods.github;

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
                toast.add({
                    title: "Your account has been created. Check your email to activate your account.",
                    type: "success",
                });
            },
        });
    };

    const withProvider = async (provider: "google" | "github") => {
        await authClient.signIn.social({ provider, callbackURL: getRedirectTarget() }, {
            onError: (ctx) => {
                toast.add({ title: ctx.error.message, type: "error", priority: "high" });
            },
        });
    };

    return (
        <>
            {authMethods.email ?
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 flex flex-col gap-4">
                        <FieldSet disabled={form.formState.isSubmitting}>
                            <FieldGroup>
                                <Controller
                                    name="username"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                            <FieldLabel htmlFor={`${fieldId}-username`}>Username</FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-username`}
                                                placeholder="Username"
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />
                                <Controller
                                    name="email"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                            <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-email`}
                                                type="email"
                                                placeholder="john.doe@example.com"
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                            <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-password`}
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
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                            <FieldLabel htmlFor={`${fieldId}-confirm-password`}>Confirm Password</FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-confirm-password`}
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
                        <FormSubmitButton className="flex text-center w-full mb-4" isLoading={form.formState.isSubmitting}>
                            Create an Account
                        </FormSubmitButton>
                    </form>
                </FormProvider>
                :
                <InlineErrorContainer>
                    Email registration is disabled on this instance.{" "}
                    {hasSocialProvider
                        ? "Use one of the options below or ask the admin to create an account."
                        : "Ask the admin to create an account with the `create-user` CLI."
                    }
                </InlineErrorContainer>
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

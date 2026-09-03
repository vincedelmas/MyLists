import {useEffect, useId, useState} from "react";
import {Login, loginSchema} from "@/lib/schemas";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {LogIn, RefreshCw, ShieldCheck} from "lucide-react";
import {getOAuthErrorMessage} from "@/lib/utils/auth-utils";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {createFileRoute, Link, useRouteContext, useRouter, useSearch} from "@tanstack/react-router";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {useEmailLoginMutation, useResendVerificationEmailMutation, useSocialSignInMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


export const Route = createFileRoute("/_main/_public/login")({
    component: LoginPage,
});


function LoginPage() {
    const fieldId = useId();
    const router = useRouter();
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const [unverifiedEmail, setUnverifiedEmail] = useState<string>();
    const { error, message, redirect } = useSearch({ from: "/_main/_public" });
    const { authQueryOptions, authMethodsQueryOptions } = useRouteContext({ from: "__root__" });

    const redirectTarget = redirect || "/";
    const loginMutation = useEmailLoginMutation();
    const oauthErrorMessage = getOAuthErrorMessage(error);
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;

    const oauthSearch = new URLSearchParams({ redirect: redirectTarget });
    const verificationCallbackURL = `/register?${new URLSearchParams({ redirect: redirectTarget })}`;
    const socialMutation = useSocialSignInMutation({
        callbackURL: redirectTarget,
        errorCallbackURL: `/login?${oauthSearch}`,
        newUserCallbackURL: `/choose-username?${oauthSearch}`,
    });
    const resendMutation = useResendVerificationEmailMutation(verificationCallbackURL);

    const hasSocialProvider = authMethods.google || authMethods.github;
    const form = useForm<Login>({
        resolver: zodResolver(loginSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        if (!message) return;

        toast.add({ title: message, id: "auth-route-feedback", type: "warning" });
        void navigate({ replace: true, to: "/login", search: { error, redirect } });

    }, [error, message, navigate, redirect]);

    const handleOnSubmit = async (submitted: Login) => {
        form.clearErrors("root");
        setUnverifiedEmail(undefined);

        loginMutation.mutate(submitted, {
            onError: (error) => {
                if (error.code === "EMAIL_NOT_VERIFIED") {
                    setUnverifiedEmail(submitted.email);
                    return;
                }

                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                const currentUser = await queryClient.fetchQuery({ ...authQueryOptions, staleTime: 0 });
                if (!currentUser) return;

                await navigate({ href: redirectTarget, replace: true });
                await router.invalidate();
                await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== authQueryOptions.queryKey[0] });
            },
        });
    }

    return (
        <PageTitle title="Login" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrow="Sign in"
                    eyebrowIcon={LogIn}
                    title="Welcome back"
                    asideIcon={ShieldCheck}
                    asideLabel="Your account"
                    asideValue="Ready when you are"
                    description="Sign in to keep tracking your media and see what the people you follow are up to."
                />

                <section className="mt-10 w-full self-center rounded-xl border p-5 shadow-xs sm:p-6 max-w-sm">
                    <h2 className="mb-4 text-xl font-semibold tracking-tight">
                        Sign in to MyLists
                    </h2>

                    {oauthErrorMessage &&
                        <div className="mb-4">
                            <InlineErrorContainer onDismiss={() => navigate({ replace: true, to: "/login", search: { redirect } })}>
                                {oauthErrorMessage}
                            </InlineErrorContainer>
                        </div>
                    }

                    <FormProvider {...form}>
                        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleOnSubmit)}>
                            <FieldSet disabled={loginMutation.isPending}>
                                <FieldGroup>
                                    <Controller
                                        name="email"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} data-disabled={loginMutation.isPending}>
                                                <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    placeholder="Email"
                                                    id={`${fieldId}-email`}
                                                    aria-invalid={fieldState.invalid}
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        name="password"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} data-disabled={loginMutation.isPending}>
                                                <div className="flex items-center justify-between">
                                                    <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                                    {authMethods.email ?
                                                        <Link to="/forgot-password" className="text-sm underline">
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
                                                    type="password"
                                                    placeholder="********"
                                                    id={`${fieldId}-password`}
                                                    aria-invalid={fieldState.invalid}
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        )}
                                    />
                                </FieldGroup>
                            </FieldSet>
                            {unverifiedEmail &&
                                <InlineErrorContainer onDismiss={() => setUnverifiedEmail(undefined)}>
                                    <div className="flex flex-col items-start gap-2">
                                        <p>
                                            Your email isn’t verified yet. Request a new verification email to continue.
                                        </p>
                                        <Button
                                            size="sm"
                                            type="button"
                                            variant="outline"
                                            disabled={resendMutation.isPending}
                                            aria-busy={resendMutation.isPending}
                                            onClick={() => resendMutation.mutate({ email: unverifiedEmail })}
                                        >
                                            {resendMutation.isPending
                                                ? <Spinner data-icon="inline-start" aria-hidden="true"/>
                                                : <RefreshCw data-icon="inline-start" aria-hidden="true"/>
                                            }
                                            {resendMutation.isPending ? "Sending email…" : "Resend verification email"}
                                        </Button>
                                    </div>
                                </InlineErrorContainer>
                            }
                            <FormError/>
                            <Button type="submit" className="w-full" disabled={loginMutation.isPending} aria-busy={loginMutation.isPending}>
                                {loginMutation.isPending &&
                                    <Spinner className="text-primary-foreground" data-icon="inline-start" aria-hidden="true"/>
                                }
                                {loginMutation.isPending ? "Signing you in…" : "Login"}
                            </Button>
                        </form>
                    </FormProvider>

                    {hasSocialProvider &&
                        <>
                            <Separator className="mt-3"/>
                            <div className="mt-3 flex flex-col gap-2">
                                {authMethods.google &&
                                    <Button
                                        type="button"
                                        className="w-full"
                                        variant="secondary"
                                        disabled={socialMutation.isPending}
                                        onClick={() => socialMutation.mutate("google")}
                                    >
                                        {socialMutation.isPending && socialMutation.variables === "google"
                                            ? <Spinner data-icon="inline-start" aria-hidden="true"/>
                                            : <FaGoogle data-icon="inline-start" aria-hidden="true"/>
                                        }
                                        Continue with Google
                                    </Button>
                                }
                                {authMethods.github &&
                                    <Button
                                        type="button"
                                        className="w-full"
                                        variant="secondary"
                                        disabled={socialMutation.isPending}
                                        onClick={() => socialMutation.mutate("github")}
                                    >
                                        {socialMutation.isPending && socialMutation.variables === "github"
                                            ? <Spinner data-icon="inline-start" aria-hidden="true"/>
                                            : <FaGithub data-icon="inline-start" aria-hidden="true"/>
                                        }
                                        Continue with GitHub
                                    </Button>
                                }
                            </div>
                        </>
                    }

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link to="/register" search={{ redirect }} className="text-foreground underline hover:text-brand">
                            Register
                        </Link>
                    </div>
                </section>
            </div>
        </PageTitle>
    );
}

import {useEffect, useId} from "react";
import {cn} from "@/lib/utils/classnames";
import {FaGithub, FaGoogle} from "react-icons/fa";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {getOAuthErrorMessage, isVerificationError} from "@/lib/utils/auth-utils";
import {createFileRoute, Link, useRouteContext, useSearch} from "@tanstack/react-router";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {ForgotPassword, forgotPasswordSchema, Register, registerSchema} from "@/lib/schemas";
import {ClockAlert, MailCheck, RefreshCw, ShieldAlert, ShieldCheck, UserPlus} from "lucide-react";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";
import {useEmailRegistrationMutation, useResendVerificationEmailMutation, useSocialSignInMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


export const Route = createFileRoute("/_main/_public/register")({
    component: RegisterPage,
});


const verificationContent = {
    pending: {
        icon: MailCheck,
        badge: "Email sent",
        title: "Check your inbox",
        badgeVariant: "success" as const,
        description: "We sent a verification link to the email address used for registration.",
    },
    expired: {
        icon: ClockAlert,
        badge: "Link expired",
        title: "Request a new link",
        badgeVariant: "warning" as const,
        description: "Verification links are valid for one hour. Enter your account email and we’ll send a new one.",
    },
    invalid: {
        icon: ShieldAlert,
        badge: "Link unavailable",
        title: "That link can’t be used",
        badgeVariant: "destructive" as const,
        description: "It may be invalid or already used. Enter your account email to receive a fresh verification link.",
    },
};


function RegisterPage() {
    const fieldId = useId();
    const navigate = Route.useNavigate();
    const { authMethodsQueryOptions } = useRouteContext({ from: "__root__" });
    const { message, redirect, error, step } = useSearch({ from: "/_main/_public" });

    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;
    const registrationForm = useForm<Register>({
        resolver: zodResolver(registerSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
        },
    });

    const resendForm = useForm<ForgotPassword>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const oauthErrorMessage = getOAuthErrorMessage(error);
    const verificationError = isVerificationError(error) ? error : undefined;
    const verificationStatus = verificationError === "TOKEN_EXPIRED"
        ? "expired" : verificationError
            ? "invalid" : step === "verify"
                ? "pending" : null;

    const content = verificationStatus ? verificationContent[verificationStatus] : null;
    const StatusIcon = content?.icon;

    const redirectTarget = redirect || "/";
    const hasSocialProvider = authMethods.google || authMethods.github;
    const oauthSearch = new URLSearchParams({ redirect: redirectTarget });
    const verificationCallbackURL = `/register?${new URLSearchParams({ redirect: redirectTarget })}`;

    const socialMutation = useSocialSignInMutation({
        callbackURL: redirectTarget,
        errorCallbackURL: `/register?${oauthSearch}`,
        newUserCallbackURL: `/choose-username?${oauthSearch}`,
    });
    const registrationMutation = useEmailRegistrationMutation(verificationCallbackURL);
    const resendMutation = useResendVerificationEmailMutation(verificationCallbackURL);

    const resendSubmit = async (submitted: ForgotPassword) => {
        resendMutation.mutate(submitted, {
            onSuccess: async () => {
                resendForm.reset();
                await navigate({ replace: true, to: "/register", search: { redirect, step: "verify" } });
            },
        });
    };

    const registrationSubmit = async (submitted: Register) => {
        registrationForm.clearErrors("root");

        registrationMutation.mutate(submitted, {
            onError: (mutationError) => {
                if (mutationError.code === "USERNAME_TAKEN" || mutationError.code === "INVALID_USERNAME") {
                    registrationForm.setError("username", { message: mutationError.message });
                    return;
                }

                handleServerFormErrors(registrationForm, mutationError);
            },
            onSuccess: async () => {
                resendForm.setValue("email", submitted.email);
                await navigate({ replace: true, to: "/register", search: { redirect, step: "verify" } });
            },
        });
    }

    useEffect(() => {
        const feedback = message || oauthErrorMessage;
        if (!feedback) return;

        toast.add({
            title: feedback,
            id: "auth-route-feedback",
            type: oauthErrorMessage ? "error" : "warning",
        });

        void navigate({ replace: true, to: "/register", search: { error: verificationError, redirect, step } });

    }, [message, navigate, oauthErrorMessage, redirect, step, verificationError]);

    return (
        <PageTitle title={verificationStatus ? "Verify email" : "Register"} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={ShieldCheck}
                    eyebrowIcon={verificationStatus ? MailCheck : UserPlus}
                    eyebrow={verificationStatus ? "Email verification" : "New to MyLists?"}
                    asideLabel={verificationStatus ? "Verification links" : "What you need"}
                    title={verificationStatus ? "Verify your email" : "Create your account"}
                    asideValue={verificationStatus ? "Expire after one hour" : "Just a few details"}
                    description={verificationStatus === "pending"
                        ? "Open the verification email we just sent to finish setting up your account."
                        : verificationStatus
                            ? "Request a fresh verification email and finish setting up your account."
                            : "Create an account to keep your lists, follow your progress and make MyLists your own."
                    }
                />

                <section className="mt-10 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                    {verificationStatus && content && StatusIcon ?
                        <Empty className="min-h-96 border bg-muted/20 px-4 py-8">
                            <EmptyHeader aria-live="polite">
                                <EmptyMedia variant="icon" className="size-12 rounded-full">
                                    <StatusIcon aria-hidden="true"/>
                                </EmptyMedia>
                                <Badge variant={content.badgeVariant}>
                                    {content.badge}
                                </Badge>
                                <EmptyTitle className="text-xl">
                                    <h2>{content.title}</h2>
                                </EmptyTitle>
                                <EmptyDescription className="max-w-sm">
                                    {content.description}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent className="max-w-sm gap-4">
                                {verificationStatus === "pending" &&
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        The link is valid for one hour. Check your spam folder if it does not appear in your inbox.
                                    </p>
                                }
                                <form className="flex w-full flex-col gap-4 text-left" onSubmit={resendForm.handleSubmit(resendSubmit)}>
                                    <FieldSet disabled={resendMutation.isPending}>
                                        <FieldGroup>
                                            <Controller
                                                name="email"
                                                control={resendForm.control}
                                                render={({ field, fieldState }) =>
                                                    <Field data-invalid={fieldState.invalid} data-disabled={resendMutation.isPending}>
                                                        <FieldLabel htmlFor={`${fieldId}-verification-email`}>
                                                            Account email
                                                        </FieldLabel>
                                                        <Input
                                                            {...field}
                                                            type="email"
                                                            autoComplete="email"
                                                            aria-invalid={fieldState.invalid}
                                                            placeholder="john.doe@example.com"
                                                            id={`${fieldId}-verification-email`}
                                                        />
                                                        <FieldError errors={[fieldState.error]}/>
                                                    </Field>
                                                }
                                            />
                                        </FieldGroup>
                                    </FieldSet>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={resendMutation.isPending}
                                        aria-busy={resendMutation.isPending}
                                    >
                                        {resendMutation.isPending
                                            ? <Spinner className="text-primary-foreground" data-icon="inline-start" aria-hidden="true"/>
                                            : <RefreshCw data-icon="inline-start" aria-hidden="true"/>
                                        }
                                        {resendMutation.isPending ? "Sending email…" : "Resend verification email"}
                                    </Button>
                                </form>
                                <Link to="/login" search={{ redirect }} className={cn(buttonVariants({ variant: "outline" }))}>
                                    Go to sign in
                                </Link>
                            </EmptyContent>
                        </Empty>
                        :
                        <>
                            <h2 className="mb-4 text-xl font-semibold tracking-tight">
                                Create your MyLists account
                            </h2>

                            {authMethods.email ?
                                <FormProvider {...registrationForm}>
                                    <form className="mt-2 flex flex-col gap-4" onSubmit={registrationForm.handleSubmit(registrationSubmit)}>
                                        <FieldSet disabled={registrationMutation.isPending}>
                                            <FieldGroup>
                                                <Controller
                                                    name="username"
                                                    control={registrationForm.control}
                                                    render={({ field, fieldState }) =>
                                                        <Field
                                                            data-invalid={fieldState.invalid}
                                                            data-disabled={registrationMutation.isPending}
                                                        >
                                                            <FieldLabel htmlFor={`${fieldId}-username`}>Username</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                placeholder="Username"
                                                                id={`${fieldId}-username`}
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </Field>
                                                    }
                                                />
                                                <Controller
                                                    name="email"
                                                    control={registrationForm.control}
                                                    render={({ field, fieldState }) =>
                                                        <Field
                                                            data-invalid={fieldState.invalid}
                                                            data-disabled={registrationMutation.isPending}
                                                        >
                                                            <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                type="email"
                                                                id={`${fieldId}-email`}
                                                                autoComplete="email"
                                                                aria-invalid={fieldState.invalid}
                                                                placeholder="john.doe@example.com"
                                                            />
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </Field>
                                                    }
                                                />
                                                <Controller
                                                    name="password"
                                                    control={registrationForm.control}
                                                    render={({ field, fieldState }) =>
                                                        <Field data-invalid={fieldState.invalid} data-disabled={registrationMutation.isPending}>
                                                            <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                type="password"
                                                                placeholder="********"
                                                                autoComplete="new-password"
                                                                id={`${fieldId}-password`}
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </Field>
                                                    }
                                                />
                                                <Controller
                                                    name="confirmPassword"
                                                    control={registrationForm.control}
                                                    render={({ field, fieldState }) =>
                                                        <Field data-invalid={fieldState.invalid} data-disabled={registrationMutation.isPending}>
                                                            <FieldLabel htmlFor={`${fieldId}-confirm-password`}>Confirm Password</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                type="password"
                                                                placeholder="********"
                                                                autoComplete="new-password"
                                                                aria-invalid={fieldState.invalid}
                                                                id={`${fieldId}-confirm-password`}
                                                            />
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </Field>
                                                    }
                                                />
                                            </FieldGroup>
                                        </FieldSet>
                                        <FormError/>
                                        <Button
                                            type="submit"
                                            className="mb-4 w-full"
                                            disabled={registrationMutation.isPending}
                                            aria-busy={registrationMutation.isPending}
                                        >
                                            {registrationMutation.isPending &&
                                                <Spinner
                                                    aria-hidden="true"
                                                    data-icon="inline-start"
                                                    className="text-primary-foreground"
                                                />
                                            }

                                            {registrationMutation.isPending
                                                ? "Creating your account…"
                                                : "Create an account"
                                            }
                                        </Button>
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
                                Already have an account?{" "}
                                <Link to="/login" search={{ redirect }} className="text-foreground underline hover:text-brand">
                                    Sign in
                                </Link>
                            </div>
                        </>
                    }
                </section>
            </div>
        </PageTitle>
    );
}

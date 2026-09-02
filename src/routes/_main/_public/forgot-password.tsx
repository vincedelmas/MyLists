import {useState} from "react";
import authClient from "@/lib/utils/auth-client";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {ForgotPassword, forgotPasswordSchema} from "@/lib/schemas";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {ArrowLeft, KeyRound, Mail, MailCheck, ShieldCheck, TriangleAlert} from "lucide-react";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";


export const Route = createFileRoute("/_main/_public/forgot-password")({
    component: ForgotPasswordPage,
})


function ForgotPasswordPage() {
    const navigate = Route.useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const { authMethodsQueryOptions } = Route.useRouteContext();
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;
    const form = useForm<ForgotPassword>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (submitted: ForgotPassword) => {
        await authClient.requestPasswordReset({
            email: submitted.email,
            redirectTo: "/reset-password",
        }, {
            onError: (ctx) => {
                handleServerFormErrors(form, ctx.error);
            },
            onSuccess: async () => {
                setEmailSent(true);
                toast.add({
                    title: "You will be redirected to the login page in 5 seconds.",
                    type: "success",
                    timeout: 5 * 1000,
                });
                setTimeout(async () => {
                    await navigate({ to: "/login", replace: true });
                }, 5 * 1000);
            },
        });
    };

    return (
        <PageTitle title="Forgot password" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Mail}
                    eyebrowIcon={KeyRound}
                    eyebrow="Forgot your password?"
                    asideLabel="We’ll send you"
                    title="Let’s get you back in"
                    asideValue="A secure reset link"
                    description="Enter the email you use for MyLists to choose a new password."
                />

                <section className="mt-10 grid overflow-hidden rounded-xl border shadow-xs lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="order-2 p-6 sm:p-8 lg:order-1 lg:border-r">
                        <div className="max-w-xl space-y-7">
                            <div className="flex gap-4">
                                <span className="text-sm tabular-nums text-brand">01</span>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">Confirm your account email</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Use the same address you normally use to sign in to MyLists.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-sm tabular-nums text-brand">02</span>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">Open the recovery link</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        The link in your inbox is valid for one hour and can be used to choose a new password.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 rounded-xl border border-brand/40 border-l-2 border-l-brand bg-brand/5 px-4 py-3">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true"/>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    For your privacy, the recovery response does not expose account details.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 p-6 sm:p-8 lg:order-2">
                        {!authMethods.email ?
                            <div className="flex gap-3 rounded-xl border border-warning/40 border-l-2 border-l-warning bg-warning/5 px-4 py-3">
                                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true"/>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">Recovery unavailable</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Email delivery is not configured on this MyLists instance.
                                    </p>
                                </div>
                            </div>
                            : emailSent ?
                                <div aria-live="polite" className="flex flex-col items-start">
                                    <MailCheck className="size-7 text-success" aria-hidden="true"/>
                                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                                        Check your inbox
                                    </h2>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        If an account uses this address, its reset link is on the way. You’ll return to login shortly.
                                    </p>
                                    <Link to="/login" className={buttonVariants({ className: "mt-5" })}>
                                        Return to login
                                    </Link>
                                </div>
                                :
                                <FormProvider {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                                        <div>
                                            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                                Request a reset link
                                            </h2>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                We’ll send instructions to your account email.
                                            </p>
                                        </div>
                                        <FieldSet disabled={form.formState.isSubmitting}>
                                            <FieldGroup>
                                                <Controller
                                                    name="email"
                                                    control={form.control}
                                                    render={({ field, fieldState }) =>
                                                        <Field data-invalid={fieldState.invalid} data-disabled={form.formState.isSubmitting}>
                                                            <FieldLabel htmlFor="forgot-password-email">Email address</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                autoFocus
                                                                id="forgot-password-email"
                                                                type="email"
                                                                autoComplete="email"
                                                                placeholder="john.doe@example.com"
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </Field>
                                                    }
                                                />
                                            </FieldGroup>
                                        </FieldSet>
                                        <FormError/>
                                        <FormSubmitButton className="w-full" isLoading={form.formState.isSubmitting}>
                                            Send recovery link
                                        </FormSubmitButton>
                                    </form>
                                </FormProvider>
                        }
                    </div>
                </section>

                {!emailSent &&
                    <div className="pt-4">
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft className="size-4" aria-hidden="true"/>
                            Back to login
                        </Link>
                    </div>
                }
            </div>
        </PageTitle>
    );
}

import {useEffect, useState} from "react";
import {toast} from "@/lib/client/components/ui/toast";
import {useSuspenseQuery} from "@tanstack/react-query";
import {MailCheck, ShieldCheck, UserPlus} from "lucide-react";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {RegisterForm} from "@/lib/client/components/auth/RegisterForm";
import {SocialAuthButtons} from "@/lib/client/components/auth/SocialAuthButtons";
import {createFileRoute, Link, useRouteContext, useSearch} from "@tanstack/react-router";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {AuthState, getAuthState, getOAuthErrorMessage, isVerificationError} from "@/lib/utils/auth-utils";
import {EmailVerificationPanel, VerificationStatus} from "@/lib/client/components/auth/EmailVerificationPanel";


export const Route = createFileRoute("/_main/_public/register")({
    component: RegisterPage,
});


function RegisterPage() {
    const navigate = Route.useNavigate();
    const [verificationEmail, setVerificationEmail] = useState<string>();
    const { authMethodsQueryOptions } = useRouteContext({ from: "__root__" });
    const { message, redirect, error, step } = useSearch({ from: "/_main/_public" });

    const oauthErrorMessage = getOAuthErrorMessage(error);
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;
    const verificationError = isVerificationError(error) ? error : undefined;

    const verificationStatus: VerificationStatus | null = verificationError === "TOKEN_EXPIRED"
        ? "expired"
        : verificationError
            ? "invalid"
            : step === "verify"
                ? "pending"
                : null;

    const redirectTarget = redirect || "/";
    const hasSocialProvider = authMethods.google || authMethods.github;
    const verificationCallbackURL = `/register?${new URLSearchParams({ redirect: redirectTarget })}`;
    const isAwaitingVerification = getAuthState(null, verificationStatus !== null) === AuthState.AWAITING_EMAIL_VERIFICATION;

    const showVerification = async (email?: string) => {
        if (email) setVerificationEmail(email);
        await navigate({ replace: true, to: "/register", search: { redirect, step: "verify" } });
    };

    useEffect(() => {
        if (!message) return;

        toast.add({ title: message, id: "auth-route-feedback", type: "warning" });
        void navigate({ replace: true, to: "/register", search: { error, redirect, step } });
    }, [error, message, navigate, redirect, step]);

    return (
        <PageTitle title={isAwaitingVerification ? "Verify email" : "Register"} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={ShieldCheck}
                    eyebrowIcon={isAwaitingVerification ? MailCheck : UserPlus}
                    eyebrow={isAwaitingVerification ? "Email verification" : "New to MyLists?"}
                    asideLabel={isAwaitingVerification ? "Verification links" : "What you need"}
                    title={isAwaitingVerification ? "Verify your email" : "Create your account"}
                    asideValue={isAwaitingVerification ? "Expire after one hour" : "Just a few details"}
                    description={verificationStatus === "pending"
                        ? "Open the verification email we just sent to finish setting up your account."
                        : verificationStatus
                            ? "Request a fresh verification email and finish setting up your account."
                            : "Create an account to keep your lists, follow your progress and make MyLists your own."
                    }
                />

                <section className="mt-10 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                    {isAwaitingVerification && verificationStatus ?
                        <EmailVerificationPanel
                            redirect={redirect}
                            status={verificationStatus}
                            defaultEmail={verificationEmail}
                            onVerificationResent={showVerification}
                            verificationCallbackURL={verificationCallbackURL}
                        />
                        :
                        <>
                            <h2 className="mb-4 text-xl font-semibold tracking-tight">
                                Create your MyLists account
                            </h2>

                            {oauthErrorMessage &&
                                <div className="mb-4">
                                    <InlineErrorContainer
                                        onDismiss={() => void navigate({ replace: true, to: "/register", search: { redirect, step } })}
                                    >
                                        {oauthErrorMessage}
                                    </InlineErrorContainer>
                                </div>
                            }

                            {authMethods.email ?
                                <RegisterForm
                                    onVerificationRequested={showVerification}
                                    verificationCallbackURL={verificationCallbackURL}
                                />
                                :
                                <InlineErrorContainer>
                                    Email registration is disabled on this instance.{" "}
                                    {hasSocialProvider
                                        ? "Use one of the options below or ask the admin to create an account."
                                        : "Ask the admin to create an account with the `create-user` CLI."
                                    }
                                </InlineErrorContainer>
                            }

                            <SocialAuthButtons
                                authMethods={authMethods}
                                errorCallbackPath="/register"
                                redirectTarget={redirectTarget}
                                showSeparator={authMethods.email}
                            />

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

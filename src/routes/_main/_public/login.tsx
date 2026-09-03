import {useEffect} from "react";
import {LogIn, ShieldCheck} from "lucide-react";
import {toast} from "@/lib/client/components/ui/toast";
import {useSuspenseQuery} from "@tanstack/react-query";
import {getOAuthErrorMessage} from "@/lib/utils/auth-utils";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {SocialAuthButtons} from "@/lib/client/components/auth/SocialAuthButtons";
import {createFileRoute, Link, useRouteContext, useSearch} from "@tanstack/react-router";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";


export const Route = createFileRoute("/_main/_public/login")({
    component: LoginPage,
});


function LoginPage() {
    const navigate = Route.useNavigate();
    const { authMethodsQueryOptions } = useRouteContext({ from: "__root__" });
    const { error, message, redirect } = useSearch({ from: "/_main/_public" });

    const redirectTarget = redirect || "/";
    const oauthErrorMessage = getOAuthErrorMessage(error);
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;

    useEffect(() => {
        if (!message) return;

        toast.add({ title: message, id: "auth-route-feedback", type: "warning" });
        void navigate({ replace: true, to: "/login", search: { error, redirect } });
    }, [error, message, navigate, redirect]);

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

                <section className="mt-10 w-full max-w-sm self-center rounded-xl border p-5 shadow-xs sm:p-6">
                    <h2 className="mb-4 text-xl font-semibold tracking-tight">
                        Sign in to MyLists
                    </h2>

                    {oauthErrorMessage &&
                        <div className="mb-4">
                            <InlineErrorContainer
                                onDismiss={() => navigate({ replace: true, to: "/login", search: { redirect } })}
                            >
                                {oauthErrorMessage}
                            </InlineErrorContainer>
                        </div>
                    }

                    <LoginForm
                        redirectTarget={redirectTarget}
                        passwordResetEnabled={authMethods.email}
                    />
                    <SocialAuthButtons
                        authMethods={authMethods}
                        errorCallbackPath="/login"
                        redirectTarget={redirectTarget}
                    />

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

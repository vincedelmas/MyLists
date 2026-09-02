import {LogIn, ShieldCheck} from "lucide-react";
import {toast} from "@/lib/client/components/ui/toast";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/login")({
    component: LoginPage,
});


function LoginPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) {
        toast.add({ title: message, type: "warning" });
    }

    return (
        <PageTitle title="Login" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrowIcon={LogIn}
                    title="Welcome back"
                    asideIcon={ShieldCheck}
                    asideLabel="Your account"
                    eyebrow="Sign in"
                    asideValue="Ready when you are"
                    description="Sign in to keep tracking your media and see what the people you follow are up to."
                />

                <section className="mt-10 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                    <h2 className="mb-4 text-xl font-semibold tracking-tight">
                        Sign in to MyLists
                    </h2>

                    <LoginForm
                        redirectTo={redirect}
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

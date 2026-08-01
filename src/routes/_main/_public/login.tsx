import {toast} from "@/lib/client/components/ui/toast";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/login")({
    component: LoginPage,
});


function LoginPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) toast.add({title: message, type: "warning"});

    return (
        <PageTitle title="Login" onlyHelmet>
            <div className="mx-auto my-10 mt-20 w-full max-w-100 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight">
                    Login to MyLists
                </h1>

                <LoginForm
                    redirectTo={redirect}
                />

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" search={{ redirect }} className="text-foreground underline hover:text-brand">
                        Register
                    </Link>
                </div>
            </div>
        </PageTitle>
    );
}

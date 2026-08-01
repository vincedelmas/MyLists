import {toast} from "@/lib/client/components/ui/toast";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {RegisterForm} from "@/lib/client/components/auth/RegisterForm";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/register")({
    component: RegisterPage,
});


function RegisterPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) toast.add({title: message, type: "warning"});

    return (
        <PageTitle title="Register" onlyHelmet>
            <div className="mx-auto my-10 mt-20 w-full max-w-100 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                <h1 className="mb-5 text-center text-2xl font-semibold tracking-tight">
                    Register to MyLists
                </h1>

                <RegisterForm
                    redirectTo={redirect}
                />

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" search={{ redirect }} className="text-foreground underline hover:text-brand">
                        Sign-in
                    </Link>
                </div>
            </div>
        </PageTitle>
    );
}

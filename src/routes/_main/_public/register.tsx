import {ShieldCheck, UserPlus} from "lucide-react";
import {toast} from "@/lib/client/components/ui/toast";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {RegisterForm} from "@/lib/client/components/auth/RegisterForm";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/register")({
    component: RegisterPage,
});


function RegisterPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) {
        toast.add({ title: message, type: "warning" });
    }

    return (
        <PageTitle title="Register" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrow="New to MyLists?"
                    eyebrowIcon={UserPlus}
                    asideIcon={ShieldCheck}
                    asideLabel="What you need"
                    asideValue="Just a few details"
                    title="Create your account"
                    description="Create an account to keep your lists, follow your progress and make MyLists your own."
                />

                <section className="mt-10 w-full max-w-md self-center rounded-xl border p-5 shadow-xs sm:p-6">
                    <h2 className="mb-5 text-xl font-semibold tracking-tight">
                        Create your MyLists account
                    </h2>

                    <RegisterForm
                        redirectTo={redirect}
                    />

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link to="/login" search={{ redirect }} className="text-foreground underline hover:text-brand">
                            Sign-in
                        </Link>
                    </div>
                </section>
            </div>
        </PageTitle>
    );
}

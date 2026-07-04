import {toast} from "sonner";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {RegisterForm} from "@/lib/client/components/auth/RegisterForm";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/register")({
    component: RegisterPage,
});


function RegisterPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) toast.warning(message);

    return (
        <PageTitle title="Register" onlyHelmet>
            <div className="mt-20 mx-auto w-full max-w-100 border border-neutral-800 rounded-lg p-6 bg-neutral-950 my-10">
                <h1 className="text-2xl font-semibold tracking-tight text-center text-white mb-5">
                    Register to MyLists
                </h1>

                <RegisterForm
                    redirectTo={redirect}
                />

                <div className="mt-6 text-center text-sm text-neutral-400">
                    Already have an account?{" "}
                    <Link to="/login" search={{ redirect }} className="underline text-white hover:text-neutral-200">
                        Sign-in
                    </Link>
                </div>
            </div>
        </PageTitle>
    );
}

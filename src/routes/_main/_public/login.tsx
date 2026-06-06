import {toast} from "sonner";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {createFileRoute, Link, useSearch} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_public/login")({
    component: LoginPage,
});


function LoginPage() {
    const { message, redirect } = useSearch({ from: "/_main/_public" });

    if (message) toast.warning(message);

    return (
        <PageTitle title="Login" onlyHelmet>
            <div className="mt-20 mx-auto w-full max-w-100 border border-neutral-800 rounded-lg p-6 bg-neutral-950 my-10">
                <h1 className="text-2xl font-semibold tracking-tight text-center text-white mb-2">
                    Login to MyLists
                </h1>

                <LoginForm
                    redirectTo={redirect}
                />

                <div className="mt-6 text-center text-sm text-neutral-400">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" search={{ redirect }} className="underline text-white hover:text-neutral-200">
                        Register
                    </Link>
                </div>
            </div>
        </PageTitle>
    );
}

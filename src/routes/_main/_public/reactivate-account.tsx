import {tokenSchema} from "@/lib/schemas";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";
import {getReactivateInactiveAccount} from "@/lib/server/functions/account-lifecycle";


export const Route = createFileRoute("/_main/_public/reactivate-account")({
    validateSearch: tokenSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ deps: { search } }) => {
        return getReactivateInactiveAccount({ data: search });
    },
    component: ReactivateAccountPage,
    errorComponent: ({ error }) => {
        if (!(error instanceof SearchParamError)) {
            throw error;
        }
        return <ReactivateAccountResult success={false}/>;
    },
});


function ReactivateAccountPage() {
    const { success } = Route.useLoaderData();
    return <ReactivateAccountResult success={success}/>;
}


const ReactivateAccountResult = ({ success }: { success: boolean }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center text-card-foreground shadow-sm">
            <h1 className="text-2xl font-semibold">
                {success
                    ? "Account Reactivated"
                    : "Invalid or expired link"
                }
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
                {success
                    ? "Your account is active again. Happy to see you back!"
                    : "This reactivation link is invalid, expired, or was already used."
                }
            </p>
            <Link to="/login" className={buttonVariants({ className: "mt-6" })}>
                Go to Login
            </Link>
        </div>
    </div>
);

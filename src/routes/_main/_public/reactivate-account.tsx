import {tokenSchema} from "@/lib/schemas";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {createFileRoute, Link, SearchParamError} from "@tanstack/react-router";
import {getReactivateInactiveAccount} from "@/lib/server/functions/account-lifecycle";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {RefreshCcw, ShieldCheck} from "lucide-react";


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
    <PageTitle title={success ? "Account reactivated" : "Invalid reactivation link"} onlyHelmet>
        <div className="mb-8 flex flex-col pt-8">
            <PageHeader
                title={success ? "Account reactivated" : "Reactivation unavailable"}
                eyebrow={success ? "Welcome back" : "Account help"}
                eyebrowIcon={RefreshCcw}
                asideIcon={ShieldCheck}
                asideLabel="What happened"
                asideValue={success ? "Your account is active" : "This link didn’t work"}
                description={success
                    ? "Your MyLists account is active again. You can sign in whenever you’re ready."
                    : "This link is invalid or has expired. You can request a new one if needed."
                }
            />
            <section className="mt-6 w-full max-w-md self-center rounded-xl border p-6 text-center shadow-xs">
            <h2 className="text-2xl font-semibold">
                {success
                    ? "Account Reactivated"
                    : "Invalid or expired link"
                }
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
                {success
                    ? "Your account is active again. Happy to see you back!"
                    : "This reactivation link is invalid, expired, or was already used."
                }
            </p>
            <Link to="/login" className={buttonVariants({ className: "mt-6" })}>
                Go to Login
            </Link>
            </section>
        </div>
    </PageTitle>
);

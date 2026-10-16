import {FaGithub, FaGoogle} from "react-icons/fa";
import {Separator} from "@/lib/client/components/ui/separator";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {SocialProvider, useSocialSignInMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


interface SocialAuthButtonsProps {
    redirectTarget: string;
    showSeparator?: boolean;
    errorCallbackPath: "/login" | "/register";
    authMethods: {
        google: boolean;
        github: boolean;
    };
}


const providers = [
    { id: "google", label: "Continue with Google", icon: FaGoogle },
    { id: "github", label: "Continue with GitHub", icon: FaGithub },
] satisfies Array<{ id: SocialProvider; label: string; icon: typeof FaGoogle }>;


export const SocialAuthButtons = ({ authMethods, redirectTarget, errorCallbackPath, showSeparator = true }: SocialAuthButtonsProps) => {
    const mutation = useSocialSignInMutation({
        callbackURL: redirectTarget,
        newUserCallbackURL: "/?usernameNotice=check",
        errorCallbackURL: `${errorCallbackPath}?${new URLSearchParams({ redirect: redirectTarget })}`,
    });

    const availableProviders = providers.filter(({ id }) => authMethods[id]);
    if (!availableProviders.length) return null;

    return (
        <>
            {showSeparator &&
                <Separator className="mt-3"/>
            }
            <div className="mt-3 flex flex-col gap-2">
                {availableProviders.map(({ id, label, icon: ProviderIcon }) =>
                    <LoadingButton
                        key={id}
                        type="button"
                        className="w-full"
                        variant="secondary"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate(id)}
                        isLoading={mutation.isPending && mutation.variables === id}
                        icon={<ProviderIcon data-icon="inline-start" aria-hidden="true"/>}
                    >
                        {label}
                    </LoadingButton>
                )}
            </div>
        </>
    );
};

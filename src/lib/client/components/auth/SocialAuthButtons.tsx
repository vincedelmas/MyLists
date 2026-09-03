import {FaGithub, FaGoogle} from "react-icons/fa";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Separator} from "@/lib/client/components/ui/separator";
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
                    <Button
                        key={id}
                        type="button"
                        className="w-full"
                        variant="secondary"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate(id)}
                    >
                        {mutation.isPending && mutation.variables === id
                            ? <Spinner data-icon="inline-start" aria-hidden="true"/>
                            : <ProviderIcon data-icon="inline-start" aria-hidden="true"/>
                        }
                        {label}
                    </Button>
                )}
            </div>
        </>
    );
};

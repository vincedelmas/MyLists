import {useSuspenseQuery} from "@tanstack/react-query";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {createFileRoute, useRouteContext} from "@tanstack/react-router";
import {SocialAuthButtons} from "@/lib/client/components/auth/SocialAuthButtons";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_main/_universal/oauth/login")({
    component: McpLoginPage,
});


function McpLoginPage() {
    const { authMethodsQueryOptions } = useRouteContext({ from: "__root__" });
    const authMethods = useSuspenseQuery(authMethodsQueryOptions).data;

    return (
        <PageTitle title="Connect MyLists" onlyHelmet>
            <div className="mx-auto my-12 w-full max-w-sm">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Connect your MyLists account
                        </CardTitle>
                        <CardDescription>
                            Sign in to choose what your assistant can access.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoginForm
                            passwordResetEnabled={authMethods.email}
                            redirectTarget="/settings/connected-apps"
                        />
                        <SocialAuthButtons
                            authMethods={authMethods}
                            errorCallbackPath="/login"
                            redirectTarget="/settings/connected-apps"
                        />
                    </CardContent>
                </Card>
            </div>
        </PageTitle>
    );
}

import {clientEnv} from "@/env/client";
import {Copy, Plug, Unplug} from "lucide-react";
import {toast} from "@/lib/client/components/ui/toast";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {connectedAppsOptions} from "@/lib/client/react-query/query-options/auth.options";
import {useDisconnectAppMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


const endpoint = new URL("/api/mcp", clientEnv.VITE_BASE_URL).href;


export const Route = createFileRoute("/_main/_private/settings/_layout/connected-apps")({
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(connectedAppsOptions);
    },
    component: ConnectedAppsPage,
});


function ConnectedAppsPage() {
    const mutation = useDisconnectAppMutation();
    const connections = useSuspenseQuery(connectedAppsOptions).data;

    const copyEndpoint = async () => {
        try {
            await navigator.clipboard.writeText(endpoint);
            toast.add({ title: "Connection address copied.", type: "success" });
        }
        catch {
            toast.add({ title: "Select and copy the connection address below.", type: "warning" });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>
                        Your lists, through your assistant
                    </CardTitle>
                    <CardDescription>
                        Use an assistant that supports custom MCP connections to track your lists through conversation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-sm">
                        Add this connection address in your assistant, then sign in to MyLists and approve its access.
                    </p>
                    <code className="block select-all break-all rounded-md bg-muted p-3 text-sm">
                        {endpoint}
                    </code>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={copyEndpoint}><Copy data-icon="inline-start"/>
                        Copy address
                    </Button>
                </CardFooter>
            </Card>

            {connections.length === 0 ?
                <Alert>
                    <Plug aria-hidden="true"/>
                    <AlertTitle>
                        No apps connected
                    </AlertTitle>
                    <AlertDescription>
                        Apps you authorize will appear here. You can disconnect them at any time.
                    </AlertDescription>
                </Alert>
                :
                <div className="flex flex-col gap-3">
                    {connections.map(connection => <Card key={connection.clientId} size="sm">
                            <CardHeader>
                                <CardTitle>
                                    {connection.name || "Unnamed assistant"}
                                </CardTitle>
                                <CardDescription>
                                    {connection.scopes.includes("mylists:write")
                                        ? "Can read and update your lists, and save smart lists"
                                        : "Can read your lists"
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="break-all text-xs text-muted-foreground">
                                    {connection.clientId}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={mutation.isPending}
                                    onClick={() => mutation.mutate(connection.clientId)}
                                >
                                    {mutation.isPending && mutation.variables === connection.clientId
                                        ? <Spinner data-icon="inline-start"/>
                                        : <Unplug data-icon="inline-start"/>
                                    }
                                    Disconnect
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            }
        </div>
    );
}

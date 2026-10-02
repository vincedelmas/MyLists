import {useState} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Link, createFileRoute} from "@tanstack/react-router";
import {BookOpen, Pencil, Plug, ShieldCheck} from "lucide-react";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {mcpConsentRequestOptions} from "@/lib/client/react-query/query-options/auth.options";
import {useMcpConsentMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_main/_private/oauth/consent")({
    ssr: false,
    beforeLoad: () => ({
        oauthQuery: window.location.search.slice(1),
    }),
    loader: async ({ context }) => ({
        oauthQuery: context.oauthQuery,
        request: await context.queryClient.fetchQuery(mcpConsentRequestOptions(context.oauthQuery)),
    }),
    component: McpConsentPage,
});


function McpConsentPage() {
    const { oauthQuery, request } = Route.useLoaderData();
    const [readOnly, setReadOnly] = useState(false);
    const wantsRead = request.scopes.includes("mylists:read");
    const wantsWrite = request.scopes.includes("mylists:write");
    const mutation = useMcpConsentMutation({ oauthQuery, scopes: request.scopes, readOnly });

    return (
        <PageTitle title="Authorize connection" onlyHelmet>
            <div className="mx-auto my-12 w-full max-w-lg">
                <Card>
                    <CardHeader>
                        <Plug className="mb-2 size-7 text-brand" aria-hidden="true"/>
                        <CardTitle>
                            Connect {request.name} to MyLists?
                        </CardTitle>
                        <CardDescription>
                            Review the access requested for your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4">
                            {wantsRead &&
                                <div className="flex items-start gap-3">
                                    <BookOpen className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true"/>
                                    <div>
                                        <p className="font-medium">
                                            Read your media lists
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Search titles and tags, and see your ratings, progress and notes.
                                        </p>
                                    </div>
                                </div>
                            }

                            {wantsWrite && !readOnly &&
                                <div className="flex items-start gap-3">
                                    <Pencil className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true"/>
                                    <div>
                                        <p className="font-medium">
                                            Update your media
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Add titles and update your ratings, progress, notes and tags.
                                        </p>
                                    </div>
                                </div>
                            }
                        </div>

                        {wantsRead && wantsWrite &&
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="mcp-read-only"
                                    checked={readOnly}
                                    disabled={mutation.isPending}
                                    onCheckedChange={checked => setReadOnly(checked)}
                                />
                                <FieldLabel htmlFor="mcp-read-only">
                                    Allow reading only
                                </FieldLabel>
                            </Field>
                        }

                        <Alert>
                            <ShieldCheck aria-hidden="true"/>
                            <AlertDescription>
                                Access is limited to your own account. Disconnect at any time in{" "}
                                <Link to="/settings/connected-apps" className="underline">
                                    Connected apps
                                </Link>.
                                {request.scopes.includes("offline_access") &&
                                    " This connection can stay signed in between conversations."
                                }
                            </AlertDescription>
                        </Alert>
                        <p className="text-xs text-muted-foreground break-all">
                            Return address: {request.callbackOrigin}. App names are provided by the requesting app.
                        </p>
                    </CardContent>

                    <CardFooter className="justify-end gap-3">
                        <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
                            Cancel
                        </Button>
                        <Button disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
                            {mutation.isPending && <Spinner data-icon="inline-start"/>}
                            Allow connection
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </PageTitle>
    );
}

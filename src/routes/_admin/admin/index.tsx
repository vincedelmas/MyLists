import {useForm} from "react-hook-form";
import {useMutation} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {adminAuth, checkAdminAuth} from "@/lib/server/functions/admin";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_admin/admin/")({
    beforeLoad: async ({ context: { queryClient } }) => {
        if (await checkAdminAuth()) {
            throw redirect({ to: "/admin/overview" });
        }
        else {
            queryClient.removeQueries({ queryKey: ["admin"], exact: false });
        }
    },
    component: AdminStepUpPage,
})


type AdminAuthForm = {
    password: string;
}


function AdminStepUpPage() {
    const navigate = Route.useNavigate();
    const adminAuthMutation = useMutation({ mutationFn: adminAuth });
    const form = useForm<AdminAuthForm>({
        defaultValues: {
            password: "",
        },
    });

    const onSubmit = async (data: AdminAuthForm) => {
        adminAuthMutation.mutate({ data: { password: data.password } }, {
            onSuccess: async (response) => {
                if (response?.success) {
                    await navigate({ to: "/admin/overview" });
                }
                else if (response?.message) {
                    form.setError("password", { message: response.message });
                }
            },
            onError: (error) => {
                form.setError("password", {
                    message: error instanceof Error ? error.message : "Authentication failed",
                });
            }
        });
    }

    return (
        <div className="mt-16 flex items-center justify-center">
            <Card className="w-full max-w-87 mx-auto">
                <CardHeader>
                    <CardTitle>Admin Step Up</CardTitle>
                    <CardDescription>Enter your admin password to access elevated privileges.</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Enter admin password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            {adminAuthMutation.error &&
                                <p className="text-sm text-red-600">
                                    {adminAuthMutation.error.message}
                                </p>
                            }
                        </CardContent>
                        <CardFooter className="mt-4">
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || adminAuthMutation.isPending}>
                                {adminAuthMutation.isPending ? "Authenticating..." : "Step Up to Admin"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    )
}

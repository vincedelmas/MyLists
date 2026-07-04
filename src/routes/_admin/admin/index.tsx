import {useForm} from "react-hook-form";
import {useMutation} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {FormError} from "@/lib/client/components/forms/FormError";
import {adminAuth, checkAdminAuth} from "@/lib/server/functions/admin";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
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
    const adminAuthMutation = useMutation({ mutationFn: adminAuth, meta: { noErrorToast: true } });
    const form = useForm<AdminAuthForm>({
        defaultValues: {
            password: "",
        },
    });

    const onSubmit = async (data: AdminAuthForm) => {
        adminAuthMutation.mutate({ data: { password: data.password } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async (response) => {
                if (response?.success) {
                    await navigate({ to: "/admin/overview" });
                }
                else if (response?.message) {
                    form.setError("password", { message: response.message });
                }
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <fieldset disabled={adminAuthMutation.isPending} className="space-y-4">
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
                            </CardContent>
                        </fieldset>
                        <div className="px-6">
                            <FormError/>
                        </div>
                        <CardFooter className="mt-4">
                            <FormSubmitButton className="w-full" isLoading={adminAuthMutation.isPending}>
                                Step Up to Admin
                            </FormSubmitButton>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    )
}

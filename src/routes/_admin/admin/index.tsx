import {useMutation} from "@tanstack/react-query";
import {FormProvider, useForm} from "react-hook-form";
import {handleServerFormErrors} from "@/lib/client/forms";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {adminAuth, checkAdminAuth} from "@/lib/server/functions/admin";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
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
            <Card className="w-full max-w-85 mx-auto">
                <CardHeader>
                    <CardTitle>
                        Admin Step Up
                    </CardTitle>
                    <CardDescription>
                        Enter the admin password for elevated privileges.
                    </CardDescription>
                </CardHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldSet disabled={adminAuthMutation.isPending}>
                            <CardContent>
                                <FieldGroup>
                                    <FormTextField
                                        name="password"
                                        type="password"
                                        label="Password"
                                        control={form.control}
                                        placeholder="Enter admin password"
                                        disabled={adminAuthMutation.isPending}
                                    />
                                </FieldGroup>
                            </CardContent>
                        </FieldSet>
                        <div className="px-6">
                            <FormError/>
                        </div>
                        <CardFooter className="mt-4">
                            <FormSubmitButton className="w-full" isLoading={adminAuthMutation.isPending}>
                                Step Up to Admin
                            </FormSubmitButton>
                        </CardFooter>
                    </form>
                </FormProvider>
            </Card>
        </div>
    )
}

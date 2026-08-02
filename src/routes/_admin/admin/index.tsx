import {Controller, FormProvider, useForm} from "react-hook-form";
import {useId} from "react";
import {useMutation} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {FormError} from "@/lib/client/components/forms/FormError";
import {adminAuth, checkAdminAuth} from "@/lib/server/functions/admin";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


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
    const fieldId = useId();
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
                    <CardTitle>Admin Step Up</CardTitle>
                    <CardDescription>Enter the admin password for elevated privileges.</CardDescription>
                </CardHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldSet disabled={adminAuthMutation.isPending}>
                            <CardContent>
                                <FieldGroup>
                                    <Controller
                                        control={form.control}
                                        name="password"
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={adminAuthMutation.isPending}>
                                                <FieldLabel htmlFor={`${fieldId}-p`}>
                                                    Password
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    id={`${fieldId}-p`}
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="Enter admin password"
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        }
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
